import { NextResponse } from "next/server";
import { createReview, getReviews } from "@/actions";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const reviews = await getReviews(accessToken);
    return NextResponse.json(reviews, { status: 200 });
  } catch (error) {
    console.error("Błąd pobierania review:", error);
    const message = error instanceof Error ? error.message : "Wystąpił błąd serwera.";
    return NextResponse.json({ error: message }, { status: error instanceof Error && error.message === "Not authenticated" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { author, source, content, rating, accessToken } = body;

    if (!author || !source || !content || !rating || !accessToken) {
      return NextResponse.json({ error: "Brak wymaganych danych lub sesji." }, { status: 400 });
    }

    const review = await createReview({
      author,
      source,
      content,
      rating: Number(rating),
      accessToken,
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("Błąd tworzenia review:", error);
    const message = error instanceof Error ? error.message : "Wystąpił błąd serwera.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
