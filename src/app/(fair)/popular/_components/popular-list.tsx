"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Search, X } from "lucide-react";

import { type BoothEvent } from "@/components/fair-map/booth-events";
import { getFavoriteKey, getSearchText, normalizeSearch } from "@/components/fair-map/map-helpers";
import { useFavorites } from "@/components/fair-map/use-favorites";
import { PublisherCard } from "@/components/fair-app/publisher-card";
import { Input } from "@/components/ui/input";
import type { FairMapPublisher } from "@/lib/types/fair-map/type";
import { cn } from "@/lib/utils";
import { boothForMap } from "@/components/fair-map/map-helpers";

const EVENT_CATEGORIES = ["굿즈", "사인회", "할인/증정", "전시", "신간", "토크/강연"] as const;

interface PopularListProps {
  publishers: FairMapPublisher[];
  eventsByBooth: Record<string, BoothEvent[]>;
}

// ─── 카드 컴포넌트 ─────────────────────────────────────────────────────────────
// memo: isFavorite / index 등 해당 카드에 귀속된 props만 변경될 때 리렌더.
// 찜 토글 시 변경된 카드 1개만 재조정, 나머지 reconcile 스킵.

interface PopularCardProps {
  item: FairMapPublisher;
  index: number;
  isFavorite: boolean;
  events: BoothEvent[];
  eventFilter: string;
  onToggle: (favKey: string) => void;
  onNavigate: (href: string) => void;
}

const PopularCard = memo(function PopularCard({
  item,
  index,
  isFavorite,
  events,
  eventFilter,
  onToggle,
  onNavigate,
}: PopularCardProps) {
  const highlightCategory =
    eventFilter !== "전체" && eventFilter !== "이벤트" ? eventFilter : undefined;

  return (
    <PublisherCard
      exhibitor={item}
      index={index}
      isFavorite={isFavorite}
      events={events}
      onFavoriteToggle={() => onToggle(getFavoriteKey(item))}
      onNavigate={() => onNavigate(`/publishers/${item.no}`)}
      rankTone="ink"
      highlightCategory={highlightCategory}
      desktopAside={
        <p
          className={cn(
            "text-sm font-bold leading-6 text-brand-subtle",
            item.introduction ? "line-clamp-4" : "text-brand-muted",
          )}
        >
          {item.introduction || "아직 소개 정보가 없습니다."}
        </p>
      }
    />
  );
});

// ─── 리스트 컴포넌트 ───────────────────────────────────────────────────────────

export function PopularList({ publishers, eventsByBooth }: PopularListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(() => searchParams.get("q") ?? "");
  const [eventFilter, setEventFilter] = useState(() => searchParams.get("filter") ?? "전체");

  // 검색어 디바운스
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  // 필터·검색 상태를 URL에 반영 (router.back() 복원용)
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (eventFilter !== "전체") params.set("filter", eventFilter);
    const paramStr = params.toString();
    router.replace(paramStr ? `${pathname}?${paramStr}` : pathname, { scroll: false });
  }, [debouncedQuery, eventFilter, pathname, router]);

  const { favorites, toggleFavorite } = useFavorites();
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  // toggleFavorite은 매 렌더 재생성되지만 호출 시 localStorage를 직접 읽어 stale 캡처가 안전.
  // ref 미러로 안정적 콜백을 만들어 PopularCard memo 효력을 유지한다.
  const toggleRef = useRef(toggleFavorite);
  useEffect(() => { toggleRef.current = toggleFavorite; });
  const handleToggle = useCallback((favKey: string) => toggleRef.current(favKey), []);

  const handleNavigate = useCallback((href: string) => router.push(href), [router]);

  const filterCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    map["이벤트"] = publishers.filter((p) => (eventsByBooth[String(p.no)] ?? []).length > 0).length;
    for (const cat of EVENT_CATEGORIES) {
      map[cat] = publishers.filter((p) =>
        (eventsByBooth[String(p.no)] ?? []).some((e) => e.category === cat)
      ).length;
    }
    return map;
  }, [publishers, eventsByBooth]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeSearch(debouncedQuery);

    return [...publishers]
      .filter((item) => {
        if (eventFilter === "이벤트" && (eventsByBooth[String(item.no)] ?? []).length === 0) return false;
        if (eventFilter !== "전체" && eventFilter !== "이벤트" && !(eventsByBooth[String(item.no)] ?? []).some((e) => e.category === eventFilter)) return false;
        if (!normalizedQuery) return true;

        return normalizeSearch(
          [
            getSearchText(item),
            item.introduction,
            item.instagramUrl,
            item.homepageUrl,
          ]
            .filter(Boolean)
            .join(" ")
        ).includes(normalizedQuery);
      })
      .sort((first, second) => {
        const firstHeartCount = first.favoriteCount + (favoriteSet.has(getFavoriteKey(first)) ? 1 : 0);
        const secondHeartCount = second.favoriteCount + (favoriteSet.has(getFavoriteKey(second)) ? 1 : 0);

        return (
          secondHeartCount - firstHeartCount ||
          boothForMap(first).localeCompare(boothForMap(second), "ko") ||
          first.no - second.no
        );
      });
  }, [favoriteSet, publishers, debouncedQuery, eventFilter, eventsByBooth]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <section className="border border-border bg-white p-4">
        <div className="flex items-center gap-2 border border-border bg-brand-panel px-3">
          <Search className="h-4 w-4 shrink-0" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="출판사, 부스, 카테고리 검색"
            className="h-9 border-0 px-0 text-sm font-bold shadow-none focus-visible:ring-0 md:h-11"
          />
          <span className="shrink-0 text-xs font-bold tabular-nums text-brand-muted">
            {filteredItems.length}/{publishers.length}
          </span>
          {query ? (
            <button
              type="button"
              aria-label="검색어 지우기"
              onClick={() => setQuery("")}
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["전체", "이벤트", ...EVENT_CATEGORIES] as const).map((f) => {
            const isEvents = f === "이벤트";
            const isActive = eventFilter === f;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={isActive}
                onClick={() => setEventFilter(f)}
                className={cn(
                  "inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-black transition-colors",
                  isActive
                    ? "border-brand-ink bg-brand-ink text-white"
                    : "border-border bg-brand-panel text-brand-rust hover:bg-brand-yellow"
                )}
              >
                {isEvents && <CalendarDays className="h-3.5 w-3.5" />}
                {f}{filterCountMap[f] !== undefined ? ` (${filterCountMap[f]})` : ""}
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-3">
        {filteredItems.map((item, index) => (
          <PopularCard
            key={`${boothForMap(item)}-${item.no}`}
            item={item}
            index={index}
            isFavorite={favoriteSet.has(getFavoriteKey(item))}
            events={eventsByBooth[String(item.no)] ?? []}
            eventFilter={eventFilter}
            onToggle={handleToggle}
            onNavigate={handleNavigate}
          />
        ))}
      </section>
    </div>
  );
}
