export interface PublicReview {
  id: string;
  author: string;
  source: string;
  content: string;
  rating: number;
  createdAt: string;
}

export interface PublicSourceStat {
  name: string;
  rating: number;
  reviewCount: number;
}

export interface PublicProfileData {
  id: string;
  name: string;
  googleMapsUrl: string;
  locationSource: string | null;
  averageRating: number;
  reviewCount: number;
  sources: PublicSourceStat[];
  reviews: PublicReview[];
}