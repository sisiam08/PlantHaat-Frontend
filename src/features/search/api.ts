import { apiGet } from "@/lib/api/client";

export interface SuggestionProduct {
  name: string;
  nameBn: string | null;
  slug: string;
  image: string | null;
  minPrice: string | null;
  inStock: boolean;
}

export interface SuggestionCategory {
  name: string;
  nameBn: string | null;
  slug: string;
  imageUrl: string | null;
}

export interface SuggestionShop {
  name: string;
  slug: string;
  logoUrl: string | null;
  district: string | null;
}

export interface SuggestPayload {
  products: SuggestionProduct[];
  categories: SuggestionCategory[];
  shops: SuggestionShop[];
}

export const EMPTY_SUGGESTIONS: SuggestPayload = { products: [], categories: [], shops: [] };

/** Browser-side suggestions fetch through the BFF gateway (abortable). */
export async function fetchSearchSuggestions(
  query: string,
  signal: AbortSignal,
): Promise<SuggestPayload> {
  const { data } = await apiGet<SuggestPayload>("/search/suggest", {
    params: { q: query },
    signal,
  });
  return data;
}
