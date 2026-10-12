import Link from "next/link";

export default function LeadGenerationBanner() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-emerald-500/25 bg-slate-900 px-6 py-8 sm:px-9 sm:py-10">
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent" />
      <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">Dla właścicieli firm</p>
          <h2 className="mt-3 text-xl font-semibold leading-snug text-white sm:text-2xl">
            Jesteś właścicielem tej firmy? Przejmij profil, zarządzaj opiniami i generuj raporty AI za darmo.
          </h2>
        </div>
        <Link href="/register" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
          Przejmij profil
        </Link>
      </div>
    </section>
  );
}