from datetime import datetime, timezone
import json
import os
from dotenv import load_dotenv
from google import genai
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
TEST_USER_ID = os.getenv("TEST_USER_ID")

if not all([SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY]):
    raise ValueError("Brak wymaganych kluczy w pliku .env!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_reviews_from_db(user_id: str) -> list:
    """Pobiera opinie użytkownika z Supabase."""
    print("[SUPABASE] Pobieranie opinii z bazy...")
    try:
        response = (
            supabase.table("reviews")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        return response.data
    except Exception as e:
        print(f"[SUPABASE] Błąd pobierania danych: {e}")
        return []


def analyze_and_save_report(user_id: str):
    reviews = fetch_reviews_from_db(user_id)

    if not reviews:
        print("Brak opinii do przeanalizowania.")
        return

    print(f"Znaleziono {len(reviews)} opinii. Formatowanie tekstu dla AI...")

    # Skompresowany format dla oszczędności tokenów
    formatted_reviews = "\n".join(
        [
            f"[{r.get('rating', 100)}%|{r.get('author', 'Anonim')}]: {r.get('content', '')}"
            for r in reviews
        ]
    )

    prompt = f"""
    Jesteś zaawansowanym systemem analitycznym CX (Customer Experience). 
    Przeanalizuj poniższe opinie z tego tygodnia i wygeneruj pełny raport w WYŁĄCZNIE czystym formacie JSON (bez bloków markdown, bez ```json).

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

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        raw_text = response.text.strip()
        # Czyszczenie z ewentualnych znaczników markdown
        if raw_text.startswith("```json"):
            raw_text = raw_text.replace("```json", "").replace("```", "").strip()

        report_data = json.loads(raw_text)

        now = datetime.now(timezone.utc)
        year, week_num, _ = now.isocalendar()

        # Przygotowanie rekordu do nowej tabeli weekly_reports
        db_payload = {
            "user_id": user_id,
            "year": year,
            "week_number": week_num,
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

        print("[SUPABASE] Zapisywanie tygodniowego raportu do bazy...")
        save_res = supabase.table("weekly_reports").insert(db_payload).execute()
        print(
            f"\n[SUKCES] Zapisano raport za Tydzień {week_num} ({year} r.)!"
        )
        print("Treść raportu:", json.dumps(report_data, ensure_ascii=False, indent=2))

    except Exception as e:
        print(f"Błąd podczas analizy lub zapisu: {e}")


if __name__ == "__main__":
    analyze_and_save_report(TEST_USER_ID)