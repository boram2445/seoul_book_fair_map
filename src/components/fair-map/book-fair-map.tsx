"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  ExternalLink,
  Heart,
  Instagram,
  LocateFixed,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Star,
  X,
} from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { boothForMap, exhibitors, getDisplayName, getSearchText, shapes } from "./map-data";
import { ExportFavoritesButton } from "./favorites-pdf/index";
import type { MapExhibitor } from "./types";
import { useFavorites } from "./use-favorites";

const MAP_WIDTH = 3230;
const MAP_HEIGHT = 3650;
const MIN_SCALE = 0.16;
const MAX_SCALE = 2.4;

type BoothEvent = {
  time?: string;
  period?: string;
  category: string;
  title: string;
  content: string;
  sourceName: string;
  instagramUrl?: string;
  imageUrl?: string;
};

function getBoothEvents(booth: string): BoothEvent[] {
  if (booth === "A1703") {
    return [
      {
        period: "06.01-06.14",
        category: "댓글이벤트",
        title: "[#서울국제도서전] 티켓 증정 댓글이벤트",
        content: `올해 예스24 부스 컨셉은 YES24 BASE CAMP입니다.

예스24 부스 방문 전, 꿀팁 3가지 확인하고 서울국제도서전 티켓 받아가세요. 지금 댓글로 참여하세요.

참여 방법
1. 예스24(@yes24_official) 팔로우
2. 도서전 함께 가고 싶은 친구 태그
3. 예스24 부스 방문의 기대감을 이모지로 댓글 작성

이벤트 정보
참여 기간: 2026년 6월 1일 ~ 6월 14일
당첨 인원: 30명
당첨 경품: 서울국제도서전 티켓 1인 1매 제공
당첨자 발표: 6월 15일
초대권 발송: 6월 19일, 카카오톡 알림톡 발송

#예스24 #예스24베이스캠프 #리딩런`,
        sourceName: "YES24 Instagram",
        instagramUrl: "https://www.instagram.com/yes24_official/",
      },
    ];
  }

  return [
    {
      time: "10:30-11:00",
      category: "사인회",
      title: `${booth} 작가 사인회`,
      content: "부스에서 신간 구매자를 대상으로 진행되는 현장 사인회입니다. 대기 상황에 따라 조기 마감될 수 있습니다.",
      sourceName: "Instagram",
      instagramUrl: "https://www.instagram.com/ghost__books/",
    },
    {
      time: "13:20-14:00",
      category: "토크",
      title: "오늘의 책을 고르는 대화",
      content: "출판사가 고른 대표 도서와 제작 이야기를 짧게 나누는 미니 토크입니다.",
      sourceName: "Instagram",
      instagramUrl: "https://www.instagram.com/ghost__books/",
    },
    {
      time: "16:00-16:30",
      category: "이벤트",
      title: "현장 한정 굿즈 증정",
      content: "부스 방문 및 SNS 팔로우 인증 시 한정 수량 굿즈를 증정합니다.",
      sourceName: "Instagram",
      instagramUrl: "https://www.instagram.com/ghost__books/",
    },
  ] satisfies BoothEvent[];
}

