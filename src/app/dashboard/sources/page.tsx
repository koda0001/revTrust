"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Location {
  id: string;
  name: string;
  google_maps_url: string;
  created_at: string;
}

interface LocationFormData {
  name: string;
  googleMapsUrl: string;
}

export default function SourcesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [sourceType, setSourceType] = useState("manual");
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);

  // Locations state
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState<LocationFormData>({
    name: "",
    googleMapsUrl: "",
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

  // Fetch locations on mount or when accessToken changes
  useEffect(() => {
    if (accessToken) {
      fetchLocations();
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

  const handleAddLocation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus(null);

    if (!locationForm.name.trim()) {
      setStatus("Nazwa lokalizacji jest wymagana.");
      setStatusType("error");
      return;
    }

    if (!locationForm.googleMapsUrl.trim()) {
      setStatus("Link Google Maps jest wymagany.");
      setStatusType("error");
      return;
    }

    try {
      const url = new URL(locationForm.googleMapsUrl);
      if (!url.hostname.includes("google") && !url.hostname.includes("maps")) {
        throw new Error("Nieprawidłowy URL");
      }
    } catch {
      setStatus("Link musi być prawidłowym adresem Google Maps.");
      setStatusType("error");
      return;
    }

    try {
      const endpoint = editingLocationId ? "/api/locations" : "/api/locations";
      const method = editingLocationId ? "PUT" : "POST";
      const body = editingLocationId
        ? {
            id: editingLocationId,
            name: locationForm.name,
            googleMapsUrl: locationForm.googleMapsUrl,
            accessToken,
          }
        : {
            name: locationForm.name,
            googleMapsUrl: locationForm.googleMapsUrl,
            accessToken,
          };

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Nie udało się dodać lokalizacji");
      }

      setStatus(
        editingLocationId
          ? "Lokalizacja została zaktualizowana."
          : "Lokalizacja została dodana."
      );
      setStatusType("success");
      setLocationForm({ name: "", googleMapsUrl: "" });
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
      googleMapsUrl: location.google_maps_url,
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
    setLocationForm({ name: "", googleMapsUrl: "" });
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
          Zarządzaj lokalizacjami/filialami i dodawaj recenzje ręcznie. Każda recenzja może być przypisana do konkretnej lokalizacji.
        </p>
      </header>

      {/* Location Management Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Moje lokalizacje</h2>
          {!showAddLocation && (
            <button
              onClick={() => setShowAddLocation(true)}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition"
            >
              + Dodaj lokalizację
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
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nazwa lokalizacji *
                </label>
                <input
                  type="text"
                  value={locationForm.name}
                  onChange={(e) =>
                    setLocationForm({ ...locationForm, name: e.target.value })
                  }
                  placeholder="np. Piekarnia - Marszałkowska"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Link Google Maps *
                </label>
                <input
                  type="url"
                  value={locationForm.googleMapsUrl}
                  onChange={(e) =>
                    setLocationForm({
                      ...locationForm,
                      googleMapsUrl: e.target.value,
                    })
                  }
                  placeholder="https://maps.google.com/..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition"
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
              ? "Dodaj pierwszą lokalizację, aby zacząć"
              : "Brak lokalizacji. Kliknij przycisk powyżej, aby dodać."}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {locations.map((location) => (
              <div
                key={location.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/20 hover:border-slate-700 transition"
              >
                <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                  {location.name}
                </h3>
                <a
                  href={location.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 text-sm mb-4 block truncate"
                >
                  Otwórz na mapach
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
            ))}
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
                    {location.name}
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
                      {location.name}
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
