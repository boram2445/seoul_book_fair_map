import boothData from "@/data/sibf-2026-floor-booths.json";
import exhibitorData from "@/data/sibf-2026-floor-exhibitors.json";
import publisherDetailData from "@/data/sibf-2026-publisher-details.json";

import type { BoothShape, MapExhibitor } from "./types";

type PublisherDetail = {
  boothNumber: string;
  name: string;
  categories: string[];
  homepage: string;
  introduction: string;
};

const instagramLinksByNo: Record<number, Pick<MapExhibitor, "instagramUrl">> = {
  4: {
    instagramUrl: "https://www.instagram.com/ghost__books/",
  },
};

const publisherDetails = publisherDetailData.details as PublisherDetail[];
const publisherDetailByBoothAndName = new Map(
  publisherDetails.map((detail) => [`${detail.boothNumber}::${detail.name}`, detail])
);

export const exhibitors = (exhibitorData.exhibitors as MapExhibitor[]).map((exhibitor) => {
  const publisherDetail = publisherDetailByBoothAndName.get(`${boothForMap(exhibitor)}::${exhibitor.nameKo}`);

  return {
    ...exhibitor,
    categories: publisherDetail?.categories ?? [],
    introduction: publisherDetail?.introduction || undefined,
    homepageUrl: publisherDetail?.homepage || undefined,
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
