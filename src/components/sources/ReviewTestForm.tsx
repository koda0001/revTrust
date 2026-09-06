import type { FormEvent } from "react";
import type { Location, ReviewFormData, Source, StatusType } from "./types";

interface ReviewTestFormProps {
  sourceType: string;
  formData: ReviewFormData;
  locations: Location[];
  sources: Source[];
  status: string | null;
  statusType: StatusType;
  onSourceTypeChange: (sourceType: string) => void;
  onChange: (data: ReviewFormData) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function ReviewTestForm({
  sourceType,
  formData,
  locations,
  sources,
  status,
  statusType,
  onSourceTypeChange,
  onChange,
  onSubmit,
}: ReviewTestFormProps) {
  const locationOptions = locations.map((location) => {
    const matchedSource = sources.find((source) => source.id === location.source_id);
    return {
      ...location,
      sourceLabel: matchedSource?.name || location.source_type || "inne",
    };
  });

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-8 shadow-xl shadow-slate-950/20">
      <h2 className="text-2xl font-bold mb-6">Dodaj recenzję (test bench)</h2>
      <div className="mb-6 grid gap-4 max-w-2xl">
        <label className="text-sm font-semibold">Wybierz typ źródła</label>
        <select
          value={sourceType}
          onChange={(event) => onSourceTypeChange(event.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
        >
          <option value="google">Dodaj z Google</option>
          <option value="manual">Dodaj manualnie</option>
        </select>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 max-w-2xl">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold mb-2">Autor</label>
            <input
              value={formData.author}
              onChange={(event) => onChange({ ...formData, author: event.target.value })}
              placeholder="Imię i nazwisko"
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
            />
          </div>

          {sourceType === "manual" && (
            <div>
              <label className="block text-sm font-semibold mb-2">Źródło opinii</label>
              <input
                value={formData.source}
                onChange={(event) => onChange({ ...formData, source: event.target.value })}
                placeholder="Formularz"
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2">
              Przypisz do lokalizacji (opcjonalnie)
            </label>
            <select
              value={formData.locationId}
              onChange={(event) => onChange({ ...formData, locationId: event.target.value })}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
            >
              <option value="">-- Brak lokalizacji --</option>
              {locationOptions.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.sourceLabel})
                </option>
              ))}
            </select>
          </div>
        </div>

        {sourceType === "manual" && (
          <>
            <div>
              <label className="block text-sm font-semibold mb-2">Treść opinii</label>
              <textarea
                value={formData.content}
                onChange={(event) => onChange({ ...formData, content: event.target.value })}
                rows={6}
                placeholder="Wpisz treść recenzji..."
                className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Ocena (0% - 100%)</label>
              <input
                type="number"
                value={formData.rating}
                min={0}
                max={100}
                onChange={(event) => onChange({ ...formData, rating: Number(event.target.value) })}
                className="w-32 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition"
        >
          Dodaj recenzję
        </button>

        {status && (
          <p className={`text-sm mt-2 ${statusType === "success" ? "text-emerald-400" : "text-red-400"}`}>
            {status}
          </p>
        )}
      </form>
    </section>
  );
}
