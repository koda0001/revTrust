import asyncio
from datetime import datetime, timezone
import json
import os
import re
import subprocess
import sys
import uuid
from dotenv import load_dotenv
from playwright.async_api import async_playwright
from supabase import Client, create_client

# --- CONFIGURATION ---
DEBUG_MODE = False
SAVE_TO_JSON = True
SAVE_TO_SUPABASE = True

# Explicitly set Playwright browser directory to /tmp (writable in GCP Functions/Docker)
CUSTOM_BROWSER_PATH = "/tmp/pw-browsers"
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = CUSTOM_BROWSER_PATH

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

supabase: Client = (
    create_client(SUPABASE_URL, SUPABASE_KEY)
    if SAVE_TO_SUPABASE and SUPABASE_URL and SUPABASE_KEY
    else None
)


def ensure_chromium_installed():
    """Downloads Chromium binary to /tmp without calling system-level deps (avoids su/root errors)."""
    if not os.path.exists(CUSTOM_BROWSER_PATH) or not os.listdir(CUSTOM_BROWSER_PATH):
        print(f"[PLAYWRIGHT] Downloading Chromium executable to {CUSTOM_BROWSER_PATH}...")
        try:
            subprocess.run(
                [sys.executable, "-m", "playwright", "install", "chromium"],
                env={**os.environ, "PLAYWRIGHT_BROWSERS_PATH": CUSTOM_BROWSER_PATH},
                check=True,
            )
            print("[PLAYWRIGHT] Chromium successfully installed.")
        except Exception as e:
            print(f"[PLAYWRIGHT] Failed to install Chromium: {e}")
            raise e


def get_requested_loc_url(user_id: str, loc_id: str) -> str:
    """Fetches Trustpilot URL from Supabase locations table."""
    if not supabase:
        print("[SUPABASE] Supabase client unavailable.")
        return ""
    try:
        # Pobieramy kolumnę z linkiem do Trustpilota (dostosuj nazwę kolumny w bazie jeśli masz inną, np. trustpilot_url)
        query = supabase.table("locations").select("location_url").eq("id", loc_id)
        if user_id:
            query = query.eq("user_id", user_id)

        response = query.execute()

        if response.data and len(response.data) > 0:
            return response.data[0].get("location_url", "")
        else:
            print(f"[SUPABASE] No Trustpilot URL found for location_id: {loc_id}")
            return ""
    except Exception as e:
        print(f"[SUPABASE] Error fetching URL: {e}")
        return ""


def get_current_week_key() -> str:
    now = datetime.now(timezone.utc)
    year, week, _ = now.isocalendar()
    return f"{year}-W{week:02d}"


def save_to_json(data, filename="trustpilot_reviews.json"):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    print(f"\n[JSON] Successfully saved {len(data)} reviews to '{filename}'.")


def parse_rating_to_percent(rating_val: Any) -> int:
    """Konwertuje ocenę z Trustpilota (1-5) na procenty (0-100) pasujące do bazy."""
    try:
        stars = float(rating_val)
        percent = int((stars / 5.0) * 100)
        return min(max(percent, 0), 100)
    except Exception:
        return 100


def prepare_review_for_db(
        raw_review: dict, user_id: str, loc_id: str, source: str = "Trustpilot"
) -> dict:
    rating_percent = parse_rating_to_percent(raw_review.get("rating", 5))
    now_iso = datetime.now(timezone.utc).isoformat()

    return {
        "id": str(uuid.uuid4()),
        "external_id": raw_review["review_id"],
        "user_id": user_id,
        "location_id": loc_id,
        "author": raw_review["author"],
        "source": source,
        "content": raw_review["content"],
        "rating": rating_percent,
        "week_key": get_current_week_key(),
        "updated_at": now_iso,
    }


def upload_to_supabase(raw_results: list, user_id: str, loc_id: str):
    if not supabase:
        print("[SUPABASE] Client unavailable. Skipping payload upload.")
        return
    if not raw_results:
        print("[SUPABASE] No results to upload.")
        return

    print(f"\n[SUPABASE] Formatting {len(raw_results)} Trustpilot reviews for DB upload...")

    formatted_data = [
        prepare_review_for_db(review, user_id, loc_id) for review in raw_results
    ]

    try:
        response = (
            supabase.table("reviews")
            .upsert(
                formatted_data,
                on_conflict="external_id",
                ignore_duplicates=True,
            )
            .execute()
        )
        inserted_count = len(response.data) if response.data else 0
        print(
            f"[SUPABASE] Success! Upserted {inserted_count} Trustpilot reviews for location {loc_id}."
        )
    except Exception as e:
        print(f"[SUPABASE] Database upload error: {e}")


