import type { PublicReview } from "./types";

function sourceMark(source: string) {
  const normalized = source.toLowerCase();
  if (normalized.includes("facebook")) return "f";
  if (normalized.includes("google")) return "G";
  return source.trim().charAt(0).toUpperCase() || "?";
}

export default function ReviewFeed({ reviews }: { reviews: PublicReview[] }) {
  return (
    <section aria-labelledby="reviews-heading" className="py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">Głosy klientów</p>
          <h2 id="reviews-heading" className="mt-2 text-2xl font-semibold text-white">Opinie</h2>
        </div>
        <p className="text-sm text-slate-400">{reviews.length} najnowszych opinii</p>
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 px-5 py-8 text-sm text-slate-400">Ta lokalizacja nie ma jeszcze publicznych opinii.</p>
      ) : (
        <div className="divide-y divide-slate-800 border-y border-slate-800">
          {reviews.map((review) => (
            <article key={review.id} className="py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span aria-label={`Źródło: ${review.source}`} className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-800 text-sm font-bold text-emerald-300">
                    {sourceMark(review.source)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{review.author || "Klient"}</p>
                    <p className="text-xs text-slate-400">{review.source}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums text-emerald-300">{review.rating}<span className="text-sm font-normal text-slate-400"> / 100</span></p>
                  <time className="text-xs text-slate-500" dateTime={review.createdAt}>
                    {new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(new Date(review.createdAt))}
                  </time>
                </div>
              </div>
              <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-slate-300">{review.content}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}