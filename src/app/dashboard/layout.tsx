import Link from "next/link";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-900 text-white">
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-indigo-400 mb-8">
            Dashboard
          </h2>
          <nav className="space-y-2">
            <Link
              href="/dashboard"
              className="block px-4 py-2 rounded-lg bg-slate-800 text-sm font-medium text-white"
            >
              Strona Główna
            </Link>
            <Link
              href="/dashboard/sources"
              className="block px-4 py-2 rounded-lg bg-slate-800 text-sm font-medium text-white"
            >
              Źródła
            </Link>
            <Link
              href="/dashboard/reviews"
              className="block px-4 py-2 rounded-lg bg-slate-800 text-sm font-medium text-white"
            >
              Baza ocen
            </Link>
            <Link
              href="/dashboard/analysis"
              className="block px-4 py-2 rounded-lg bg-slate-800 text-sm font-medium text-white"
            >
              Analiza
            </Link>
          </nav>
        </div>

        <div className="border-t border-slate-800 pt-4 text-xs text-slate-400">
          <p className="mb-2">Wybierz moduł w menu, a zawartość po prawej stronie się zmieni.</p>
          <p className="text-white font-medium">Źródła danych i formularz opinii</p>
        </div>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
