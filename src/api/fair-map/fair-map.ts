import "server-only";

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import type { GetPublisherByExhibitorNoRequest } from "@/lib/types/fair-map/request";
import type {
  GetPublisherByExhibitorNoResponse,
  GetPublishersResponse,
} from "@/lib/types/fair-map/response";
import type { FairMapPublisher } from "@/lib/types/fair-map/type";

const FAIR_MAP_CACHE_REVALIDATE_SECONDS = 60 * 60 * 24;

type PublisherRow = {
  id: string;
  exhibitor_no: number | null;
  booth_number: string;
  original_booth_number: string | null;
  name: string;
  name_en: string | null;
  country_ko: string | null;
  country_en: string | null;
  is_special: boolean;
  categories: string[] | null;
  introduction: string | null;
  homepage: string | null;
  instagram: string | null;
  sort_order: number | null;
  favorite_count: number;
};

const publisherColumns = [
  "id",
  "exhibitor_no",
  "booth_number",
  "original_booth_number",
  "name",
  "name_en",
  "country_ko",
  "country_en",
  "is_special",
  "categories",
  "introduction",
  "homepage",
  "instagram",
  "sort_order",
  "favorite_count",
].join(",");

function createPublicSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

function mapPublisher(row: PublisherRow): FairMapPublisher {
  return {
    id: row.id,
    no: row.exhibitor_no ?? 0,
    booth: row.booth_number,
    origBooth: row.original_booth_number ?? undefined,
    nameKo: row.name,
    nameEn: row.name_en ?? "",
    countryKo: row.country_ko ?? "",
    countryEn: row.country_en ?? "",
    special: row.is_special,
    categories: row.categories ?? [],
    introduction: row.introduction ?? undefined,
    instagramUrl: row.instagram ?? undefined,
    homepageUrl: row.homepage ?? undefined,
    favoriteCount: row.favorite_count ?? 0,
  };
}

async function fetchPublishers(): Promise<GetPublishersResponse> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("publishers")
    .select(publisherColumns)
    .order("sort_order", { ascending: true })
    .returns<PublisherRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data.map(mapPublisher);
}

async function fetchPublisherByExhibitorNo(
  no: number,
): Promise<GetPublisherByExhibitorNoResponse> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("publishers")
    .select(publisherColumns)
    .eq("exhibitor_no", no)
    .maybeSingle()
    .returns<PublisherRow | null>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapPublisher(data) : null;
}

export const GetPublishers = unstable_cache(
  fetchPublishers,
  ["fair-map", "publishers"],
  {
    revalidate: FAIR_MAP_CACHE_REVALIDATE_SECONDS,
    tags: ["fair-map", "publishers"],
  },
);

const getCachedPublisherByExhibitorNo = unstable_cache(
  fetchPublisherByExhibitorNo,
  ["fair-map", "publisher-by-exhibitor-no"],
  {
    revalidate: FAIR_MAP_CACHE_REVALIDATE_SECONDS,
    tags: ["fair-map", "publishers"],
  },
);

export function GetPublisherByExhibitorNo({
  no,
}: GetPublisherByExhibitorNoRequest) {
  return getCachedPublisherByExhibitorNo(no);
}
