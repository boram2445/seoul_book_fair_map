"use client";

import type { ComponentType, ReactNode } from "react";
import { useMemo } from "react";
import {
  CalendarDays,
  Heart,
  Info,
  ListFilter,
  LogIn,
  Map,
  Route,
  Sparkles,
  Ticket,
  Trophy,
} from "lucide-react";

import { BookFairMap } from "@/components/fair-map/book-fair-map";
import { boothForMap, exhibitors, getDisplayName } from "@/components/fair-map/map-data";
import { useFavorites } from "@/components/fair-map/use-favorites";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const tabs = [
  { value: "map", label: "지도", icon: Map },
  { value: "info", label: "행사 정보", icon: Info },
  { value: "events", label: "이벤트", icon: CalendarDays },
  { value: "popular", label: "인기", icon: Trophy },
  { value: "route", label: "내 동선", icon: Route },
];

const eventRows = [
  {
    time: "10:30",
    category: "사인회",
    booth: "B홀",
    title: "작가와 만나는 오전 세션",
  },
  {
    time: "13:00",
    category: "토크",
    booth: "독립출판 구역",
    title: "오늘의 책을 고르는 대화",
  },
  {
    time: "16:20",
    category: "워크숍",
    booth: "아트북 라운지",
    title: "표지 디자인 미니 클래스",
  },
];

const infoRows = [
  { label: "기간", value: "2026.06.24 - 06.28" },
  { label: "장소", value: "코엑스 C홀, D홀" },
  { label: "운영", value: "10:00 - 19:00" },
];

function Panel({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border-b border-border bg-brand-panel">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-brand-yellow">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="truncate text-xl font-black">{title}</h2>
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border bg-white px-4 py-3">
      <p className="text-xs font-black text-brand-muted uppercase">{label}</p>
      <strong className="mt-1 block text-lg font-black">{value}</strong>
    </div>
  );
}

