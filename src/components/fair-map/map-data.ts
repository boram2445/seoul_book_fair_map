import boothData from "@/data/sibf-2026-floor-booths.json";
import exhibitorData from "@/data/sibf-2026-floor-exhibitors.json";
import publisherDetailData from "@/data/sibf-2026-publisher-details.json";

import type { BoothShape, MapExhibitor } from "./types";

type PublisherDetail = {
  boothNumber: string;
  name: string;
  categories: string[];
  homepage: string;
  instagram?: string;
  introduction: string;
};

const instagramLinksByNo: Record<number, Pick<MapExhibitor, "instagramUrl">> = {
  4: {
    instagramUrl: "https://www.instagram.com/ghost__books/",
  },
};

function getInstagramUrl(value?: string) {
  if (!value) return undefined;

  const match = value.match(/https?:\/\/(?:www\.)?instagram\.com\/[^\s]+/i);
  return match?.[0];
}

function getHomepageUrl(value?: string) {
  if (!value || getInstagramUrl(value)) return undefined;

  return value;
}

const publisherDetails = publisherDetailData.details as PublisherDetail[];
const publisherDetailByBoothAndName = new Map(
  publisherDetails.map((detail) => [`${detail.boothNumber}::${detail.name}`, detail])
);

export const exhibitors = (exhibitorData.exhibitors as MapExhibitor[]).map((exhibitor) => {
  const publisherDetail = publisherDetailByBoothAndName.get(`${boothForMap(exhibitor)}::${exhibitor.nameKo}`);
  const homepage = publisherDetail?.homepage;
  const instagram = publisherDetail?.instagram || getInstagramUrl(homepage);

  return {
    ...exhibitor,
    categories: publisherDetail?.categories ?? [],
    introduction: publisherDetail?.introduction || undefined,
    instagramUrl: instagram,
    homepageUrl: getHomepageUrl(homepage),
    ...instagramLinksByNo[exhibitor.no],
  };
});
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

export const exhibitorByFavoriteKey: Map<string, MapExhibitor> = new Map(
  exhibitors.map((ex) => [getFavoriteKey(ex), ex])
);
