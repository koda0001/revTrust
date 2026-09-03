import asyncio
import os
import functions_framework
from supabase import create_client
from dotenv import load_dotenv
from googlescrap import run_google_scraper
from analyzer import analyze_and_save_report

load_dotenv()

#TODO debug mode moze by sie komus chcialo zrobic?


supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

supabase = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

@functions_framework.http
def trigger_weekly_job(request):
    if not supabase:
        return ("Błąd: Brak kluczy Supabase w środowisku.", 500)

    try:
        response = (
            supabase.table("scraping_tasks")
            .select("id, location_id, user_id, task, week_key, locations!inner(is_active)")
            .eq("status", "pending")
            .eq("locations.is_active", True)
            .execute()
        )
        tasks = response.data or []
        print("some tasks i found",tasks)
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
            if task_tt=="scrape_google":
                # 2. Odpal scraper (z użyciem asyncio.run dla funkcji asynchronicznej)
                print(f"--> Uruchamiam scraper google dla lokalizacji: {loc_id} week_key: {week_key}")
                asyncio.run(run_google_scraper(location_id=loc_id, user_id=user_id))
            elif task_tt=="scrap_facebook":
                # 3. Odpal analyzer
                print(f"--> Uruchamiam scraper facebook dla lokalizacji: {loc_id} week_key: {week_key}")
                analyze_and_save_report(user_id=user_id, loc_id=loc_id)
            elif task_tt=="analyze":
                # 3. Odpal analyzer
                print(f"--> Uruchamiam analyzer dla lokalizacji: {loc_id} week_key: {week_key}")
                analyze_and_save_report(user_id=user_id, loc_id=loc_id, week_key=week_key)
            else: e="Invalid task task in scraping_tasks"
            # Oznacz jako zakończone sukcesem
            supabase.table("scraping_tasks").update({"status": "completed"}).eq("id", task_id).execute()

        except Exception as e:
            print(f"Błąd dla lokalizacji {loc_id}: {e}")
            supabase.table("scraping_tasks").update({"status": "failed"}).eq("id", task_id).execute()

    return (f"Przetworzono {len(tasks)} zadań.", 200)

if __name__ == "__main__":
    print("--- Uruchamiam test lokalny main.py ---")
    # to do testow lokalnych cale
    class DummyRequest:
        pass

    # Ręczne wywołanie funkcji
    status_text, status_code = trigger_weekly_job(DummyRequest())
    print(f"Wynik: {status_text} (Kod: {status_code})")