"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Konto zostało utworzone! Sprawdź e-mail, aby potwierdzić rejestrację.");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 text-white p-6">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-sm space-y-4 bg-slate-800 p-6 rounded-xl border border-slate-700"
      >
        <h1 className="text-xl font-bold">Zarejestruj się</h1>

        {error && <p className="text-red-400 text-xs">{error}</p>}
        {message && <p className="text-green-400 text-xs">{message}</p>}

        <div>
          <label className="block text-xs mb-1">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-2 bg-slate-900 rounded border border-slate-700 text-sm text-white"
          />
        </div>

        <div>
          <label className="block text-xs mb-1">Hasło</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-2 bg-slate-900 rounded border border-slate-700 text-sm text-white"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 py-2 rounded font-semibold text-sm hover:bg-indigo-500"
        >
          Załóż konto
        </button>
      </form>
    </main>
  );
}