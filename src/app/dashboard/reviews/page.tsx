"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Review = {
  id: string;
  author: string;
  source: string;
  content: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
  location_id?: string;
  location?: {
    name: string;
  };
};

type PageUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week: weekNo, year: d.getUTCFullYear() };
}

export default function ReviewsPage() {
  const router = useRouter();
  const [user, setUser] = useState<PageUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");
  const [selectedWeek, setSelectedWeek] = useState<string>("ALL");
  const [selectedSource, setSelectedSource] = useState<string>("ALL");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;

      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const fetchReviews = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        if (!accessToken) {
          throw new Error("Session expired");
        }

        const response = await fetch("/api/reviews", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody?.error || "Failed to fetch reviews");
        }

        const data = await response.json();
        setReviews(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("error fetching reviews data: ", error);
        setReviews([]);
      }
    };

    fetchReviews();
  }, [user]);

  const locationsList = useMemo(() => {
    const map = new Map<string, string>();
    reviews.forEach((r) => {
      if (r.location_id) {
        const name = r.location?.name || `Lokalizacja (${r.location_id.slice(0, 8)})`;
        map.set(r.location_id, name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [reviews]);

  const weeksList = useMemo(() => {
    const map = new Map<string, string>();
    reviews.forEach((r) => {
      const d = new Date(r.createdAt);
      const { week, year } = getWeekNumber(d);
      const key = `${year}-W${week}`;
      const label = `Tydzień ${week} (${year})`;
      map.set(key, label);
    });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [reviews]);

  const sourcesList = useMemo(() => {
    const set = new Set<string>();
    reviews.forEach((r) => {
      if (r.source) set.add(r.source);
    });
    return Array.from(set);
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (selectedLocation !== "ALL" && r.location_id !== selectedLocation) {
        return false;
      }

      if (selectedWeek !== "ALL") {
        const d = new Date(r.createdAt);
        const { week, year } = getWeekNumber(d);
        const key = `${year}-W${week}`;
        if (key !== selectedWeek) return false;
      }

      if (selectedSource !== "ALL" && r.source !== selectedSource) {
        return false;
      }

      return true;
    });
  }, [reviews, selectedLocation, selectedWeek, selectedSource]);

  const stats = useMemo(() => {
    if (!filteredReviews.length) {
      return {
        total: 0,
        average: 0,
        latest: "Brak opinii",
      };
    }

    const total = filteredReviews.length;
    const average = filteredReviews.reduce((sum, review) => sum + Number(review.rating), 0) / total;
    const latest = new Date(filteredReviews[0].createdAt).toLocaleDateString("pl-PL");

    return {
      total,
      average: Number(average.toFixed(1)),
      latest,
    };
  }, [filteredReviews]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white text-sm">
        Ładowanie opinii...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold text-white">Wszystkie opinie</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Przeglądaj i filtruj recenzje zgromadzone ze wszystkich platform.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">Filtry opinii</span>
          {(selectedLocation !== "ALL" || selectedWeek !== "ALL" || selectedSource !== "ALL") && (
            <button
              onClick={() => {
                setSelectedLocation("ALL");
                setSelectedWeek("ALL");
                setSelectedSource("ALL");
              }}
              className="text-xs text-amber-400 hover:underline"
            >
              Wyczyść filtry
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Lokalizacja</label>
            <select
              className="w-full rounded-lg border border-slate-800 px-3 py-2 bg-slate-900 text-white text-sm focus:outline-none focus:border-slate-600"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="ALL">Wszystkie lokalizacje</option>
              {locationsList.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Tydzień dodania</label>
            <select
              className="w-full rounded-lg border border-slate-800 px-3 py-2 bg-slate-900 text-white text-sm focus:outline-none focus:border-slate-600"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
            >
              <option value="ALL">Wszystkie tygodnie</option>
              {weeksList.map((w) => (
                <option key={w.key} value={w.key}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Źródło</label>
            <select
              className="w-full rounded-lg border border-slate-800 px-3 py-2 bg-slate-900 text-white text-sm focus:outline-none focus:border-slate-600"
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
            >
              <option value="ALL">Wszystkie źródła</option>
              {sourcesList.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm text-slate-400">Łączna liczba opinii</p>
          <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm text-slate-400">Średnia ocena</p>
          <p className="mt-2 text-3xl font-bold text-amber-400">
            {stats.average > 0 ? `${stats.average} / 100%` : "-"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm text-slate-400">Najnowsza opinia z wyboru</p>
          <p className="mt-2 text-lg font-semibold text-emerald-400">{stats.latest}</p>
        </div>
      </div>

      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center text-slate-400">
            Brak opinii spełniających wybrane kryteria.
          </div>
        ) : (
          filteredReviews.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-lg shadow-slate-950/10"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-white">{review.author}</p>
                    {review.location?.name && (
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                        {review.location.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{review.source}</p>
                </div>
                <div className="rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-300 border border-amber-500/20">
                  {review.rating} / 100%
                </div>
              </div>

              <p className="text-slate-200 leading-relaxed">{review.content}</p>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>Dodano: {new Date(review.createdAt).toLocaleString("pl-PL")}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}