import "server-only";

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import type { GetPublisherByExhibitorNoRequest } from "@/lib/types/fair-map/request";
import type {
  GetPublisherByExhibitorNoResponse,
  GetPublisherEventsResponse,
  GetPublishersResponse,
} from "@/lib/types/fair-map/response";
import type { FairMapPublisher } from "@/lib/types/fair-map/type";
import { getEventScheduleLabel, type BoothEvent } from "@/components/fair-map/booth-events";

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

export const GetPublishers = unstable_cache(
  fetchPublishers,
  ["fair-map", "publishers"],
  {
    revalidate: FAIR_MAP_CACHE_REVALIDATE_SECONDS,
    tags: ["fair-map", "publishers"],
  },
);

export async function GetPublisherByExhibitorNo({
  no,
}: GetPublisherByExhibitorNoRequest): Promise<GetPublisherByExhibitorNoResponse> {
  const publishers = await GetPublishers();
  return publishers.find((p) => p.no === no) ?? null;
}

type PublisherEventRow = {
  title: string;
  content: string;
  event_date: string | null;
  start_at: string | null;
  end_at: string | null;
  category: string | null;
  instagram_url: string | null;
  image_url: string | null;
  publishers: {
    booth_number: string;
    original_booth_number: string | null;
    name: string;
    exhibitor_no: number;
  } | null;
};

function mapPublisherEvent(row: PublisherEventRow): { boothKey: string; event: BoothEvent } | null {
  const publisher = row.publishers;
  if (!publisher) return null;

  // exhibitor_no 기준으로 키잉 — booth_number 공유 출판사(예: 민음사/황금가지)가 이벤트를 섞지 않도록
  const boothKey = String(publisher.exhibitor_no);

  let period: string | undefined;
  if (row.event_date) {
    const d = new Date(row.event_date);
    period = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  const event: BoothEvent = {
    title: row.title,
    content: row.content,
    category: row.category ?? "소개",
    sourceName: publisher.name,
    instagramUrl: row.instagram_url ?? undefined,
    imageUrl: row.image_url ?? undefined,
    startAt: row.start_at ?? undefined,
    endAt: row.end_at ?? undefined,
    period,
  };

  return { boothKey, event };
}

async function fetchPublisherEvents(): Promise<GetPublisherEventsResponse> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("publisher_events")
    .select(
      `title, content, event_date, start_at, end_at, category, instagram_url, image_url,
       publishers!publisher_events_publisher_id_fkey (
         booth_number, original_booth_number, name, exhibitor_no
       )`,
    )
    .eq("status", "published")
    .returns<PublisherEventRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const result: GetPublisherEventsResponse = {};
  for (const row of data) {
    const mapped = mapPublisherEvent(row);
    if (!mapped) continue;
    const { boothKey, event } = mapped;
    result[boothKey] = result[boothKey] ?? [];
    result[boothKey].push(event);
  }

  for (const events of Object.values(result)) {
    events.sort((a, b) => {
      if (a.startAt && b.startAt) {
        return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
      }
      if (a.startAt) return -1;
      if (b.startAt) return 1;
      return getEventScheduleLabel(a).localeCompare(getEventScheduleLabel(b), "ko");
    });
  }

  return result;
}

export const GetPublisherEvents = unstable_cache(
  fetchPublisherEvents,
  ["fair-map", "publisher-events"],
  {
    revalidate: FAIR_MAP_CACHE_REVALIDATE_SECONDS,
    tags: ["fair-map", "publisher-events"],
  },
);
