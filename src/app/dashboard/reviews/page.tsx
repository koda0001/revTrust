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
  user?: {
    id: string;
    email?: string | null;
    name?: string | null;
  };
};

export default function ReviewsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const fetchReviews = async () => {
      try {
        const response = await fetch("/api/reviews");
        if (!response.ok) {
          throw new Error("Failed to fetch reviews");
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

  const stats = useMemo(() => {
    if (!reviews.length) {
      return {
        total: 0,
        average: 0,
        latest: "Brak opinii",
      };
    }

    const total = reviews.length;
    const average = reviews.reduce((sum, review) => sum + Number(review.rating), 0) / total;
    const latest = new Date(reviews[0].createdAt).toLocaleDateString("pl-PL");

    return {
      total,
      average: Number(average.toFixed(1)),
      latest,
    };
  }, [reviews]);

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
        <h1 className="text-3xl font-bold">Wszystkie opinie</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Przeglądaj wszystkie recenzje zapisane w bazie danych.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm text-slate-400">Łączna liczba opinii</p>
          <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm text-slate-400">Średnia ocena</p>
          <p className="mt-2 text-3xl font-bold text-amber-400">{stats.average}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm text-slate-400">Ostatnia opinia</p>
          <p className="mt-2 text-lg font-semibold text-emerald-400">{stats.latest}</p>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-slate-400">
            Brak opinii w bazie danych.
          </div>
        ) : (
          reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-lg shadow-slate-950/10"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{review.author}</p>
                  <p className="text-sm text-slate-400">{review.source}</p>
                </div>
                <div className="rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-300">
                  {review.rating}/5
                </div>
              </div>

              <p className="text-slate-200">{review.content}</p>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>{review.user?.email ?? "Brak użytkownika"}</span>
                <span>{new Date(review.createdAt).toLocaleString("pl-PL")}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
