import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import PublicProfile from "@/components/public/PublicProfile";
import type { PublicProfileData } from "@/components/public/types";
import { prisma } from "@/lib/prisma";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const getPublicProfile = cache(async (slug: string): Promise<PublicProfileData | null> => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let locationId: string | undefined;

  if (uuidPattern.test(slug)) {
    locationId = slug;
  } else {
    const embeddedId = slug.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0];
    if (embeddedId) {
      locationId = embeddedId;
    } else {
      const activeLocations = await prisma.location.findMany({
        where: { is_active: { not: false } },
        select: { id: true, name: true },
      });
      const matchingLocations = activeLocations.filter((location) => slug === slugify(location.name));

      if (matchingLocations.length === 1) {
        locationId = matchingLocations[0].id;
      }
    }
  }

  if (!locationId) return null;

  const location = await prisma.location.findFirst({
    where: { id: locationId, is_active: { not: false } },
    include: {
      reviews: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!location) return null;

  const sourceMap = new Map<string, { totalRating: number; reviewCount: number }>();
  for (const review of location.reviews) {
    const sourceName = review.source.trim() || "Inne źródło";
    const current = sourceMap.get(sourceName) ?? { totalRating: 0, reviewCount: 0 };
    current.totalRating += review.rating;
    current.reviewCount += 1;
    sourceMap.set(sourceName, current);
  }

  if (location.source?.trim() && !sourceMap.has(location.source.trim())) {
    sourceMap.set(location.source.trim(), { totalRating: 0, reviewCount: 0 });
  }

  const reviewCount = location.reviews.length;
  const totalRating = location.reviews.reduce((total, review) => total + review.rating, 0);

  return {
    id: location.id,
    name: location.name,
    googleMapsUrl: location.location_url,
    locationSource: location.source,
    averageRating: reviewCount ? totalRating / reviewCount : 0,
    reviewCount,
    sources: Array.from(sourceMap, ([name, stats]) => ({
      name,
      rating: stats.reviewCount ? stats.totalRating / stats.reviewCount : 0,
      reviewCount: stats.reviewCount,
    })).sort((first, second) => second.reviewCount - first.reviewCount || first.name.localeCompare(second.name)),
    reviews: location.reviews.map((review) => ({
      id: review.id,
      author: review.author,
      source: review.source,
      content: review.content,
      rating: review.rating,
      createdAt: review.createdAt.toISOString(),
    })),
  };
});

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicProfile(slug);

  if (!profile) {
    return {
      title: "Firma nie znaleziona | RevTrust",
      robots: { index: false, follow: false },
    };
  }

  const description = `${profile.name}: ocena ${profile.averageRating.toFixed(1)} na 100 na podstawie ${profile.reviewCount} opinii z ${profile.sources.length} źródeł.`;
  return {
    title: `${profile.name} - Opinie i Ocena Zagregowana`,
    description,
    openGraph: {
      title: `${profile.name} - Opinie i Ocena Zagregowana`,
      description,
      type: "website",
    },
  };
}

export default async function PublicBusinessPage({ params }: RouteProps) {
  const { slug } = await params;
  const profile = await getPublicProfile(slug);

  if (!profile) notFound();

  return <PublicProfile profile={profile} />;
}