"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SourcesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [sourceType, setSourceType] = useState("manual");
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    author: "",
    source: "Formularz",
    content: "",
    rating: 5,
  });

  useEffect(() => {
    const checkUser = async () => {
      const session = await supabase.auth.getSession();

      if (!session.data?.session?.user) {
        router.push("/login");
      } else {
        setUser(session.data.session.user);
        setAccessToken(session.data.session.access_token);
      }

      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!user) {
      setStatus("Brak zalogowanego użytkownika.");
      return;
    }

    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        author: form.author || user.email || "Anonim",
        source: form.source,
        content: form.content,
        rating: form.rating,
        accessToken,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setStatus(result.error || "Nie udało się dodać recenzji.");
      return;
    }

    setStatus("Recenzja została dodana do bazy danych.");
    setForm({ author: "", source: "Formularz", content: "", rating: 5 });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Ładowanie...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Źródła danych</h1>
        <p className="text-slate-400 mt-2 max-w-2xl">
          Wybierz źródło danych, a następnie dodaj nową recenzję ręcznie. W tej wersji dostępna jest jedna opcja "Dodaj manualnie".
        </p>
      </header>

      <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-8 shadow-xl shadow-slate-950/20">
        <div className="mb-6 grid gap-4 max-w-2xl">
          <label className="text-sm font-semibold">Wybierz typ źródła</label>
          <select
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
          >
            <option value="manual">Dodaj manualnie</option>
          </select>
        </div>

        {sourceType === "manual" && (
          <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold mb-2">Autor</label>
                <input
                  value={form.author}
                  onChange={(event) => setForm({ ...form, author: event.target.value })}
                  placeholder="Imię i nazwisko"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Źródło opinii</label>
                <input
                  value={form.source}
                  onChange={(event) => setForm({ ...form, source: event.target.value })}
                  placeholder="Formularz"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Treść opinii</label>
              <textarea
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
                rows={6}
                placeholder="Wpisz treść recenzji..."
                className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Ocena (1-5)</label>
              <input
                type="number"
                value={form.rating}
                min={1}
                max={5}
                onChange={(event) => setForm({ ...form, rating: Number(event.target.value) })}
                className="w-32 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition"
            >
              Dodaj recenzję
            </button>

            {status && <p className="text-sm text-slate-200 mt-2">{status}</p>}
          </form>
        )}
      </div>

      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-2xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700 transition"
        >
          Powrót do dashboardu
        </Link>
      </div>
    </div>
  );
}
