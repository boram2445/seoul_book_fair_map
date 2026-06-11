import boothData from "@/data/sibf-2026-floor-booths.json";
import exhibitorData from "@/data/sibf-2026-floor-exhibitors.json";

import type { BoothShape, MapExhibitor } from "./types";

const exhibitorLinksByNo: Record<number, Pick<MapExhibitor, "instagramUrl" | "websiteUrl">> = {
  4: {
    instagramUrl: "https://www.instagram.com/ghost__books/",
    websiteUrl: "https://www.ghostbooks.kr/",
  },
};

export const exhibitors = (exhibitorData.exhibitors as MapExhibitor[]).map((exhibitor) => ({
  ...exhibitor,
  ...exhibitorLinksByNo[exhibitor.no],
}));
export const shapes = boothData.booths as BoothShape[];

export function getDisplayName(exhibitor: MapExhibitor) {
  return exhibitor.nameKo || exhibitor.nameEn || exhibitor.booth;
}

export function getSearchText(exhibitor: MapExhibitor) {
  return [
    exhibitor.booth,
    exhibitor.origBooth,
    exhibitor.nameKo,
    exhibitor.nameEn,
    exhibitor.countryKo,
    exhibitor.countryEn,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function boothForMap(exhibitor: MapExhibitor) {
  return exhibitor.origBooth || exhibitor.booth;
}
