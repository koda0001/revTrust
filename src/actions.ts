import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_KEY = SERVICE_ROLE_KEY ?? SUPABASE_PUBLISHABLE_KEY;

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("Supabase credentials missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not set.")
} else {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
}

async function getUserFromAccessToken(accessToken: string) {
  if (!accessToken) return null;

  if (!supabaseAdmin) return null;

  try {
    const res = await supabaseAdmin.auth.getUser(accessToken);
    const user = res?.data?.user ?? ((res as any)?.user ?? null);
    return user;
  } catch (err) {
    return null;
  }
}

export async function getReviews() {
  return prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });
}

export async function createReview({ author, source, content, rating, accessToken }: {
  author: string;
  source: string;
  content: string;
  rating: number;
  accessToken: string;
}) {
  const user = await getUserFromAccessToken(accessToken);
  if (!user) throw new Error("Not authenticated");

  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email ?? `${user.id}@unknown`, name: author },
    update: { email: user.email ?? undefined },
  });

  const review = await prisma.review.create({
    data: {
      author,
      source,
      content,
      rating: Number(rating),
      userId: user.id,
    },
  });

  return review;
}

export async function getGoogleReviews() {
  const PLACE_ID = "ChIJS7iQaOY1GUcRY-uQEBR3hkA";
  const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  if (!API_KEY) {
    console.error("Brak klucza GOOGLE_PLACES_API_KEY w .env.local");
    return [];
  }

  try {
    // Zapytanie do oficjalnego API Google Places
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=reviews,rating,user_ratings_total&language=pl&key=${API_KEY}`;

    const res = await fetch(url, {
      // Opcjonalnie: Kesżowanie w Next.js np. na 1 godzinę (3600 sek), żeby nie marnować limitów API
      next: { revalidate: 3600 } 
    });

    const data = await res.json();

    if (data.status !== "OK" || !data.result?.reviews) {
      console.error("Błąd API Google:", data.status, data.error_message);
      return [];
    }

    // Mapujemy opinie na przejrzysty format dla aplikacji
    const formattedReviews = data.result.reviews.map((rev: any) => ({
      author: rev.author_name,
      rating: rev.rating,
      content: rev.text,
      source: "Google",
      authorPhoto: rev.profile_photo_url,
      relativeTime: rev.relative_time_description,
    }));

    return formattedReviews;
  } catch (error) {
    console.error("Błąd podczas pobierania opinii z Google:", error);
    return [];
  }
}

export async function getWeeklyReports() {
  if (!supabaseAdmin) {
    const msg = "Supabase admin client is not configured. Check SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL environment variables.";
    console.error(msg);
    throw new Error(msg);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("weekly_reports")
      .select("*")
      .order("year", { ascending: false })
      .order("week_number", { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  } catch (err) {
    console.error("getWeeklyReports error", err);
    throw err;
  }
}



export default {
  createReview,
  getReviews,
};
