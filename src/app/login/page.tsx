import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-slate-100 p-6">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-slate-800/50 p-6 shadow-lg border border-slate-700/50">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Zaloguj się
          </h1>
          <p className="text-xs text-slate-400">
            Wprowadź swoje dane, aby przejść dalej
          </p>
        </div>

        <form className="space-y-4">
          <div>
            <label 
              htmlFor="email" 
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Adres Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="twoj@email.com"
              required
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label 
              htmlFor="password" 
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Hasło
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              required
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Zaloguj się
          </button>
        </form>

        <div className="text-center">
          <Link 
            href="/" 
            className="text-xs text-slate-400 hover:text-slate-200 transition"
          >
            ← Wróć do strony głównej
          </Link>
        </div>
      </div>
    </main>
  );
}