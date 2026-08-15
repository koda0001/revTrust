import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_KEY = SERVICE_ROLE_KEY ?? SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL) in environment");
}

if (!SUPABASE_KEY) {
  throw new Error("Missing Supabase key in environment. Set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function getUserFromAccessToken(accessToken: string) {
  if (!accessToken) return null;

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

export default {
  createReview,
  getReviews,
};
