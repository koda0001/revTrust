"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SourceType = "google" | "facebook" | "other";

interface Location {
  id: string;
  name: string;
  source_type?: SourceType;
  google_maps_url: string;
  created_at: string;
}

interface LocationFormData {
  name: string;
  sourceType: SourceType | "";
  url: string;
}

export default function SourcesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [sourceType, setSourceType] = useState("manual");
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);

  //sources states for list pickup
  const [sources, setSources] = useState<Location[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  
  // Locations state
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState<LocationFormData>({
    name: "",
    sourceType: "",
    url: "",
  });
  
  // Review form state
  const [form, setForm] = useState({
    author: "",
    source: "Formularz",
    content: "",
    rating: 5,
    locationId: "",
  });

  useEffect(() => {
    const checkUser = async () => {
      const session = await supabase.auth.getSession();

      if (!session.data?.session?.user) {
        router.push("/login");
      } else {
        setUser(session.data.session.user);
        setAccessToken(session.data.session.access_token);
      }

      setLoading(false);
    };

    checkUser();
  }, [router]);

  useEffect(() => {
    if (accessToken) {
      fetchLocations();
      fetchSources();
    }
  }, [accessToken]);

  const fetchLocations = async () => {
    if (!accessToken) return;

    setLocationsLoading(true);
    try {
      const response = await fetch("/api/locations", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Nie udało się pobrać lokalizacji");
      }

      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error("Błąd pobierania lokalizacji:", error);
    } finally {
      setLocationsLoading(false);
    }
  };

  const fetchSources = async () => {
    if (!accessToken) return;

    setSourcesLoading(true);
    try {
      const response = await fetch("/api/sources", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Nie udało się pobrać źródeł");
      }

      const data = await response.json();
      setSources(data);
    } catch (error) {
      console.error("Błąd pobierania źródeł:", error);
    } finally {
      setSourcesLoading(false);
    }
  };

  const handleAddLocation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus(null);

    if (!locationForm.sourceType) {
      setStatus("Wybór źródła jest wymagany.");
      setStatusType("error");
      return;
    }

    if (!locationForm.name.trim()) {
      setStatus("Nazwa lokalizacji jest wymagana.");
      setStatusType("error");
      return;
    }

    if (!locationForm.url.trim()) {
      setStatus("Link źródła jest wymagany.");
      setStatusType("error");
      return;
    }

    // Dynamiczna walidacja URL w zależności od wybranego źródła
    try {
      const urlObj = new URL(locationForm.url);
      if (locationForm.sourceType === "google") {
        if (!urlObj.hostname.includes("google") && !urlObj.hostname.includes("maps")) {
          throw new Error("Link musi być prawidłowym adresem Google Maps.");
        }
      } else if (locationForm.sourceType === "facebook") {
        if (!urlObj.hostname.includes("facebook") && !urlObj.hostname.includes("fb")) {
          throw new Error("Link musi być prawidłowym adresem Facebooka.");
        }
      }
    } catch (err: any) {
      setStatus(err.message || "Wprowadzony adres URL jest nieprawidłowy.");
      setStatusType("error");
      return;
    }

    try {
      const endpoint = "/api/locations";
      const method = editingLocationId ? "PUT" : "POST";
      const payload = {
        ...(editingLocationId && { id: editingLocationId }),
        name: locationForm.name,
        sourceType: locationForm.sourceType,
        googleMapsUrl: locationForm.url, // przekazujemy pod polskim/istniejącym kluczem API
        accessToken,
      };

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Nie udało się zapisać lokalizacji");
      }

      setStatus(
        editingLocationId
          ? "Lokalizacja została zaktualizowana."
          : "Lokalizacja została dodana."
      );
      setStatusType("success");
      setLocationForm({ name: "", sourceType: "", url: "" });
      setShowAddLocation(false);
      setEditingLocationId(null);
      await fetchLocations();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Błąd serwera";
      setStatus(message);
      setStatusType("error");
    }
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocationId(location.id);
    setLocationForm({
      name: location.name,
      sourceType: location.source_type || "google",
      url: location.google_maps_url,
    });
    setShowAddLocation(true);
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę lokalizację?")) {
      return;
    }

    try {
      const response = await fetch("/api/locations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, accessToken }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Nie udało się usunąć lokalizacji");
      }

      setStatus("Lokalizacja została usunięta.");
      setStatusType("success");
      await fetchLocations();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Błąd serwera";
      setStatus(message);
      setStatusType("error");
    }
  };

  const handleCancelEdit = () => {
    setShowAddLocation(false);
    setEditingLocationId(null);
    setLocationForm({ name: "", sourceType: "", url: "" });
    setStatus(null);
  };

  const handleSubmitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!user) {
      setStatus("Brak zalogowanego użytkownika.");
      setStatusType("error");
      return;
    }

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          author: form.author || user.email || "Anonim",
          source: form.source,
          content: form.content,
          rating: form.rating,
          locationId: form.locationId || null,
          accessToken,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Nie udało się dodać recenzji.");
      }

      setStatus("Recenzja została dodana do bazy danych.");
      setStatusType("success");
      setForm({ author: "", source: "Formularz", content: "", rating: 5, locationId: "" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Błąd serwera";
      setStatus(message);
      setStatusType("error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Ładowanie...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Źródła i lokalizacje</h1>
        <p className="text-slate-400 mt-2 max-w-2xl">
          Zarządzaj lokalizacjami/filiami oraz wybieraj ich źródła (Google, Facebook itp.). Każda recenzja może być przypisana do konkretnej lokalizacji.
        </p>
      </header>

      {/* Location Management Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Moje lokalizacje i źródła</h2>
          {!showAddLocation && (
            <button
              onClick={() => setShowAddLocation(true)}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition"
            >
              + Dodaj nową lokalizację
            </button>
          )}
        </div>

        {/* Add/Edit Location Form */}
        {showAddLocation && (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-8 shadow-xl shadow-slate-950/20">
            <h3 className="text-lg font-semibold mb-4">
              {editingLocationId ? "Edytuj lokalizację" : "Dodaj nową lokalizację"}
            </h3>
            <form onSubmit={handleAddLocation} className="space-y-4 max-w-2xl">
              
              {/* KROK 1: Wybór źródła */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  1. Wybierz źródło *
                </label>


                  <select
                  value={locationForm.sourceType}
                  onChange={(e) =>
                    setLocationForm({
                      ...locationForm,
                      sourceType: e.target.value as SourceType,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                  >
                    <option value="" disabled>-- Wybierz źródło --</option>
                    {sources.map((sources) => (
                      <option key={sources.id} value={sources.id}>{sources.name}</option>
                    ))}

                  </select>
              </div>
              
              {/* KROK 2: Formularz rozwija się dopiero po wybraniu źródła */}
              {locationForm.sourceType && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      2. Nazwa lokalizacji / profilu *
                    </label>
                    <input
                      type="text"
                      value={locationForm.name}
                      onChange={(e) =>
                        setLocationForm({ ...locationForm, name: e.target.value })
                      }
                      placeholder={
                        locationForm.sourceType === "google"
                          ? "np. Piekarnia - Marszałkowska"
                          : locationForm.sourceType === "facebook"
                          ? "np. Strona FB - Główna"
                          : "np. Profil portalu branżowego"
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      3. Link URL do profilu ({locationForm.sourceType.toUpperCase()}) *
                    </label>
                    <input
                      type="url"
                      value={locationForm.url}
                      onChange={(e) =>
                        setLocationForm({
                          ...locationForm,
                          url: e.target.value,
                        })
                      }
                      placeholder={
                        locationForm.sourceType === "google"
                          ? "https://maps.google.com/..."
                          : locationForm.sourceType === "facebook"
                          ? "https://facebook.com/..."
                          : "https://..."
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500"
                      required
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!locationForm.sourceType}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingLocationId ? "Zaktualizuj" : "Dodaj"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition"
                >
                  Anuluj
                </button>
              </div>

              {status && (
                <p
                  className={`text-sm mt-2 ${
                    statusType === "success"
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {status}
                </p>
              )}
            </form>
          </div>
        )}

        {/* Locations List */}
        {locationsLoading ? (
          <div className="text-slate-400 text-center py-8">Ładowanie lokalizacji...</div>
        ) : locations.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-8 text-center text-slate-400">
            {showAddLocation
              ? "Wybierz źródło i uzupełnij formularz, aby dodać pierwszą lokalizację."
              : "Brak lokalizacji. Kliknij przycisk powyżej, aby dodać."}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {locations.map((location) => {
              const currentSource = location.source_type || "google";
              return (
                <div
                  key={location.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/20 hover:border-slate-700 transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold line-clamp-2">
                      {location.name}
                    </h3>
                    <span className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono uppercase">
                      {currentSource}
                    </span>
                  </div>
                  <a
                    href={location.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 text-sm mb-4 block truncate"
                  >
                    Otwórz źródło
                  </a>
                  <p className="text-slate-500 text-xs mb-4">
                    Dodana: {new Date(location.created_at).toLocaleDateString("pl-PL")}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditLocation(location)}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 transition"
                    >
                      Edytuj
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(location.id)}
                      className="flex-1 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-900 transition"
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Review/Opinion Management Section */}
      <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-8 shadow-xl shadow-slate-950/20">
        <h2 className="text-2xl font-bold mb-6">Dodaj recenzję (test bench)</h2>

        <div className="mb-6 grid gap-4 max-w-2xl">
          <label className="text-sm font-semibold">Wybierz typ źródła</label>
          <select
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
          >
            <option value="google">Dodaj z Google</option>
            <option value="manual">Dodaj manualnie</option>
          </select>
        </div>

        {sourceType === "manual" && (
          <form onSubmit={handleSubmitReview} className="space-y-5 max-w-2xl">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold mb-2">Autor</label>
                <input
                  value={form.author}
                  onChange={(event) =>
                    setForm({ ...form, author: event.target.value })
                  }
                  placeholder="Imię i nazwisko"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Źródło opinii
                </label>
                <input
                  value={form.source}
                  onChange={(event) =>
                    setForm({ ...form, source: event.target.value })
                  }
                  placeholder="Formularz"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Przypisz do lokalizacji (opcjonalnie)
              </label>
              <select
                value={form.locationId}
                onChange={(event) =>
                  setForm({ ...form, locationId: event.target.value })
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
              >
                <option value="">-- Brak lokalizacji --</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.source_type || "google"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Treść opinii
              </label>
              <textarea
                value={form.content}
                onChange={(event) =>
                  setForm({ ...form, content: event.target.value })
                }
                rows={6}
                placeholder="Wpisz treść recenzji..."
                className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Ocena (0% - 100%)
              </label>
              <input
                type="number"
                value={form.rating}
                min={0}
                max={100}
                onChange={(event) =>
                  setForm({ ...form, rating: Number(event.target.value) })
                }
                className="w-32 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition"
            >
              Dodaj recenzję
            </button>

            {status && (
              <p
                className={`text-sm mt-2 ${
                  statusType === "success" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {status}
              </p>
            )}
          </form>
        )}

        {sourceType === "google" && (
          <form onSubmit={handleSubmitReview} className="space-y-5 max-w-2xl">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold mb-2">Autor</label>
                <input
                  value={form.author}
                  onChange={(event) =>
                    setForm({ ...form, author: event.target.value })
                  }
                  placeholder="Imię i nazwisko"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Przypisz do lokalizacji (opcjonalnie)
                </label>
                <select
                  value={form.locationId}
                  onChange={(event) =>
                    setForm({ ...form, locationId: event.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
                >
                  <option value="">-- Brak lokalizacji --</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.source_type || "google"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition"
            >
              Dodaj recenzję
            </button>

            {status && (
              <p
                className={`text-sm mt-2 ${
                  statusType === "success" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {status}
              </p>
            )}
          </form>
        )}
      </section>

      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-2xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700 transition"
        >
          Powrót do dashboardu
        </Link>
      </div>
    </div>
  );
}