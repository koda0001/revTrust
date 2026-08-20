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
DEBUG_MODE = True
SAVE_TO_JSON = True  # Przełącznik pełnego pliku JSON (domyślnie wyłączony)
SAVE_TO_SUPABASE = True  # Przełącznik wysyłki do bazy
SAVE_FOR_AI = True  # Przełącznik tworzenia lekkiego pliku dla AI

load_dotenv()

# Uzupełnij swoimi danymi z panelu Supabase (Settings -> API)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
TEST_USER_ID = os.getenv("TEST_USER_ID")

SEARCH_QUERY = "Zamek Królewski w Warszawie"
MAPS_URL = (
    f"https://www.google.com/maps/search/{SEARCH_QUERY.replace(' ', '+')}"
)

# Inicjalizacja klienta Supabase
supabase: Client = (
    create_client(SUPABASE_URL, SUPABASE_KEY) if SAVE_TO_SUPABASE else None
)


def save_to_json(data, filename="reviews.json"):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    print(
        f"\n[JSON] Pomyślnie zapisano {len(data)} opinii do pliku '{filename}'."
    )


def save_for_ai(results: list, filename="reviews_for_ai.txt"):
    """Zapisuje opinie w skompresowanym formacie tekstowym dla optymalizacji tokenów w AI."""
    lines = []
    for r in results:
        clean_content = " ".join(r.get("content", "").split())
        rating_percent = parse_rating_to_percent(r.get("rating", ""))
        author = r.get("author", "Anonim")

        # Format minimalizujący tokeny: [OCENA%|AUTOR]: TREŚĆ
        lines.append(f"[{rating_percent}%|{author}]: {clean_content}")

    with open(filename, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(
        f"\n[AI EXTRACT] Pomyślnie zapisano {len(lines)} opinii do zoptymalizowanego pliku '{filename}'."
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
    raw_review: dict, user_id: str, source: str = "Google"
) -> dict:
    """Formatuje wyciągniętą opinię do struktury kolumn tabeli w Supabase (Snake Case)."""
    rating_percent = parse_rating_to_percent(raw_review.get("rating", ""))
    now_iso = datetime.now(timezone.utc).isoformat()

    return {
        "id": str(uuid.uuid4()),
        "external_id": raw_review["review_id"],
        "user_id": user_id,
        "author": raw_review["author"],
        "source": source,
        "content": raw_review["content"],
        "rating": rating_percent,
        "updated_at": now_iso,
    }


def upload_to_supabase(raw_results: list, user_id: str):
    """Konwertuje i wysyła dane do tabeli 'reviews' w Supabase."""
    if not raw_results:
        print("[SUPABASE] Brak danych do wysłania.")
        return

    print(
        f"\n[SUPABASE] Przygotowywanie {len(raw_results)} opinii do wysyłki..."
    )

    formatted_data = [
        prepare_review_for_db(review, user_id) for review in raw_results
    ]

    try:
        response = (
            supabase.table("reviews")
            .upsert(formatted_data, on_conflict="external_id")
            .execute()
        )
        print(
            f"[SUPABASE] Sukces! Zapisano/Zaktualizowano {len(response.data)} rekordów w bazie."
        )
    except Exception as e:
        print(f"[SUPABASE] Błąd podczas zapisu do bazy: {e}")


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False, slow_mo=500 if DEBUG_MODE else 0
        )
        context = await browser.new_context(locale="pl-PL")
        page = await context.new_page()

        print("1. Otwieram wyszukiwarkę Google Maps...")
        await page.goto(MAPS_URL)
        await page.wait_for_timeout(3000)

        # 2. Obsługa ciasteczek
        try:
            print("2. Obsługa ciasteczek...")
            await page.click('button[aria-label*="Zaakceptuj"]', timeout=4000)
            await page.wait_for_timeout(2000)
        except Exception:
            pass

        # 3. Wybór pierwszego wyniku z listy
        try:
            first_result = await page.query_selector('a[href*="/maps/place/"]')
            if first_result:
                print("3. Wybieram obiekt z wyników...")
                await first_result.click()
                await page.wait_for_timeout(3000)
        except Exception:
            pass

        # 4. Otwarcie zakładki "Opinie"
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
                        "search_query": SEARCH_QUERY,
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

        # ZAPIS DO LEKKIEGO PLIKU DLA AI
        if SAVE_FOR_AI:
            save_for_ai(results)

        # ZAPIS DO PEŁNEGO JSON (opcjonalny)
        if SAVE_TO_JSON:
            save_to_json(results)

        # ZAPIS DO SUPABASE
        if SAVE_TO_SUPABASE:
            upload_to_supabase(results, TEST_USER_ID)

        # TRYB DEBUG
        if DEBUG_MODE:
            print(
                "\n[DEBUG] Przeglądarka pozostaje otwarta. Użyj Playwright Inspectora."
            )
            await page.pause()
        else:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(main())