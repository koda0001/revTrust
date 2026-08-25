import asyncio
from datetime import datetime, timezone
import json
import os
import re
import uuid
from dotenv import load_dotenv
from playwright.async_api import async_playwright
from supabase import Client, create_client

# --- KONFIGURACJA ---
DEBUG_MODE = False
SAVE_TO_JSON = False  # Przełącznik pełnego pliku JSON
SAVE_TO_SUPABASE = True  # Przełącznik wysyłki do bazy

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
TEST_USER_ID = os.getenv("TEST_USER_ID")
LOCATION_ID = "b643ee7a-2de6-4758-b574-589620c22fab"

supabase: Client = (
    create_client(SUPABASE_URL, SUPABASE_KEY) if SAVE_TO_SUPABASE else None
)


def get_requested_loc_url(user_id: str, loc_id: str) -> str:
    """Pobiera dokładny URL do Google Maps z tabeli locations."""
    try:
        response = (
            supabase.table("locations")
            .select("google_maps_url")
            .eq("user_id", user_id)
            .eq("id", loc_id)
            .execute()
        )
        if response.data and len(response.data) > 0:
            return response.data[0]["google_maps_url"]
        else:
            print(f"[SUPABASE] Nie znaleziono URL dla location_id: {loc_id}")
            return ""
    except Exception as e:
        print(f"[SUPABASE] Błąd pobierania URL: {e}")
        return ""


def get_current_week_key() -> str:
    now = datetime.now(timezone.utc)
    year, week, _ = now.isocalendar()
    return f"{year}-W{week:02d}"


def save_to_json(data, filename="reviews.json"):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    print(
        f"\n[JSON] Pomyślnie zapisano {len(data)} opinii do pliku '{filename}'."
    )


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
        "location_id": loc_id,  # <-- TUTAJ DODAJEMY POWIĄZANIE Z LOKALIZACJĄ!
        "author": raw_review["author"],
        "source": source,
        "content": raw_review["content"],
        "rating": rating_percent,
        "week_key": get_current_week_key(),
        "updated_at": now_iso,
    }


def upload_to_supabase(raw_results: list, user_id: str, loc_id: str):
    if not raw_results:
        print("[SUPABASE] Brak danych do wysłania.")
        return

    print(
        f"\n[SUPABASE] Przygotowywanie {len(raw_results)} opinii do wysyłki..."
    )

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
            f"[SUPABASE] Sukces! Dodano {inserted_count} nowych opinii do lokalizacji {loc_id}."
        )
    except Exception as e:
        print(f"[SUPABASE] Błąd podczas zapisu do bazy: {e}")


async def main():
    # Pobieramy URL dynamicznie przed uruchomieniem przeglądarki
    maps_url = get_requested_loc_url(TEST_USER_ID, LOCATION_ID)

    if not maps_url:
        print("[ERROR] Brak prawidłowego URL do skrobania. Przerywam.")
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False, slow_mo=500 if DEBUG_MODE else 0
        )
        context = await browser.new_context(locale="pl-PL")
        page = await context.new_page()

        print(f"1. Otwieram wyszukiwarkę Google Maps: {maps_url}...")
        await page.goto(maps_url)
        await page.wait_for_timeout(3000)

        try:
            print("2. Obsługa ciasteczek...")
            await page.click('button[aria-label*="Zaakceptuj"]', timeout=4000)
            await page.wait_for_timeout(2000)
        except Exception:
            pass

        try:
            first_result = await page.query_selector('a[href*="/maps/place/"]')
            if first_result:
                print("3. Wybieram obiekt z wyników...")
                await first_result.click()
                await page.wait_for_timeout(3000)
        except Exception:
            pass

        try:
            print("4. Otwieram zakładkę 'Opinie'...")
            reviews_tab = await page.query_selector(
                'button[aria-label*="Opinie"], button[aria-label*="opinie"]'
            )
            if reviews_tab:
                await reviews_tab.click()
                await page.wait_for_timeout(2000)
        except Exception:
            pass

        print("5. Najedź na listę opinii i zacznij skrolować...")
        await page.mouse.click(250, 400)
        await page.wait_for_timeout(1000)

        for i in range(5):
            print(f"   Scroll {i + 1}...")
            await page.mouse.wheel(0, 3000)
            await page.keyboard.press("PageDown")
            await page.wait_for_timeout(2000)

        print("6. Wyciągam dane...")
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
                    results.append({
                        "review_id": review_id,
                        "author": author,
                        "author_info": author_info,
                        "rating": rating,
                        "time_published": time_published,
                        "content": content.replace("\n", " ").strip(),
                    })
            except Exception as e:
                print(f"Błąd przy karcie {index}: {e}")
                continue

        print(f"\nUdało się wyciągnąć łącznie: {len(results)} opinii.")

        if SAVE_TO_JSON:
            save_to_json(results)

        if SAVE_TO_SUPABASE:
            upload_to_supabase(results, TEST_USER_ID, LOCATION_ID)

        if DEBUG_MODE:
            print("\n[DEBUG] Przeglądarka pozostaje otwarta.")
            await page.pause()
        else:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(main())