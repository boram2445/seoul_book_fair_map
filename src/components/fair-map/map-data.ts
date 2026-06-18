import boothData from "@/data/sibf-2026-floor-booths.json";
import exhibitorData from "@/data/sibf-2026-floor-exhibitors.json";

import type { BoothShape, MapExhibitor } from "./types";
import { getFavoriteKey } from "./map-helpers";

export { getDisplayName, getSearchText, normalizeSearch, boothForMap, getFavoriteKey } from "./map-helpers";

// Enriched fields (categories / introduction / instagramUrl / homepageUrl) are
// supplied at runtime by Supabase (GetPublishers / GetPublisherByExhibitorNo)
// and injected as props by server components. The static publisher-details JSON
// is no longer needed here.
export const exhibitors = exhibitorData.exhibitors as MapExhibitor[];
export const shapes = boothData.booths as BoothShape[];

export const exhibitorByFavoriteKey: Map<string, MapExhibitor> = new Map(
  exhibitors.map((ex) => [getFavoriteKey(ex), ex])
);
