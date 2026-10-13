import type { Location, Source } from "./types";

interface LocationListProps {
  locations: Location[];
  sources: Source[];
  loading: boolean;
  showAddLocation: boolean;
  onEdit: (location: Location) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, newStatus: boolean) => void;
}

export function LocationList({
  locations,
  sources,
  loading,
  showAddLocation,
  onEdit,
  onDelete,
  onToggleActive,
}: LocationListProps) {
  if (loading) {
    return <div className="text-slate-400 text-center py-8">Ładowanie lokalizacji...</div>;
  }

  if (locations.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-8 text-center text-slate-400">
        {showAddLocation
          ? "Wybierz źródło i uzupełnij formularz, aby dodać pierwszą lokalizację."
          : "Brak lokalizacji. Kliknij przycisk powyżej, aby dodać."}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {locations.map((location) => {
        const matchedSource = sources.find((source) => source.name === location.name);
        const sourceLabel = matchedSource?.name || location.source || "Niezdefiniowane";
        const isActive = location.is_active ?? true;

        return (
          <div
            key={location.id}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/20 hover:border-slate-700 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold line-clamp-2">{location.name}</h3>
                <span className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono uppercase">
                  {sourceLabel}
                </span>
              </div>

              <div className="flex justify-between items-center mb-4">
                <a
                  href={location.location_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 text-sm truncate mr-2"
                >
                  Otwórz źródło
                </a>

                {/* iPhone-style Toggle Switch */}
                <button
                  type="button"
                  onClick={() => onToggleActive(location.id, !isActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isActive ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                  aria-label="Przełącz status aktywności"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <p className="text-slate-500 text-xs mb-4">
                Dodana: {new Date(location.created_at).toLocaleDateString("pl-PL")}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onEdit(location)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 transition"
              >
                Edytuj
              </button>
              <button
                onClick={() => onDelete(location.id)}
                className="flex-1 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-900 transition"
              >
                Usuń
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}