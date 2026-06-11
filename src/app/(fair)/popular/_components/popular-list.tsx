"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ExternalLink, Heart, Instagram, Search } from "lucide-react";

import { getMockHeartCount } from "@/app/(fair)/_lib/publisher-stats";
import { boothForMap, exhibitors, getFavoriteKey, getDisplayName, getSearchText } from "@/components/fair-map/map-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFavorites } from "@/components/fair-map/use-favorites";
import { cn } from "@/lib/utils";

const mockEventRows = [
  {
    time: "10:30",
    category: "사인회",
    title: "작가 사인회",
  },
  {
    time: "13:20",
    category: "토크",
    title: "오늘의 책을 고르는 대화",
  },
  {
    time: "16:00",
    category: "이벤트",
    title: "현장 한정 굿즈 증정",
  },
];

export function PopularList() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { favorites, toggleFavorite } = useFavorites();
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...exhibitors]
      .filter((item) => {
        if (!normalizedQuery) return true;

        return [
          getSearchText(item),
          item.introduction,
          item.instagramUrl,
          item.homepageUrl,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((first, second) => {
        const firstHeartCount = getMockHeartCount(first.no) + (favoriteSet.has(getFavoriteKey(first)) ? 1 : 0);
        const secondHeartCount = getMockHeartCount(second.no) + (favoriteSet.has(getFavoriteKey(second)) ? 1 : 0);

        return (
          secondHeartCount - firstHeartCount ||
          boothForMap(first).localeCompare(boothForMap(second), "ko") ||
          first.no - second.no
        );
      });
  }, [favoriteSet, query]);

  return (
    <div className="grid gap-4">
      <section className="border border-border bg-white p-4">
        <div className="flex items-center gap-2 border border-border bg-brand-panel px-3">
          <Search className="h-4 w-4 shrink-0" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="출판사, 부스, 카테고리 검색"
            className="h-11 border-0 px-0 font-bold shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-black text-brand-muted">
          <span>검색 결과 {filteredItems.length}개</span>
          <span>전체 {exhibitors.length}개</span>
        </div>
      </section>

      <section className="grid gap-3">
        {filteredItems.map((item) => {
          const booth = boothForMap(item);
          const favKey = getFavoriteKey(item);
          const isFavorite = favoriteSet.has(favKey);
          const heartCount = getMockHeartCount(item.no) + (isFavorite ? 1 : 0);
          const categories = item.categories ?? [];
          const publisherHref = `/publishers/${item.no}`;

          return (
            <article
              key={`${booth}-${item.no}`}
              tabIndex={0}
              onClick={() => router.push(publisherHref)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;

                event.preventDefault();
                router.push(publisherHref);
              }}
              className="cursor-pointer border border-border bg-white transition-colors hover:bg-brand-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
            >
              <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-border bg-brand-yellow px-2 py-1 text-xs font-black text-brand-rust">
                      {booth}
                    </span>
                    <span className="inline-flex items-center gap-1 border border-border bg-white px-2 py-1 text-xs font-black text-brand-coral-deep">
                      <Heart className="h-3.5 w-3.5 fill-brand-coral text-brand-coral" />
                      {heartCount}
                    </span>
                    {isFavorite ? (
                      <span className="inline-flex items-center gap-1 border border-border bg-brand-green px-2 py-1 text-xs font-black text-brand-green-ink">
                        <Heart className="h-3.5 w-3.5 fill-brand-coral text-brand-coral" />
                        찜
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 truncate text-lg font-black">{getDisplayName(item)}</h3>
                  {item.nameEn ? <p className="text-sm font-bold text-brand-muted">{item.nameEn}</p> : null}
                  {categories.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[...new Set(categories)].slice(0, 6).map((category) => (
                        <span
                          key={category}
                          className="border border-border/60 bg-brand-panel px-2 py-1 text-xs font-black text-brand-subtle"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "rounded-none border-border font-black",
                      isFavorite
                        ? "bg-brand-coral text-white hover:bg-brand-coral/90 border-brand-coral"
                        : "bg-brand-panel hover:bg-brand-yellow"
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFavorite(favKey);
                    }}
                  >
                    <Heart className={cn("h-4 w-4", isFavorite ? "fill-white text-white" : "text-brand-coral")} />
                    {isFavorite ? "찜 해제" : "찜하기"}
                  </Button>
                  {item.instagramUrl ? (
                    <Button
                      asChild
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-none border-border bg-brand-panel font-black hover:bg-brand-yellow"
                    >
                      <a
                        href={item.instagramUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Instagram className="h-4 w-4" />
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
                      className="rounded-none border-border bg-brand-panel font-black hover:bg-brand-yellow"
                    >
                      <a
                        href={item.homepageUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Homepage
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
                <p
                  className={cn(
                    "text-sm font-bold leading-6 text-brand-subtle",
                    item.introduction ? "line-clamp-4" : "text-brand-muted"
                  )}
                >
                  {item.introduction || "아직 소개 정보가 없습니다."}
                </p>

                <div className="border border-border bg-brand-surface">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-brand-rust">
                      <CalendarDays className="h-4 w-4" />
                      이벤트
                    </span>
                    <span className="text-xs font-black text-brand-muted">{mockEventRows.length}개 예정</span>
                  </div>
                  <ul>
                    {mockEventRows.map((event) => (
                      <li
                        key={`${booth}-${event.time}-${event.title}`}
                        className="grid grid-cols-[4rem_minmax(0,1fr)] gap-2 border-b border-border/20 px-3 py-2 text-sm last:border-b-0"
                      >
                        <span className="font-mono text-xs font-black text-brand-coral-deep">{event.time}</span>
                        <span className="min-w-0">
                          <span className="mr-1 border border-border bg-white px-1.5 py-0.5 text-[11px] font-black">
                            {event.category}
                          </span>
                          <span className="font-bold">{event.title}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
