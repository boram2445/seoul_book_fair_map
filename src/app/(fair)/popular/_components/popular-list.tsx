"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronRight, ExternalLink, Heart, Instagram, Search, X } from "lucide-react";

import { type BoothEvent, getEventScheduleLabel } from "@/components/fair-map/booth-events";
import { CollapsibleEventList } from "@/components/fair-map/collapsible-event-list";
import { boothForMap, getFavoriteKey, getDisplayName, getSearchText, normalizeSearch } from "@/components/fair-map/map-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFavorites } from "@/components/fair-map/use-favorites";
import type { FairMapPublisher } from "@/lib/types/fair-map/type";
import { cn } from "@/lib/utils";

const EVENT_CATEGORIES = ["굿즈", "사인회", "할인/증정", "전시", "신간", "토크/강연"] as const;

interface PopularListProps {
  publishers: FairMapPublisher[];
  eventsByBooth: Record<string, BoothEvent[]>;
}

// ─── 카드 컴포넌트 ─────────────────────────────────────────────────────────────
// 모듈 레벨 memo: isFavorite / index 등 해당 카드에 귀속된 props만 변경될 때 리렌더.
// 찜 토글 시 변경된 카드 1개만 조정, 나머지 441개 reconcile 스킵.

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
  const booth = boothForMap(item);
  const favKey = getFavoriteKey(item);
  const heartCount = item.favoriteCount + (isFavorite ? 1 : 0);
  const categories = item.categories ?? [];
  const publisherHref = `/publishers/${item.no}`;
  const isCategoryFilter = eventFilter !== "전체" && eventFilter !== "이벤트";

  return (
    <article
      tabIndex={0}
      onClick={() => onNavigate(publisherHref)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onNavigate(publisherHref);
      }}
      className="relative cursor-pointer border border-border bg-white transition-colors hover:bg-brand-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
    >
      {/* 상단 우측 액션 행: 링크 버튼(md) + 하트 */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        {item.instagramUrl ? (
          <Button
            asChild
            type="button"
            variant="outline"
            size="sm"
            className="hidden md:inline-flex h-9 rounded-none border-border bg-white px-2.5 text-[11px] font-black hover:bg-brand-yellow"
          >
            <a
              href={item.instagramUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              <Instagram className="h-3.5 w-3.5" />
              Instagram
            </a>
          </Button>
        ) : null}
        {item.homepageUrl ? (
          <Button
            asChild
            type="button"
            variant="outline"
            size="sm"
            className="hidden md:inline-flex h-9 rounded-none border-border bg-white px-2.5 text-[11px] font-black hover:bg-brand-yellow"
          >
            <a
              href={item.homepageUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Homepage
            </a>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={isFavorite ? "찜 해제" : "찜하기"}
          className={cn(
            "size-8 rounded-none border-border shadow-brutal-sm md:size-9",
            isFavorite
              ? "border-brand-coral bg-brand-coral text-white hover:bg-brand-coral/90 hover:text-white"
              : "bg-brand-panel hover:bg-brand-yellow"
          )}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(favKey);
          }}
        >
          <Heart className={cn("h-3.5 w-3.5 md:h-4 md:w-4", isFavorite ? "fill-white text-white" : "text-brand-coral")} />
        </Button>
      </div>

      <div className="border-b border-border p-4 pr-14">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-border bg-brand-ink px-2 py-1 text-xs font-black text-white">
              {index + 1}
            </span>
            <span className="border border-border bg-brand-yellow px-2 py-1 text-xs font-black text-brand-rust">
              {booth}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-black text-brand-coral-deep">
              <Heart className="h-3.5 w-3.5 fill-brand-coral text-brand-coral" />
              {heartCount}
            </span>
          </div>
          <div className="mt-3 flex min-w-0 items-center gap-2">
            <h3 className="min-w-0 truncate text-base font-black md:text-lg">{getDisplayName(item)}</h3>
            <Link
              href={publisherHref}
              onClick={(e) => e.stopPropagation()}
              className="flex shrink-0 items-center justify-center text-brand-muted hover:text-brand-ink"
              aria-label="출판사 상세 보기"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {(item.nameEn || categories.length) ? (
            <p className="mt-1.5 truncate text-xs font-bold text-brand-muted">
              {[
                item.nameEn,
                [...new Set(categories)].slice(0, 6).join(", ") || null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </div>
        {/* 모바일 전용 링크 버튼 */}
        {(item.instagramUrl || item.homepageUrl) ? (
          <div className="mt-3 flex flex-wrap gap-2 md:hidden">
            {item.instagramUrl ? (
              <Button
                asChild
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-none border-border bg-white px-2 text-[10px] font-black hover:bg-brand-yellow"
              >
                <a
                  href={item.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Instagram className="h-3 w-3" />
                  Instagram
                </a>
              </Button>
            ) : null}
            {item.homepageUrl ? (
              <Button
                asChild
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-none border-border bg-white px-2 text-[10px] font-black hover:bg-brand-yellow"
              >
                <a
                  href={item.homepageUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  Homepage
                </a>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 모바일: 이벤트 토글 */}
      <CollapsibleEventList events={events} />
      {/* 웹: 소개(좌) + 이벤트 박스(우, 이벤트 있을 때만) */}
      <div className={cn("hidden border-t border-border p-4 md:grid md:gap-3", events.length > 0 && "lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]")}>
        <p className={cn("text-sm font-bold leading-6 text-brand-subtle", item.introduction ? "line-clamp-4" : "text-brand-muted")}>
          {item.introduction || "아직 소개 정보가 없습니다."}
        </p>
        {events.length > 0 ? (
          <div className="border border-border bg-brand-surface">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-brand-rust">
                <CalendarDays className="h-4 w-4" />
                이벤트
              </span>
              <span className="text-xs font-black text-brand-muted">{events.length}개</span>
            </div>
            <ul>
              {events.map((event) => (
                <li
                  key={`${getEventScheduleLabel(event)}-${event.title}`}
                  className={cn(
                    "grid items-baseline gap-2 border-b border-border/20 px-3 py-2 text-sm last:border-b-0",
                    event.startAt
                      ? "grid-cols-[8.25rem_minmax(0,1fr)]"
                      : "grid-cols-[5.5rem_minmax(0,1fr)]",
                  )}
                >
                  <span className="font-mono text-xs font-black whitespace-nowrap text-brand-coral-deep">{getEventScheduleLabel(event)}</span>
                  <span className="min-w-0">
                    <span className={cn("mr-1 border px-1.5 py-0.5 text-[11px] font-black", isCategoryFilter && event.category === eventFilter ? "border-brand-ink bg-brand-yellow" : "border-border bg-white")}>
                      {event.category}
                    </span>
                    <span className="font-bold">{event.title}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
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