function getEventScheduleLabel(event: BoothEvent) {
  return event.period ?? event.time ?? "상시";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function BookFairMap() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [selectedNo, setSelectedNo] = useState<number>(4);
  const [transform, setTransform] = useState({ scale: 0.28, x: 56, y: 18 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredBooth, setHoveredBooth] = useState("");
  const [isEventPanelOpen, setIsEventPanelOpen] = useState(false);
  const [isIntroductionExpanded, setIsIntroductionExpanded] = useState(false);
  const { favorites, toggleFavorite } = useFavorites();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    pointerId: 0,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const shapesByBooth = useMemo(() => {
    return new Map(shapes.map((shape) => [shape.boothNumber, shape]));
  }, []);

  const exhibitorsByBooth = useMemo(() => {
    return exhibitors.reduce<Record<string, MapExhibitor[]>>((acc, exhibitor) => {
      const booth = exhibitor.origBooth || exhibitor.booth;
      acc[booth] = acc[booth] ?? [];
      acc[booth].push(exhibitor);
      return acc;
    }, {});
  }, []);

  const selected = exhibitors.find((exhibitor) => exhibitor.no === selectedNo) ?? exhibitors[0];
  const selectedBooth = selected ? boothForMap(selected) : "";
  const selectedShape = selected ? shapesByBooth.get(selectedBooth) : undefined;
  const selectedBoothEvents = selectedBooth ? getBoothEvents(selectedBooth) : [];
  const categoryOptions = useMemo(() => {
    const categoryCounts = exhibitors.reduce<Record<string, number>>((acc, exhibitor) => {
      for (const category of exhibitor.categories ?? []) {
        acc[category] = (acc[category] ?? 0) + 1;
      }
      return acc;
    }, {});

    return [
      "전체",
      ...Object.entries(categoryCounts)
        .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0], "ko"))
        .slice(0, 10)
        .map(([category]) => category),
    ];
  }, []);

  const filteredExhibitors = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return exhibitors.filter((exhibitor) => {
      const matchesQuery = normalized ? getSearchText(exhibitor).includes(normalized) : true;
      const matchesCategory =
        selectedCategory === "전체" ? true : (exhibitor.categories ?? []).includes(selectedCategory);
      return matchesQuery && matchesCategory;
    });
  }, [query, selectedCategory]);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const favoriteItems = useMemo(() => {
    return favorites
      .map((booth) => exhibitorsByBooth[booth]?.[0])
      .filter((exhibitor): exhibitor is MapExhibitor => Boolean(exhibitor));
  }, [exhibitorsByBooth, favorites]);
  const activeMapLabels = shapes.flatMap((shape) => {
    const boothItems = exhibitorsByBooth[shape.boothNumber] ?? [];
    if (!boothItems.length) return [];

    const isSelected = shape.boothNumber === selectedBooth;
    const isFavorite = favoriteSet.has(shape.boothNumber);
    const isHovered = hoveredBooth === shape.boothNumber;
    if (!isSelected && !isFavorite && !isHovered) return [];

    const primaryName = getDisplayName(boothItems[0]);
    const label = boothItems.length > 1 ? `${primaryName} 외 ${boothItems.length - 1}` : primaryName;

    return [
      {
        boothNumber: shape.boothNumber,
        label,
        shape,
        isSelected,
        isFavorite,
      },
    ];
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function handleNativeWheel(event: WheelEvent) {
      event.preventDefault();
      const target = event.currentTarget;
      if (!(target instanceof HTMLElement)) return;

      const rect = target.getBoundingClientRect();
      const anchorX = event.clientX - rect.left;
      const anchorY = event.clientY - rect.top;
      const zoomFactor = event.deltaY > 0 ? 0.88 : 1.14;

      setTransform((current) => {
        const nextScale = clamp(current.scale * zoomFactor, MIN_SCALE, MAX_SCALE);
        const worldX = (anchorX - current.x) / current.scale;
        const worldY = (anchorY - current.y) / current.scale;

        return {
          scale: nextScale,
          x: anchorX - worldX * nextScale,
          y: anchorY - worldY * nextScale,
        };
      });
    }

    viewport.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      viewport.removeEventListener("wheel", handleNativeWheel);
    };
  }, []);

  function centerBooth(booth: string, nextScale?: number) {
    const shape = shapesByBooth.get(booth);
    const viewport = viewportRef.current;
    if (!shape || !viewport) return;

    const rect = viewport.getBoundingClientRect();
    const scale = nextScale ?? Math.max(transform.scale, 0.55);
    const centerX = shape.x + shape.width / 2;
    const centerY = shape.y + shape.height / 2;

    setTransform({
      scale,
      x: rect.width / 2 - centerX * scale,
      y: rect.height / 2 - centerY * scale,
    });
  }

  function selectExhibitor(exhibitor: MapExhibitor) {
    setSelectedNo(exhibitor.no);
    setIsIntroductionExpanded(false);
    centerBooth(boothForMap(exhibitor));
  }

  function zoomBy(delta: number) {
    const viewport = viewportRef.current;
    const rect = viewport?.getBoundingClientRect();
    const anchorX = rect ? rect.width / 2 : 0;
    const anchorY = rect ? rect.height / 2 : 0;

    setTransform((current) => {
      const nextScale = clamp(current.scale * delta, MIN_SCALE, MAX_SCALE);
      const worldX = (anchorX - current.x) / current.scale;
      const worldY = (anchorY - current.y) / current.scale;

      return {
        scale: nextScale,
        x: anchorX - worldX * nextScale,
        y: anchorY - worldY * nextScale,
      };
    });
  }

  function resetMap() {
    setTransform({ scale: 0.28, x: 56, y: 18 });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
    };
    setIsDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || dragRef.current.pointerId !== event.pointerId) return;

    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;

    setTransform((current) => ({
      ...current,
      x: dragRef.current.originX + dx,
      y: dragRef.current.originY + dy,
    }));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current.pointerId === event.pointerId) {
      setIsDragging(false);
    }
  }

  return (
    <div className="h-full min-h-[calc(100vh-125px)] bg-background text-foreground lg:min-h-[calc(100vh-81px)]">
      <section className="grid h-full min-h-[calc(100vh-125px)] grid-cols-1 lg:min-h-[calc(100vh-81px)] lg:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-border bg-brand-panel lg:h-[calc(100vh-81px)] lg:border-r lg:border-b-0">
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-2 border border-border bg-white px-3">
              <Search className="h-4 w-4 shrink-0" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="출판사, 부스, 국가 검색"
                className="h-11 border-0 px-0 shadow-none focus-visible:ring-0"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="검색어 지우기"
                  onClick={() => setQuery("")}
                  className="inline-flex h-7 w-7 items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-bold text-brand-muted">
              <span>표시 {filteredExhibitors.length}개</span>
              <span>전체 {exhibitors.length}개</span>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {categoryOptions.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "shrink-0 border border-border px-3 py-1.5 text-xs font-black",
                    selectedCategory === category ? "bg-brand-ink text-white" : "bg-white hover:bg-brand-yellow"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[40vh] min-h-[230px] flex-1 overflow-y-auto border-b border-border p-3 lg:max-h-none lg:min-h-0">
            <ul className="space-y-1">
              {filteredExhibitors.map((exhibitor) => {
                const booth = boothForMap(exhibitor);
                const isSelected = exhibitor.no === selected?.no;
                const isFavorite = favoriteSet.has(booth);

                return (
                  <li key={exhibitor.no}>
                    <button
                      type="button"
                      onClick={() => selectExhibitor(exhibitor)}
                      className={cn(
                        "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left transition",
                        isSelected
                          ? "bg-brand-ink text-white"
                          : "hover:bg-brand-hover focus-visible:bg-brand-hover"
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-extrabold">
                          {getDisplayName(exhibitor)}
                        </span>
                        <span
                          className={cn(
                            "block truncate text-xs",
                            isSelected ? "text-white/70" : "text-brand-muted"
                          )}
                        >
                          {exhibitor.nameEn || exhibitor.countryEn || "Seoul International Book Fair"}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-2">
                        {isFavorite ? <Heart className="h-4 w-4 fill-brand-coral text-brand-coral" /> : null}
                        <span
                          className={cn(
                            "min-w-16 border px-2 py-1 text-center text-xs font-black",
                            isSelected ? "border-white/40" : "border-border"
                          )}
                        >
                          {booth}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selected ? (
            <div className="bg-brand-green p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="inline-flex border border-border bg-brand-ink px-3 py-1 text-sm font-black text-white">
                    {selectedBooth}
                  </p>
                  <h2 className="mt-3 text-xl font-black">{getDisplayName(selected)}</h2>
                  {selected.nameEn ? <p className="text-sm font-bold text-brand-green-deep">{selected.nameEn}</p> : null}
                  {selected.categories?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selected.categories.slice(0, 5).map((category) => (
                        <span
                          key={category}
                          className="border border-border/60 bg-brand-panel px-1.5 py-0.5 text-[11px] font-black text-brand-subtle"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {selected.instagramUrl || selected.homepageUrl ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {selected.instagramUrl ? (
                        <Button
                          asChild
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 rounded-none border-border bg-white px-2 text-[11px] font-black hover:bg-brand-yellow [&_svg:not([class*='size-'])]:size-3.5"
                        >
                          <a href={selected.instagramUrl} target="_blank" rel="noreferrer">
                            <Instagram />
                            Instagram
                          </a>
                        </Button>
                      ) : null}
                      {selected.homepageUrl ? (
                        <Button
                          asChild
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 rounded-none border-border bg-white px-2 text-[11px] font-black hover:bg-brand-yellow [&_svg:not([class*='size-'])]:size-3.5"
                        >
                          <a href={selected.homepageUrl} target="_blank" rel="noreferrer">
                            <ExternalLink />
                            Homepage
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => toggleFavorite(selectedBooth)}
                    aria-label="부스 찜하기"
                    className="border-border bg-white hover:bg-brand-yellow"
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4",
                        favoriteSet.has(selectedBooth) && "fill-brand-coral text-brand-coral"
                      )}
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEventPanelOpen(true)}
                    aria-label="출판사 상세 패널 열기"
                    className="rounded-none border border-border bg-brand-yellow hover:bg-white"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 border border-border bg-white">
                <div className="border-b border-border px-3 py-2">
                  <p className="text-xs font-black text-brand-muted">
                    이벤트 <span className="font-bold">({selectedBoothEvents.length}개 예정)</span>
                  </p>
                </div>
                <ul>
                  {selectedBoothEvents.slice(0, 3).map((event) => (
                    <li
                      key={`${getEventScheduleLabel(event)}-${event.title}`}
                      className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-3 border-b border-border/20 px-3 py-2 text-sm leading-4 last:border-b-0"
                    >
                      <span className="font-mono text-xs leading-4 font-black text-brand-coral-deep">
                        {getEventScheduleLabel(event)}
                      </span>
                      <span className="truncate leading-4 font-black">{event.title}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          ) : null}
        </aside>

        <section className="flex min-h-[70vh] flex-col bg-brand-surface lg:h-[calc(100vh-81px)]">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-brand-panel px-4 py-3">
            <div className="flex items-center gap-3">
              <LocateFixed className="h-5 w-5" />
              <p className="text-sm font-black">Floor Plan</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 text-xs font-bold text-brand-subtle sm:flex">
                <span>{exhibitors.length} entries</span>
                <span className="h-1 w-1 rounded-full bg-brand-subtle" />
                <span>{shapes.length} shapes</span>
              </div>
              <div className="flex items-center border border-border bg-white">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => zoomBy(0.86)}
                  aria-label="지도 축소"
                  className="rounded-none border-r border-border"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-14 px-2 text-center text-xs font-black">
                  {Math.round(transform.scale * 100)}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => zoomBy(1.16)}
                  aria-label="지도 확대"
                  className="rounded-none border-x border-border"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={resetMap}
                  aria-label="지도 초기화"
                  className="rounded-none"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              <ExportFavoritesButton booths={favorites} />
            </div>
          </div>

          <div
            ref={viewportRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={cn(
              "relative flex-1 overflow-hidden bg-brand-map touch-none select-none",
              isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
          >
            <div className="pointer-events-none absolute top-4 left-4 z-30 border border-border bg-brand-panel/95 px-3 py-2 text-xs font-bold shadow-brutal-sm">
              휠 확대/축소 · 드래그 이동
            </div>
            <div
              className="absolute top-0 left-0 overflow-hidden border border-border bg-white shadow-brutal will-change-transform"
              style={{
                width: MAP_WIDTH,
                height: MAP_HEIGHT,
                transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
                transformOrigin: "0 0",
              }}
            >
              <Image
                src="/data/sibf-2026-floor-plan.svg"
                alt="2026 서울국제도서전 부스 배치도"
                fill
                priority
                unoptimized
                className="select-none object-contain"
                draggable={false}
              />

              {shapes.map((shape) => {
                const boothItems = exhibitorsByBooth[shape.boothNumber] ?? [];
                if (!boothItems.length) return null;

                const isSelected = shape.boothNumber === selectedBooth;
                const isFavorite = favoriteSet.has(shape.boothNumber);

                return (
                  <button
                    key={shape.boothNumber}
                    type="button"
                    aria-label={`${shape.boothNumber} ${boothItems.map(getDisplayName).join(", ")}`}
                    title={`${shape.boothNumber} ${boothItems.map(getDisplayName).join(", ")}`}
                    onPointerEnter={() => setHoveredBooth(shape.boothNumber)}
                    onPointerLeave={() => setHoveredBooth((current) => (current === shape.boothNumber ? "" : current))}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => selectExhibitor(boothItems[0])}
                    className={cn(
                      "absolute transition focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-brand-coral",
                      isSelected ? "z-30" : isFavorite ? "z-20" : "z-10",
                      isSelected && "bg-brand-green/45 ring-4 ring-brand-green",
                      isFavorite && !isSelected && "bg-brand-coral/25 ring-2 ring-brand-coral",
                      !isSelected && !isFavorite && "hover:bg-brand-yellow/35 hover:ring-2 hover:ring-brand-ink"
                    )}
                    style={{
                      left: shape.x,
                      top: shape.y,
                      width: shape.width,
                      height: shape.height,
                    }}
                  >
                    {isFavorite ? (
                      <Star className="absolute -top-2 -right-2 h-4 w-4 fill-brand-coral text-foreground" />
                    ) : null}
                  </button>
                );
              })}

              {selectedShape ? (
                <div
                  className="pointer-events-none absolute z-[5] border-2 border-border bg-brand-green/30 shadow-[0_0_0_5px_var(--color-brand-green)]"
                  style={{
                    left: selectedShape.x,
                    top: selectedShape.y,
                    width: selectedShape.width,
                    height: selectedShape.height,
                  }}
                />
              ) : null}
            </div>

            {activeMapLabels.map(({ boothNumber, label, shape, isSelected, isFavorite }) => (
              <div
                key={boothNumber}
                className={cn(
                  "pointer-events-none absolute z-40 max-w-[220px] text-center text-xs font-black leading-tight text-foreground",
                  isSelected && "text-brand-green-ink",
                  isFavorite && !isSelected && "text-brand-coral-deep"
                )}
                style={{
                  left: transform.x + (shape.x + shape.width / 2) * transform.scale,
                  top: transform.y + (shape.y + shape.height * 0.42) * transform.scale,
                  width: 156,
                  fontSize: 12,
                  textShadow:
                    "0 1px 0 var(--color-brand-panel), 1px 0 0 var(--color-brand-panel), 0 -1px 0 var(--color-brand-panel), -1px 0 0 var(--color-brand-panel)",
                  transform: "translate(-50%, -100%)",
                  wordBreak: "keep-all",
                  overflowWrap: "anywhere",
                }}
              >
                {label}
              </div>
            ))}

            {isEventPanelOpen && selected ? (
              <aside
                onPointerDown={(event) => event.stopPropagation()}
                className="absolute inset-x-4 top-16 bottom-4 z-50 flex flex-col border border-border bg-brand-panel shadow-brutal sm:inset-x-auto sm:right-4 sm:w-[360px]"
              >
                <div className="flex items-start justify-between gap-3 border-b border-border bg-brand-yellow p-4">
                  <div className="min-w-0">
                    <p className="inline-flex border border-border bg-brand-ink px-2 py-1 text-xs font-black text-white">
                      {selectedBooth}
                    </p>
                    <h3 className="mt-2 truncate text-lg font-black">{getDisplayName(selected)}</h3>
                    {selected.introduction ? (
                      <div className="mt-3">
                        <p
                          className={cn(
                            "text-xs font-bold leading-5 text-brand-green-ink",
                            !isIntroductionExpanded && "line-clamp-3"
                          )}
                        >
                          {selected.introduction}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsIntroductionExpanded((current) => !current)}
                          className="mt-2 border border-border bg-white px-2 py-1 text-xs font-black hover:bg-brand-green"
                        >
                          {isIntroductionExpanded ? "접기" : "더보기"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setIsEventPanelOpen(false)}
                    aria-label="부스 이벤트 패널 닫기"
                    className="shrink-0 rounded-none border-border bg-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  <div className="mb-3 flex items-center justify-between border border-border bg-white px-3 py-2">
                    <span className="text-xs font-black text-brand-muted">이벤트</span>
                    <strong className="text-sm font-black">{selectedBoothEvents.length}개</strong>
                  </div>
                  <ul className="space-y-3">
                    {selectedBoothEvents.map((event) => (
                      <li
                        key={`${getEventScheduleLabel(event)}-${event.title}`}
                        className="overflow-hidden border border-border bg-white"
                      >
                        {event.imageUrl ? (
                          <div
                            className="aspect-[4/3] border-b border-border bg-brand-surface bg-cover bg-center"
                            style={{ backgroundImage: `url(${event.imageUrl})` }}
                          />
                        ) : null}
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-sm font-black text-brand-coral-deep">
                              {getEventScheduleLabel(event)}
                            </span>
                            <div className="flex shrink-0 items-center gap-1">
                              {event.period ? (
                                <span className="border border-border bg-brand-yellow px-2 py-1 text-xs font-black">
                                  기간 이벤트
                                </span>
                              ) : null}
                              <span className="border border-border bg-brand-green px-2 py-1 text-xs font-black">
                                {event.category}
                              </span>
                            </div>
                          </div>
                          <h4 className="mt-3 text-base font-black leading-5">{event.title}</h4>
                          <p className="mt-2 whitespace-pre-line text-sm font-bold leading-5 text-brand-subtle">
                            {event.content}
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/20 pt-3">
                            <span className="min-w-0 truncate text-xs font-black text-brand-muted">
                              출처 {event.sourceName}
                            </span>
                            {event.instagramUrl ? (
                              <Button
                                asChild
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-none border-border bg-brand-panel px-2 text-xs font-black hover:bg-brand-yellow"
                              >
                                <a href={event.instagramUrl} target="_blank" rel="noreferrer">
                                  <Instagram className="h-4 w-4" />
                                  원문
                                </a>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-border bg-white px-4 py-3 text-xs font-bold text-brand-muted">
                  <CalendarDays className="mr-1 inline h-4 w-4 align-[-3px]" />
                  실제 이벤트 데이터 연결 전 레이아웃 골격입니다.
                </div>
              </aside>
            ) : null}
          </div>

          {favoriteItems.length ? (
            <div className="border-t border-border bg-brand-panel px-4 py-3">
              <div className="flex gap-2 overflow-x-auto">
                {favoriteItems.map((item) => (
                  <button
                    key={boothForMap(item)}
                    type="button"
                    onClick={() => selectExhibitor(item)}
                    className="inline-flex shrink-0 items-center gap-2 border border-border bg-white px-3 py-2 text-sm font-black hover:bg-brand-yellow"
                  >
                    <Heart className="h-4 w-4 fill-brand-coral text-brand-coral" />
                    {boothForMap(item)} {getDisplayName(item)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </div>
  );
}
