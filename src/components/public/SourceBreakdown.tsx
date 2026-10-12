import type { PublicSourceStat } from "./types";

function sourceMark(source: string) {
  const normalized = source.toLowerCase();
  if (normalized.includes("facebook")) return "f";
  if (normalized.includes("google")) return "G";
  return source.trim().charAt(0).toUpperCase() || "?";
}

export default function SourceBreakdown({ sources }: { sources: PublicSourceStat[] }) {
  if (sources.length === 0) {
    return (
      <section aria-labelledby="sources-heading" className="border-y border-slate-800 py-10">
        <h2 id="sources-heading" className="text-xl font-semibold text-white">Oceny według źródeł</h2>
        <p className="mt-3 text-sm text-slate-400">Brak opinii do porównania między źródłami.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="sources-heading" className="border-y border-slate-800 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">Porównanie</p>
          <h2 id="sources-heading" className="mt-2 text-2xl font-semibold text-white">Oceny według źródeł</h2>
        </div>
        <p className="text-sm text-slate-400">Średnia oraz liczba opinii</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sources.map((source) => (
          <article key={source.name} className="rounded-lg border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center gap-3">
              <span aria-label={`Źródło: ${source.name}`} className="grid size-9 place-items-center rounded-full bg-indigo-400/15 text-sm font-bold text-indigo-300">
                {sourceMark(source.name)}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-medium text-white">{source.name}</h3>
                <p className="text-xs text-slate-400">{source.reviewCount} {source.reviewCount === 1 ? "opinia" : "opinii"}</p>
              </div>
              <p className="text-lg font-semibold tabular-nums text-white">{source.rating.toFixed(1)}<span className="text-sm font-normal text-slate-400"> / 100</span></p>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800" role="meter" aria-label={`Ocena ${source.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={source.rating}>
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, Math.max(0, source.rating))}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}