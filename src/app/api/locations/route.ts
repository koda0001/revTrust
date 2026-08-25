import { NextResponse } from "next/server";
import { getLocations, createLocation, updateLocation, deleteLocation } from "@/actions";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const locations = await getLocations(accessToken);
    return NextResponse.json(locations, { status: 200 });
  } catch (error) {
    console.error("Błąd pobierania lokalizacji:", error);
    const message = error instanceof Error ? error.message : "Wystąpił błąd serwera.";
    return NextResponse.json({ error: message }, { status: error instanceof Error && error.message === "Not authenticated" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, googleMapsUrl, accessToken } = body;

    if (!name || !googleMapsUrl || !accessToken) {
      return NextResponse.json({ error: "Brak wymaganych danych lub sesji." }, { status: 400 });
    }

    const location = await createLocation({
      name,
      googleMapsUrl,
      accessToken,
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    console.error("Błąd tworzenia lokalizacji:", error);
    const message = error instanceof Error ? error.message : "Wystąpił błąd serwera.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, googleMapsUrl, accessToken } = body;

    if (!id || !name || !googleMapsUrl || !accessToken) {
      return NextResponse.json({ error: "Brak wymaganych danych lub sesji." }, { status: 400 });
    }

    const location = await updateLocation({
      id,
      name,
      googleMapsUrl,
      accessToken,
    });

    return NextResponse.json({ location }, { status: 200 });
  } catch (error) {
    console.error("Błąd aktualizacji lokalizacji:", error);
    const message = error instanceof Error ? error.message : "Wystąpił błąd serwera.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id, accessToken } = body;

    if (!id || !accessToken) {
      return NextResponse.json({ error: "Brak wymaganych danych lub sesji." }, { status: 400 });
    }

    await deleteLocation({
      id,
      accessToken,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Błąd usuwania lokalizacji:", error);
    const message = error instanceof Error ? error.message : "Wystąpił błąd serwera.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
