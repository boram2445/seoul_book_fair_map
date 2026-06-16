import type { MapExhibitor } from "./types";

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
    ...(exhibitor.categories ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function boothForMap(exhibitor: MapExhibitor) {
  return exhibitor.origBooth || exhibitor.booth;
}

export function getFavoriteKey(exhibitor: MapExhibitor): string {
  return String(exhibitor.no);
}
