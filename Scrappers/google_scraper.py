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
SAVE_TO_JSON = False
SAVE_TO_SUPABASE = True

# Explicitly set Playwright browser directory to /tmp (writable in GCP Functions)
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
    chromium_executable_dir = os.path.join(CUSTOM_BROWSER_PATH, "chromium")
    
    # Simple check if chromium already exists in /tmp from a warm execution
    if not os.path.exists(CUSTOM_BROWSER_PATH) or not os.listdir(CUSTOM_BROWSER_PATH):
        print(f"[PLAYWRIGHT] Downloading Chromium executable to {CUSTOM_BROWSER_PATH}...")
        try:
            # Exclude '--with-deps' to avoid root/sudo permission failure in GCP
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
    """Fetches Google Maps URL from Supabase locations table."""
    if not supabase:
        print("[SUPABASE] Supabase client unavailable.")
        return ""
    try:
        query = supabase.table("locations").select("google_maps_url").eq("id", loc_id)
        if user_id:
            query = query.eq("user_id", user_id)

        response = query.execute()

        if response.data and len(response.data) > 0:
            return response.data[0].get("google_maps_url", "")
        else:
            print(f"[SUPABASE] No URL found for location_id: {loc_id}")
            return ""
    except Exception as e:
        print(f"[SUPABASE] Error fetching URL: {e}")
        return ""


def get_current_week_key() -> str:
    now = datetime.now(timezone.utc)
    year, week, _ = now.isocalendar()
    return f"{year}-W{week:02d}"


def save_to_json(data, filename="reviews.json"):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    print(f"\n[JSON] Successfully saved {len(data)} reviews to '{filename}'.")


def parse_rating_to_percent(rating_str: str) -> int:
    if not rating_str or rating_str == "Brak oceny":
        return 100

    clean_str = rating_str.replace(",", ".")
    match = re.search(r"(\d+(?:\.\d+)?)", clean_str)

    if match:
        stars = float(match.group(1))
        percent = int((stars / 5.0) * 100)
        return min(max(percent, 0), 100)

    return 100


def prepare_review_for_db(
    raw_review: dict, user_id: str, loc_id: str, source: str = "Google"
) -> dict:
    rating_percent = parse_rating_to_percent(raw_review.get("rating", ""))
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

    print(f"\n[SUPABASE] Formatting {len(raw_results)} reviews for DB upload...")

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
            f"[SUPABASE] Success! Upserted {inserted_count} reviews for location {loc_id}."
        )
    except Exception as e:
        print(f"[SUPABASE] Database upload error: {e}")


async def run_google_scraper(location_id: str, user_id: str = None):
    """Main execution point for scraping Google reviews."""
    print(f"[SCRAPER] Starting execution for location_id: {location_id}")
    ensure_chromium_installed()

    maps_url = get_requested_loc_url(user_id, location_id)

    if not maps_url:
        print(f"[ERROR] Invalid URL for location_id: {location_id}. Aborting.")
        return

    async with async_playwright() as p:
        # Critical chromium flags for containerized environments without root permissions
        browser = await p.chromium.launch(
            headless=True,
            slow_mo=500 if DEBUG_MODE else 0,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--single-process",
            ],
        )
        context = await browser.new_context(locale="pl-PL")
        page = await context.new_page()

        print(f"1. Navigating to URL: {maps_url}...")
        await page.goto(maps_url, wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)

        try:
            print("2. Handling consent modal...")
            await page.click('button[aria-label*="Zaakceptuj"]', timeout=4000)
            await page.wait_for_timeout(2000)
        except Exception:
            pass

        try:
            first_result = await page.query_selector('a[href*="/maps/place/"]')
            if first_result:
                print("3. Selecting first listing...")
                await first_result.click()
                await page.wait_for_timeout(3000)
        except Exception:
            pass

        try:
            print("4. Opening 'Reviews' tab...")
            reviews_tab = await page.query_selector(
                'button[aria-label*="Opinie"], button[aria-label*="opinie"]'
            )
            if reviews_tab:
                await reviews_tab.click()
                await page.wait_for_timeout(2000)
        except Exception:
            pass

        print("5. Scrolling review panel...")
        await page.mouse.click(250, 400)
        await page.wait_for_timeout(1000)

        for i in range(5):
            print(f"   Scroll iteration {i + 1}...")
            await page.mouse.wheel(0, 3000)
            await page.keyboard.press("PageDown")
            await page.wait_for_timeout(2000)

        print("6. Extracting review contents...")
        cards = await page.locator("div[data-review-id]").all()

        results = []
        seen_ids = set()

        for index, card in enumerate(cards, start=1):
            try:
                review_id = await card.get_attribute("data-review-id")
                if not review_id or review_id in seen_ids:
                    continue

                author_loc = card.locator(".fontTitleMedium").first
                author = (
                    await author_loc.inner_text()
                    if await author_loc.count() > 0
                    else "Anonim"
                )

                author_btn = card.locator('button[data-href*="/contrib/"]').last
                full_btn_text = (
                    await author_btn.inner_text()
                    if await author_btn.count() > 0
                    else ""
                )
                author_info = (
                    full_btn_text.replace(author, "").strip().replace("\n", " ")
                )

                rating_loc = card.locator('span[aria-label*="gwiazd"]').first
                rating = (
                    await rating_loc.get_attribute("aria-label")
                    if await rating_loc.count() > 0
                    else "Brak oceny"
                )

                time_loc = card.locator("span.rsqaWe").first
                time_published = (
                    await time_loc.inner_text()
                    if await time_loc.count() > 0
                    else ""
                )

                more_btn = card.locator(
                    'button[aria-label*="Więcej"], button[aria-label*="więcej"]'
                )
                if await more_btn.count() > 0:
                    try:
                        await more_btn.first.click()
                        await page.wait_for_timeout(300)
                    except Exception:
                        pass

                text_loc = card.locator("div.MyEned, div[lang]").first
                content = (
                    await text_loc.inner_text()
                    if await text_loc.count() > 0
                    else "Brak tekstu"
                )

                seen_ids.add(review_id)

                if review_id:
                    results.append(
                        {
                            "review_id": review_id,
                            "author": author,
                            "author_info": author_info,
                            "rating": rating,
                            "time_published": time_published,
                            "content": content.replace("\n", " ").strip(),
                        }
                    )
            except Exception as e:
                print(f"Error parsing card {index}: {e}")
                continue

        print(f"\n[SCRAPER] Extracted {len(results)} total reviews.")

        if SAVE_TO_JSON:
            save_to_json(results)

        if SAVE_TO_SUPABASE:
            upload_to_supabase(results, user_id, location_id)

        await browser.close()


if __name__ == "__main__":
    test_loc_id = os.getenv("TEST_LOCATION_ID", "af20ddad-8a2f-49c3-a76f-35920836ec5c")
    test_user_id = os.getenv("TEST_USER_ID")
    asyncio.run(run_google_scraper(test_loc_id, test_user_id))