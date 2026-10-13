import asyncio
import os
import functions_framework
from supabase import create_client
from dotenv import load_dotenv
from google_scraper import run_google_scraper
from analyzer import analyze_and_save_report
from trustpilot_scraper import run_trustpilot_scraper
from datetime import datetime, timezone


load_dotenv()

#TODO debug mode moze by sie komus chcialo zrobic?

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

supabase = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

def get_current_week_key() -> str:
    now = datetime.now(timezone.utc)
    year, week, _ = now.isocalendar()
    return f"{year}-W{week:02d}"

def generate_weekly_tasks():
    """
    Przegląda aktywne lokalizacje z is_active=True i generuje brakujące zadania
    w tabeli scraping_tasks na bieżący tydzień.
    """
    if not supabase:
        return

    week_key = get_current_week_key()
    print(f"[TaskGenerator] Sprawdzanie zadań dla tygodnia: {week_key}")

    try:
        # Pobieramy aktywne lokalizacje (uwzględniając pole location_url)
        loc_response = (
            supabase.table("locations")
            .select("id, user_id, location_url, is_active")
            .eq("is_active", True)
            .execute()
        )
        locations = loc_response.data or []
        print(f"[TaskGenerator] Znaleziono {len(locations)} aktywnych lokalizacji.")

        created_count = 0

        for loc in locations:
            loc_id = loc["id"]
            user_id = loc.get("user_id")
            location_url = loc.get("location_url", "")
            
            if not location_url:
                continue

            # Domyślnie na ten moment traktujemy link jako Google Maps 
            # (możesz tu dodać warunki sprawdzające domenę URL np. 'trustpilot.com' -> 'scrape_trustpilot')
            task_name = "scrape_google"
            if "trustpilot.com" in location_url.lower():
                task_name = "scrape_trustpilot"

            # Sprawdzamy czy zadanie na ten tydzień już istnieje
            existing = (
                supabase.table("scraping_tasks")
                .select("id")
                .eq("location_id", loc_id)
                .eq("week_key", week_key)
                .eq("task", task_name)
                .execute()
            )

            if not existing.data or len(existing.data) == 0:
                supabase.table("scraping_tasks").insert({
                    "location_id": loc_id,
                    "user_id": user_id,
                    "task": task_name,
                    "week_key": week_key,
                    "status": "pending",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }).execute()
                created_count += 1

        print(f"[TaskGenerator] Utworzono {created_count} nowych zadań typu 'pending'.")

    except Exception as e:
        print(f"[TaskGenerator] Błąd podczas generowania zadań: {e}")


@functions_framework.http
def trigger_weekly_job(request):
    if not supabase:
        return ("Błąd: Brak kluczy Supabase w środowisku.", 500)

    # 1. Najpierw wygeneruj zadania dla aktywnych firm na ten tydzień
    generate_weekly_tasks()

    # 2. Pobierz zadania oczekujące na przetworzenie
    try:
        response = (
            supabase.table("scraping_tasks")
            .select("id, location_id, user_id, task, week_key, locations!inner(is_active)")
            .eq("status", "pending")
            .eq("locations.is_active", True)
            .execute()
        )
        tasks = response.data or []
        print("some tasks i found", tasks)
    except Exception as e:
        print(f"Błąd pobierania zadań: {e}")
        return (f"Błąd pobierania zadań z bazy: {e}", 500)

    print(f"Znaleziono zadań do wykonania: {len(tasks)}")

    for task in tasks:
        task_id = task["id"]
        loc_id = task["location_id"]
        user_id = task.get("user_id")
        task_tt = task.get("task")
        week_key = task.get("week_key")

        try:
            # Oznacz zadanie jako 'w trakcie'
            supabase.table("scraping_tasks").update({"status": "in_progress"}).eq("id", task_id).execute()
            
            if task_tt == "scrape_google":
                print(f"--> Uruchamiam scraper Google dla lokalizacji: {loc_id} week_key: {week_key}")
                asyncio.run(run_google_scraper(location_id=loc_id, user_id=user_id))
                
            elif task_tt == "scrape_trustpilot":
                print(f"--> Uruchamiam scraper Trustpilot dla lokalizacji: {loc_id} week_key: {week_key}")
                asyncio.run(run_trustpilot_scraper(location_id=loc_id, user_id=user_id))
                
            elif task_tt == "scrap_facebook":
                print(f"--> Uruchamiam analizę dla Facebooka / raportu: {loc_id} week_key: {week_key}")
                analyze_and_save_report(user_id=user_id, loc_id=loc_id)
                
            elif task_tt == "analyze":
                print(f"--> Uruchamiam analyzer dla lokalizacji: {loc_id} week_key: {week_key}")
                analyze_and_save_report(user_id=user_id, loc_id=loc_id, week_key=week_key)
                
            else:
                raise ValueError(f"Nieznany typ zadania: {task_tt}")

            # Oznacz jako zakończone sukcesem
            supabase.table("scraping_tasks").update({"status": "completed"}).eq("id", task_id).execute()

        except Exception as e:
            print(f"Błąd dla lokalizacji {loc_id}: {e}")
            supabase.table("scraping_tasks").update({"status": "failed"}).eq("id", task_id).execute()

    return (f"Przetworzono {len(tasks)} zadań.", 200)

if __name__ == "__main__":
    print("--- Uruchamiam test lokalny main.py ---")
    class DummyRequest:
        pass

    status_text, status_code = trigger_weekly_job(DummyRequest())
    print(f"Wynik: {status_text} (Kod: {status_code})")