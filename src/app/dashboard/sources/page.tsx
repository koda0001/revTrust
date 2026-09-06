"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { LocationForm } from "@/components/sources/LocationForm";
import { LocationList } from "@/components/sources/LocationList";
import { ReviewTestForm } from "@/components/sources/ReviewTestForm";
import type {
  Location,
  LocationFormData,
  ReviewFormData,
  Source,
  StatusType,
} from "@/components/sources/types";

const emptyLocationForm: LocationFormData = { name: "", sourceId: "", url: "" };
const emptyReviewForm: ReviewFormData = {
  author: "",
  source: "Formularz",
  content: "",
  rating: 5,
  locationId: "",
};

export default function SourcesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [sourceType, setSourceType] = useState("manual");
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<StatusType>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState<LocationFormData>(emptyLocationForm);
  const [reviewForm, setReviewForm] = useState<ReviewFormData>(emptyReviewForm);

  useEffect(() => {
    const checkUser = async () => {
      const session = await supabase.auth.getSession();
      const currentSession = session.data?.session;

      if (!currentSession?.user) {
        router.push("/login");
      } else {
        setUser(currentSession.user);
        setAccessToken(currentSession.access_token);
      }

      setLoading(false);
    };

    checkUser();
  }, [router]);

  const fetchLocations = useCallback(async () => {
    if (!accessToken) return;

    setLocationsLoading(true);
    try {
      const response = await fetch("/api/locations", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) throw new Error("Nie udało się pobrać lokalizacji");
      setLocations(await response.json());
    } catch (error) {
      console.error("Błąd pobierania lokalizacji:", error);
    } finally {
      setLocationsLoading(false);
    }
  }, [accessToken]);

  const fetchSources = useCallback(async () => {
    if (!accessToken) return;

    setSourcesLoading(true);
    try {
      const response = await fetch("/api/sources", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) throw new Error("Nie udało się pobrać źródeł");
      setSources(await response.json());
    } catch (error) {
      console.error("Błąd pobierania źródeł:", error);
    } finally {
      setSourcesLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;

    const timeoutId = window.setTimeout(() => {
      void fetchLocations();
      void fetchSources();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [accessToken, fetchLocations, fetchSources]);

  const handleSaveLocation = async (data: LocationFormData) => {
    setStatus(null);
    try {
      const response = await fetch("/api/locations", {
        method: editingLocationId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingLocationId && { id: editingLocationId }),
          name: data.name,
          sourceId: data.sourceId,
          googleMapsUrl: data.url,
          accessToken,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Nie udało się zapisać lokalizacji");
      }

      setStatus(editingLocationId ? "Lokalizacja została zaktualizowana." : "Lokalizacja została dodana.");
      setStatusType("success");
      setLocationForm(emptyLocationForm);
      setShowAddLocation(false);
      setEditingLocationId(null);
      await fetchLocations();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Błąd serwera");
      setStatusType("error");
    }
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocationId(location.id);
    setLocationForm({
      name: location.name,
      sourceId: location.source_id || "",
      url: location.google_maps_url,
    });
    setShowAddLocation(true);
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę lokalizację?")) return;

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
      setStatus(error instanceof Error ? error.message : "Błąd serwera");
      setStatusType("error");
    }
  };

  const handleCancelLocation = () => {
    setShowAddLocation(false);
    setEditingLocationId(null);
    setLocationForm(emptyLocationForm);
    setStatus(null);
  };

  const handleSubmitReview = async (event: FormEvent<HTMLFormElement>) => {
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: reviewForm.author || user.email || "Anonim",
          source: reviewForm.source,
          content: reviewForm.content,
          rating: reviewForm.rating,
          locationId: reviewForm.locationId || null,
          accessToken,
        }),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Nie udało się dodać recenzji.");
      setStatus("Recenzja została dodana do bazy danych.");
      setStatusType("success");
      setReviewForm(emptyReviewForm);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Błąd serwera");
      setStatusType("error");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Ładowanie...</div>;
  }

  return (
    <div className="space-y-8">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Źródła i lokalizacje</h1>
        <p className="text-slate-400 mt-2 max-w-2xl">
          Zarządzaj lokalizacjami/filiami oraz wybieraj ich źródła (Google, Facebook itp.). Każda recenzja może być przypisana do konkretnej lokalizacji.
        </p>
      </header>

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

        {showAddLocation && (
          <LocationForm
            formData={locationForm}
            sources={sources}
            sourcesLoading={sourcesLoading}
            editingLocationId={editingLocationId}
            status={status}
            statusType={statusType}
            onChange={setLocationForm}
            onSubmit={handleSaveLocation}
            onError={(message) => {
              setStatus(message);
              setStatusType("error");
            }}
            onCancel={handleCancelLocation}
          />
        )}

        <LocationList
          locations={locations}
          sources={sources}
          loading={locationsLoading}
          showAddLocation={showAddLocation}
          onEdit={handleEditLocation}
          onDelete={handleDeleteLocation}
        />
      </section>

      <ReviewTestForm
        sourceType={sourceType}
        formData={reviewForm}
        locations={locations}
        sources={sources}
        status={status}
        statusType={statusType}
        onSourceTypeChange={setSourceType}
        onChange={setReviewForm}
        onSubmit={handleSubmitReview}
      />

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