async def run_trustpilot_scraper(location_id: str, user_id: str = None, max_pages: int = 2):
    """Main execution point for scraping Trustpilot reviews."""
    print(f"[SCRAPER] Starting Trustpilot execution for location_id: {location_id}")
    ensure_chromium_installed()

    trustpilot_url = get_requested_loc_url(user_id, location_id)

    if not trustpilot_url:
        print(f"[ERROR] Invalid or missing Trustpilot URL for location_id: {location_id}. Aborting.")
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            slow_mo=0,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--single-process",
            ],
        )
        context = await browser.new_context(
            locale="pl-PL",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        print(f"1. Navigating to Trustpilot URL: {trustpilot_url}...")
        try:
            await page.goto(trustpilot_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2000)
        except Exception as e:
            print(f"[ERROR] Failed to load URL: {e}")
            await browser.close()
            return

        # 2. Obsługa ciasteczek Trustpilot
        try:
            print("2. Handling consent modal...")
            cookie_btn = page.locator("#onetrust-accept-btn-handler")
            if await cookie_btn.is_visible(timeout=4000):
                await cookie_btn.click()
                await page.wait_for_timeout(1500)
        except Exception:
            pass

        results = []
        seen_ids = set()
        current_page = 1

        while current_page <= max_pages:
            print(f"3. Scraping Trustpilot page {current_page}...")

            try:
                await page.wait_for_selector('article[data-service-review-card-paper="true"]', timeout=10000)
            except Exception:
                print("[SCRAPER] No review cards found or timeout reached.")
                break

            review_cards = await page.locator('article[data-service-review-card-paper="true"]').all()

            for card in review_cards:
                try:
                    # Generowanie unikalnego external_id (Trustpilot często bazuje na strukturze lub dacie/autorze)
                    author_elem = card.locator('[data-consumer-name-typography="true"]')
                    author = await author_elem.inner_text() if await author_elem.count() > 0 else "Anonim"

                    date_elem = card.locator('time')
                    review_date = await date_elem.get_attribute(
                        "datetime") if await date_elem.count() > 0 else "unknown-date"

                    # Unikalny hash/ID jako external_id
                    review_id = f"tp-{abs(hash(author + review_date))}"
                    if review_id in seen_ids:
                        continue

                    # Ocena (1-5)
                    rating_elem = card.locator('div[data-service-review-rating]')
                    rating = 5
                    if await rating_elem.count() > 0:
                        rating_attr = await rating_elem.get_attribute("data-service-review-rating")
                        if rating_attr:
                            rating = int(rating_attr)

                    # Treść
                    title_elem = card.locator('[data-review-title-typography="true"]')
                    content_elem = card.locator('[data-service-review-text-typography="true"]')

                    title_text = await title_elem.inner_text() if await title_elem.count() > 0 else ""
                    body_text = await content_elem.inner_text() if await content_elem.count() > 0 else ""
                    full_content = f"{title_text}\n{body_text}".strip() or "Brak tekstu"

                    seen_ids.add(review_id)
                    results.append(
                        {
                            "review_id": review_id,
                            "author": author.strip(),
                            "rating": rating,
                            "content": full_content.replace("\n", " ").strip(),
                        }
                    )
                except Exception as e:
                    print(f"Error parsing Trustpilot card: {e}")
                    continue

            # 4. Paginacja Trustpilota
            next_button = page.locator('a[name="pagination-button-next"]')
            if await next_button.count() > 0 and await next_button.is_visible():
                is_disabled = await next_button.get_attribute("aria-disabled")
                if is_disabled == "true":
                    print("[SCRAPER] Reached last Trustpilot page.")
                    break
                current_page += 1
                await next_button.click()
                await page.wait_for_timeout(2000)
            else:
                break

        print(f"\n[SCRAPER] Extracted {len(results)} total Trustpilot reviews.")

        if SAVE_TO_JSON:
            save_to_json(results, "trustpilot_reviews.json")

        if SAVE_TO_SUPABASE:
            upload_to_supabase(results, user_id, location_id)

        await browser.close()


if __name__ == "__main__":
    test_loc_id = os.getenv("TEST_LOCATION_ID", "20fd00a0-ff42-477e-97f7-8c9141de6449")
    test_user_id = os.getenv("TEST_USER_ID")
    asyncio.run(run_trustpilot_scraper(test_loc_id, test_user_id, max_pages=1))