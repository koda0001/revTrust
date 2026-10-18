import Link from "next/link";
import LeadGenerationBanner from "./LeadGenerationBanner";
import ReviewFeed from "./ReviewFeed";
import SourceBreakdown from "./SourceBreakdown";
import type { PublicProfileData } from "./types";

export default function PublicProfile({ profile }: { profile: PublicProfileData }) {
  const activeSources = profile.sources.map((source) => source.name);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
        <nav aria-label="Nawigacja" className="mb-10 flex items-center justify-between border-b border-slate-800 pb-4">
          <Link href="/" className="text-sm font-bold tracking-wide text-white">RevTrust</Link>
          <Link href="/login" className="text-sm text-slate-300 transition hover:text-white">Zaloguj się</Link>
        </nav>

        <header className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 px-6 py-8 sm:px-10 sm:py-11">
          <div aria-hidden="true" className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-400/5 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">Profil lokalizacji</span>
              {activeSources.map((source) => (
                <span key={source} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs text-slate-300">{source}</span>
              ))}
            </div>

            <div className="mt-7 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <p className="text-sm text-slate-400">Opinie z wielu źródeł, w jednym miejscu</p>
                <h1 className="mt-2 max-w-3xl break-words text-3xl font-semibold leading-tight sm:text-4xl">{profile.name}</h1>
                <p className="mt-4 break-all font-mono text-xs text-slate-500">ID: {profile.id}</p>
                {profile.googleMapsUrl && (
                  <a href={profile.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-indigo-300 underline decoration-indigo-300/30 underline-offset-4 hover:text-indigo-200">
                    Zobacz lokalizację w Google Maps <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>

              <div className="flex items-end gap-4 border-t border-slate-700 pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Ocena zbiorcza</p>
                  <p className="mt-1 text-5xl font-semibold tabular-nums tracking-normal text-white">{profile.averageRating.toFixed(1)}<span className="ml-1 text-base font-normal text-slate-400">/ 100</span></p>
                  <p className="mt-2 text-sm text-slate-400">{profile.reviewCount} {profile.reviewCount === 1 ? "opinia" : "opinii"}</p>
                </div>
                <span aria-hidden="true" className="pb-1 text-3xl text-emerald-300">★</span>
              </div>
            </div>
          </div>
        </header>

        <SourceBreakdown sources={profile.sources} />
        <ReviewFeed reviews={profile.reviews} totalReviewCount={profile.reviewCount} />
        <LeadGenerationBanner />

        <footer className="pt-8 text-center text-xs text-slate-500">
          Oceny prezentowane na podstawie opinii dostępnych w profilu.
        </footer>
      </div>
    </main>
  );
}