export function FairAppShell() {
  const { favorites } = useFavorites();
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const favoriteItems = useMemo(() => {
    return favorites
      .map((booth) => exhibitors.find((exhibitor) => boothForMap(exhibitor) === booth))
      .filter((exhibitor): exhibitor is (typeof exhibitors)[number] => Boolean(exhibitor));
  }, [favorites]);

  const popularItems = useMemo(() => {
    return [...exhibitors]
      .sort((first, second) => {
        const firstFavorite = favoriteSet.has(boothForMap(first)) ? 1 : 0;
        const secondFavorite = favoriteSet.has(boothForMap(second)) ? 1 : 0;
        return secondFavorite - firstFavorite || first.no - second.no;
      })
      .slice(0, 6);
  }, [favoriteSet]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Tabs defaultValue="map" className="min-h-screen gap-0">
        <header className="sticky top-0 z-50 border-b border-border bg-brand-panel">
          <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold tracking-[0.28em] text-brand-rust uppercase">SIBF 2026</p>
                <h1 className="mt-1 text-2xl font-black tracking-normal">서울국제도서전 맵</h1>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex h-9 items-center gap-2 border border-border bg-brand-yellow px-3 text-sm font-black">
                  <Heart className="h-4 w-4 fill-brand-coral text-brand-coral" />
                  {favorites.length}
                </div>
                <Button type="button" variant="outline" size="sm" className="h-9 border-border bg-white">
                  <LogIn className="h-4 w-4" />
                  로그인
                </Button>
              </div>
            </div>

            <TabsList className="grid !h-12 w-full grid-cols-5 gap-0 overflow-hidden rounded-none border border-border bg-white p-0 lg:w-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;

                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="!h-12 rounded-none border-r border-border px-2 text-xs font-black shadow-none after:hidden last:border-r-0 data-[state=active]:bg-brand-ink data-[state=active]:text-white data-[state=active]:shadow-none sm:min-w-24 sm:text-sm"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </header>

        <TabsContent value="map" className="m-0">
          <BookFairMap />
        </TabsContent>

        <TabsContent value="info" className="m-0 bg-brand-surface">
          <Panel
            title="행사 정보"
            icon={Info}
            action={
              <Button type="button" className="border border-border shadow-brutal-sm">
                <Ticket className="h-4 w-4" />
                티켓
              </Button>
            }
          >
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div className="border border-border bg-brand-green p-5">
                <p className="text-sm font-black text-brand-green-deep">Seoul International Book Fair</p>
                <h3 className="mt-3 text-3xl font-black tracking-normal">책을 따라 이동하는 하루</h3>
                <p className="mt-4 max-w-2xl text-sm font-bold leading-6">
                  부스, 이벤트, 찜한 동선을 한 화면에서 이어보는 서울국제도서전 안내 화면입니다.
                </p>
              </div>
              <div className="grid gap-3">
                {infoRows.map((row) => (
                  <StatBlock key={row.label} label={row.label} value={row.value} />
                ))}
              </div>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="events" className="m-0 bg-brand-surface">
          <Panel title="이벤트" icon={CalendarDays}>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {["전체", "시간", "카테고리", "부스"].map((filter, index) => (
                <button
                  key={filter}
                  type="button"
                  className={cn(
                    "shrink-0 border border-border px-4 py-2 text-sm font-black",
                    index === 0 ? "bg-brand-ink text-white" : "bg-white hover:bg-brand-yellow"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className="grid gap-3">
              {eventRows.map((event) => (
                <article
                  key={`${event.time}-${event.title}`}
                  className="grid gap-3 border border-border bg-white p-4 sm:grid-cols-[88px_120px_minmax(0,1fr)_auto] sm:items-center"
                >
                  <strong className="font-mono text-xl">{event.time}</strong>
                  <span className="w-fit border border-border bg-brand-yellow px-2 py-1 text-xs font-black">
                    {event.category}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-black">{event.title}</h3>
                    <p className="text-sm font-bold text-brand-muted">{event.booth}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="border-border bg-brand-panel">
                    <ListFilter className="h-4 w-4" />
                    보기
                  </Button>
                </article>
              ))}
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="popular" className="m-0 bg-brand-surface">
          <Panel title="인기" icon={Trophy}>
            <div className="grid gap-3 lg:grid-cols-2">
              {popularItems.map((item, index) => {
                const booth = boothForMap(item);
                const isFavorite = favoriteSet.has(booth);

                return (
                  <article key={`${booth}-${item.no}`} className="grid grid-cols-[56px_minmax(0,1fr)_auto] border border-border bg-white">
                    <div className="flex items-center justify-center border-r border-border bg-brand-yellow text-xl font-black">
                      {index + 1}
                    </div>
                    <div className="min-w-0 px-4 py-3">
                      <h3 className="truncate text-base font-black">{getDisplayName(item)}</h3>
                      <p className="text-sm font-bold text-brand-muted">{booth}</p>
                    </div>
                    <div className="flex items-center gap-2 border-l border-border px-3 font-black">
                      <Heart className={cn("h-4 w-4", isFavorite && "fill-brand-coral text-brand-coral")} />
                      {isFavorite ? 1 : 0}
                    </div>
                  </article>
                );
              })}
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="route" className="m-0 bg-brand-surface">
          <Panel
            title="내 동선"
            icon={Route}
            action={
              <Button type="button" variant="outline" className="border-border bg-white">
                <Sparkles className="h-4 w-4" />
                정렬
              </Button>
            }
          >
            {favoriteItems.length ? (
              <ol className="grid gap-3">
                {favoriteItems.map((item, index) => (
                  <li key={`${boothForMap(item)}-${item.no}`} className="grid grid-cols-[48px_minmax(0,1fr)_auto] border border-border bg-white">
                    <div className="flex items-center justify-center border-r border-border bg-brand-green font-black">
                      {index + 1}
                    </div>
                    <div className="min-w-0 px-4 py-3">
                      <h3 className="truncate text-base font-black">{getDisplayName(item)}</h3>
                      <p className="text-sm font-bold text-brand-muted">{boothForMap(item)}</p>
                    </div>
                    <div className="flex items-center border-l border-border px-3">
                      <Heart className="h-4 w-4 fill-brand-coral text-brand-coral" />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="border border-border bg-white p-6">
                <p className="text-lg font-black">찜한 부스가 없습니다.</p>
              </div>
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </main>
  );
}
