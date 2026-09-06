import type { FormEvent } from "react";
import type {
  LocationFormData,
  Source,
  StatusType,
} from "./types";

interface LocationFormProps {
  formData: LocationFormData;
  sources: Source[];
  sourcesLoading: boolean;
  editingLocationId: string | null;
  status: string | null;
  statusType: StatusType;
  onChange: (data: LocationFormData) => void;
  onSubmit: (data: LocationFormData) => void;
  onError: (message: string) => void;
  onCancel: () => void;
}

export function LocationForm({
  formData,
  sources,
  sourcesLoading,
  editingLocationId,
  status,
  statusType,
  onChange,
  onSubmit,
  onError,
  onCancel,
}: LocationFormProps) {
  const selectedSource = sources.find((source) => source.id === formData.sourceId);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.sourceId) {
      onError("Wybór źródła jest wymagany.");
      return;
    }

    if (!formData.name.trim()) {
      onError("Nazwa lokalizacji jest wymagana.");
      return;
    }

    if (!formData.url.trim()) {
      onError("Link źródła jest wymagany.");
      return;
    }

    try {
      const url = new URL(formData.url);
      const sourceIdentifier = (
        selectedSource?.slug || selectedSource?.type || selectedSource?.name || ""
      ).toLowerCase();

      if (sourceIdentifier.includes("google")) {
        if (!url.hostname.includes("google") && !url.hostname.includes("maps")) {
          throw new Error("Link musi być prawidłowym adresem Google Maps.");
        }
      } else if (sourceIdentifier.includes("facebook")) {
        if (!url.hostname.includes("facebook") && !url.hostname.includes("fb")) {
          throw new Error("Link musi być prawidłowym adresem Facebooka.");
        }
      }
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Wprowadzony adres URL jest nieprawidłowy."
      );
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-8 shadow-xl shadow-slate-950/20">
      <h3 className="text-lg font-semibold mb-4">
        {editingLocationId ? "Edytuj lokalizację" : "Dodaj nową lokalizację"}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-semibold mb-2">1. Wybierz źródło *</label>
          <select
            value={formData.sourceId}
            onChange={(event) => onChange({ ...formData, sourceId: event.target.value })}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            required
            disabled={sourcesLoading}
          >
            <option value="" disabled>
              {sourcesLoading ? "Ładowanie źródeł..." : "-- Wybierz źródło --"}
            </option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </div>

        {formData.sourceId && (
          <>
            <div>
              <label className="block text-sm font-semibold mb-2">
                2. Nazwa lokalizacji / profilu *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => onChange({ ...formData, name: event.target.value })}
                placeholder={`np. ${selectedSource?.name || "Lokalizacja"} - Główna`}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                3. Link URL do profilu ({selectedSource?.name.toUpperCase()}) *
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(event) => onChange({ ...formData, url: event.target.value })}
                placeholder="https://..."
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500"
                required
              />
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={!formData.sourceId}
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingLocationId ? "Zaktualizuj" : "Dodaj"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition"
          >
            Anuluj
          </button>
        </div>

        {status && (
          <p className={`text-sm mt-2 ${statusType === "success" ? "text-emerald-400" : "text-red-400"}`}>
            {status}
          </p>
        )}
      </form>
    </div>
  );
}
