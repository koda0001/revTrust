import asyncio
import os
import functions_framework
from supabase import create_client

# Dostosowane importy do Twoich funkcji z poprzednich plików
from googlescrap import run_google_scraper
from analyzer import analyze_and_save_report

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

supabase = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None


@functions_framework.http
def trigger_weekly_job(request):
    if not supabase:
        return ("Błąd: Brak kluczy Supabase w środowisku.", 500)

    # 1. Pobierz zadania oczekujące na wykonanie dla aktywnych lokalizacji
    try:
        response = (
            supabase.table("scraping_tasks")
            .select("id, location_id, user_id, locations!inner(is_active)")
            .eq("status", "pending")
            .eq("locations.is_active", True)
            .execute()
        )
        tasks = response.data or []
    except Exception as e:
        print(f"Błąd pobierania zadań: {e}")
        return (f"Błąd pobierania zadań z bazy: {e}", 500)

    print(f"Znaleziono zadań do wykonania: {len(tasks)}")

    for task in tasks:
        task_id = task["id"]
        loc_id = task["location_id"]
        user_id = task.get("user_id")

        try:
            # Oznacz zadanie jako 'w trakcie'
            supabase.table("scraping_tasks").update({"status": "in_progress"}).eq("id", task_id).execute()

            # 2. Odpal scraper (z użyciem asyncio.run dla funkcji asynchronicznej)
            print(f"--> Uruchamiam scraper dla lokalizacji: {loc_id}")
            asyncio.run(run_google_scraper(location_id=loc_id, user_id=user_id))

            # 3. Odpal analyzer
            print(f"--> Uruchamiam analyzer dla lokalizacji: {loc_id}")
            analyze_and_save_report(user_id=user_id, loc_id=loc_id)

            # Oznacz jako zakończone sukcesem
            supabase.table("scraping_tasks").update({"status": "completed"}).eq("id", task_id).execute()

        except Exception as e:
            print(f"Błąd dla lokalizacji {loc_id}: {e}")
            supabase.table("scraping_tasks").update({"status": "failed"}).eq("id", task_id).execute()

    return (f"Przetworzono {len(tasks)} zadań.", 200)