from datetime import datetime, timezone
import json
import os
import time
from dotenv import load_dotenv
from google import genai
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
TEST_USER_ID = os.getenv("TEST_USER_ID")
LOCATION_ID = os.getenv("LOCATION_ID", "af20ddad-8a2f-49c3-a76f-35920836ec5c")

if not all([SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY]):
    raise ValueError("Brak wymaganych kluczy w pliku .env!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_current_week_key() -> str:
    now = datetime.now(timezone.utc)
    year, week, _ = now.isocalendar()
    return f"{year}-W{week:02d}"


def fetch_reviews_for_week(user_id: str, loc_id: str, week_key: str) -> list:
    """Pobiera z Supabase opinie dla wybranego użytkownika, lokalizacji i tygodnia."""
    print(
        f"[SUPABASE] Pobieranie opinii dla location_id: {loc_id} i week_key: {week_key}..."
    )
    try:
        response = (
            supabase.table("reviews")
            .select("*")
            .eq("user_id", user_id)
            .eq("location_id", loc_id)
            .eq("week_key", week_key)
            .execute()
        )
        return response.data
    except Exception as e:
        print(f"[SUPABASE] Błąd pobierania danych: {e}")
        return []


def format_reviews_for_ai(reviews: list) -> str:
    """Zwięzłe ściskanie surowych opinii z bazy na tekst dla Gemini."""
    lines = []
    for r in reviews:
        clean_content = " ".join(r.get("content", "").split())
        rating = r.get("rating", 100)
        author = r.get("author", "Anonim")

        lines.append(f"[{rating}%|{author}]: {clean_content}")

    return "\n".join(lines)


def analyze_and_save_report(
        user_id: str, loc_id: str, week_key: str = None
):
    if not week_key:
        week_key = get_current_week_key()

    reviews = fetch_reviews_for_week(user_id, loc_id, week_key)

    if not reviews:
        print(
            f"Brak opinii do przeanalizowania dla lokalizacji {loc_id} i tygodnia {week_key}."
        )
        return

    print(
        f"Znaleziono {len(reviews)} opinii dla {week_key}. Ściskanie danych dla AI..."
    )
    formatted_reviews = format_reviews_for_ai(reviews)

    prompt = f"""
    Jesteś zaawansowanym systemem analitycznym CX (Customer Experience). 
    Przeanalizuj poniższe opinie z tego tygodnia dla wybranej lokalizacji i wygeneruj pełny raport w WYŁĄCZNIE czystym formacie JSON (bez bloków markdown, bez ```json).

    Struktura JSON:
    {{
      "sentiment_score": <int 0-100, ogólny wskaźnik zadowolenia>,
      "avg_rating_calculated": <float, szacowana średnia ocen w skali 1.0 - 5.0>,
      "sentiment_breakdown": {{
        "positive_percent": <int>,
        "neutral_percent": <int>,
        "negative_percent": <int>
      }},
      "summary_text": "<krótkie 2-3 zdaniowe podsumowanie biznesowe>",
      "top_pros": ["<zaleta_1>", "<zaleta_2>", "<zaleta_3>"],
      "top_cons": ["<wada_1>", "<wada_2>", "<wada_3>"],
      "category_analysis": [
        {{"category": "Obsługa", "sentiment": "pozytywny|neutralny|negatywny", "mention_count": <int>}},
        {{"category": "Jakość/Cena", "sentiment": "pozytywny|neutralny|negatywny", "mention_count": <int>}},
        {{"category": "Czas realizacji", "sentiment": "pozytywny|neutralny|negatywny", "mention_count": <int>}}
      ],
      "critical_alerts": ["<opcjonalne ostrzeżenie o nowym problemie lub pusta tablica []>"]
    }}

    Opinie do analizy:
    {formatted_reviews}
    """

    print("Wysyłanie danych do Gemini API...")
    client = genai.Client(api_key=GEMINI_API_KEY)

    max_retries = 3
    raw_text = ""
    for attempt in range(1, max_retries + 1):
        try:
            response = client.models.generate_content(
                model="gemini-3.6-flash",
                contents=prompt,
            )
            raw_text = response.text.strip()
            break
        except Exception as e:
            if "503" in str(e) and attempt < max_retries:
                print(
                    f"[GEMINI] Przeciążenie (503). Próba {attempt}/{max_retries}. Czekam 5 sek..."
                )
                time.sleep(5)
            else:
                print(f"Błąd komunikacji z Gemini: {e}")
                return

    if raw_text.startswith("```json"):
        raw_text = raw_text.replace("```json", "").replace("```", "").strip()

    try:
        report_data = json.loads(raw_text)

        year_str, week_str = week_key.split("-W")
        year = int(year_str)
        week_num = int(week_str)

        db_payload = {
            "user_id": user_id,
            "location_id": loc_id,
            "year": year,
            "week_number": week_num,
            "week_key": week_key,
            "sentiment_score": report_data.get("sentiment_score", 50),
            "summary_text": report_data.get("summary_text", ""),
            "top_pros": report_data.get("top_pros", []),
            "top_cons": report_data.get("top_cons", []),
            "review_count": len(reviews),
            "avg_rating": report_data.get("avg_rating_calculated", 0.0),
            "sentiment_breakdown": report_data.get("sentiment_breakdown", {}),
            "category_scores": report_data.get("category_analysis", []),
            "critical_alerts": report_data.get("critical_alerts", []),
        }

        print(
            f"[SUPABASE] Zapisywanie raportu pod location_id={loc_id} i week_key={week_key}..."
        )

        save_res = (
            supabase.table("weekly_reports")
            .upsert(db_payload, on_conflict="location_id,week_key")
            .execute()
        )
        print(f"\n[SUKCES] Zapisano raport dla {loc_id} za {week_key}!")
        print(
            "Treść raportu:",
            json.dumps(report_data, ensure_ascii=False, indent=2),
        )

    except Exception as e:
        print(f"Błąd podczas parsowania JSON lub zapisu do Supabase: {e}")


if __name__ == "__main__":
    analyze_and_save_report(TEST_USER_ID, LOCATION_ID)