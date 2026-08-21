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
    <div className="space-y-8">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Witaj w panelu! {user.email}</h1>
        <p className="mt-2 text-slate-400 max-w-2xl">
          Użyj menu po lewej stronie, aby przejść do strony głównej lub do źródeł danych.
        </p>
      </header>

      <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-8 shadow-xl shadow-slate-950/20 max-w-3xl">
        <p className="text-slate-300">
          Panel główny jest gotowy do rozbudowy. Możesz teraz dodać stronę źródeł,
          która korzysta z tego samego lewego menu.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => router.push("/dashboard/sources")}
            className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition"
          >
            Przejdź do źródeł
          </button>
          <button
            onClick={handleLogout}
            className="rounded-2xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition"
          >
            Wyloguj się
          </button>
        </div>
      </div>
    </div>
  );
}