export interface Source {
  id: string;
  name: string;
  slug?: string;
  type?: string;
  created_at?: string;
}

export interface Location {
  id: string;
  name: string;
  source_id?: string;
  source?: string;
  location_url: string;
  created_at: string;
  is_active: boolean;
}

export interface LocationFormData {
  name: string;
  sourceId: string;
  url: string;
}

export interface ReviewFormData {
  author: string;
  source: string;
  content: string;
  rating: number;
  locationId: string;
}

export type StatusType = "success" | "error" | null;
