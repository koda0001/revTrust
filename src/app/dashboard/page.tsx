"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Jeśli użytkownik nie jest zalogowany, przekieruj do logowania
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
      }
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white text-sm">
        Ładowanie dashboardu...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-900 text-white">
      {/* Pasek boczny (Sidebar) */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-indigo-400 mb-8">
            Dashboard
          </h2>
          <nav className="space-y-2">
            <a
              href="/dashboard"
              className="block px-4 py-2 rounded-lg bg-slate-800 text-sm font-medium text-white"
            >
              Strona Główna
            </a>
          </nav>
        </div>

        {/* Dolna sekcja usera i wylogowania */}
        <div className="border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-400 truncate mb-3">
            Zalogowany: <br />
            <span className="text-white font-medium">{user?.email}</span>
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-red-600/20 text-red-400 border border-red-500/30 py-2 rounded-lg font-semibold text-sm hover:bg-red-600/30 transition-colors"
          >
            Wyloguj się
          </button>
        </div>
      </aside>

      {/* Główna przestrzeń robocza */}
      <main className="flex-1 p-8">
        <header className="mb-8 flex justify-between items-center border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold">Witaj w panelu!</h1>
        </header>

        {/* Pusty layout na przyszłe moduły */}
        <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center text-slate-500">
          <p className="text-base font-medium">Miejsce na Twoje komponenty</p>
          <p className="text-xs mt-1">
            Ten layout jest gotowy do rozbudowy.
          </p>
        </div>
      </main>
    </div>
  );
}