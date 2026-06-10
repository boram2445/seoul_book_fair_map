"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, LocateFixed, Minus, Plus, RotateCcw, Search, Star, X } from "lucide-react";
import Image from "next/image";

import boothData from "@/data/sibf-2026-floor-booths.json";
import exhibitorData from "@/data/sibf-2026-floor-exhibitors.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { BoothShape, MapExhibitor } from "./types";

const MAP_WIDTH = 3230;
const MAP_HEIGHT = 3650;
const FAVORITES_KEY = "sibf-map-favorites";
const MIN_SCALE = 0.16;
const MAX_SCALE = 2.4;

const exhibitors = exhibitorData.exhibitors as MapExhibitor[];
const shapes = boothData.booths as BoothShape[];

function getDisplayName(exhibitor: MapExhibitor) {
  return exhibitor.nameKo || exhibitor.nameEn || exhibitor.booth;
}

function getSearchText(exhibitor: MapExhibitor) {
  return [
    exhibitor.booth,
    exhibitor.origBooth,
    exhibitor.nameKo,
    exhibitor.nameEn,
    exhibitor.countryKo,
    exhibitor.countryEn,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function boothForMap(exhibitor: MapExhibitor) {
  return exhibitor.origBooth || exhibitor.booth;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function BookFairMap() {
  const [query, setQuery] = useState("");
  const [selectedNo, setSelectedNo] = useState<number>(4);
  const [transform, setTransform] = useState({ scale: 0.28, x: 56, y: 18 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredBooth, setHoveredBooth] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
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

  const filteredExhibitors = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? exhibitors.filter((exhibitor) => getSearchText(exhibitor).includes(normalized))
      : exhibitors;
  }, [query]);

  const selectedBoothItems = selected ? exhibitorsByBooth[selectedBooth] ?? [selected] : [];
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
    try {
      const parsed = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? "[]");
      setFavorites(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

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
    centerBooth(boothForMap(exhibitor));
  }

  function toggleFavorite(booth: string) {
    setFavorites((current) =>
      current.includes(booth) ? current.filter((item) => item !== booth) : [...current, booth]
    );
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
    <main className="min-h-screen bg-[#f4f1e8] text-[#171511]">
      <section className="grid min-h-screen grid-cols-1 lg:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-[#171511] bg-[#fffdf7] lg:h-screen lg:border-r lg:border-b-0">
          <div className="border-b border-[#171511] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.28em] text-[#7b3f2b] uppercase">
                  SIBF 2026
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-normal">서울국제도서전 맵</h1>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#171511] bg-[#fff000] font-black">
                {favorites.length}
              </div>
            </div>
          </div>

          <div className="border-b border-[#171511] p-4">
            <div className="flex items-center gap-2 border border-[#171511] bg-white px-3">
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
            <div className="mt-2 flex items-center justify-between text-xs font-bold text-[#716a5c]">
              <span>표시 {filteredExhibitors.length}개</span>
              <span>전체 {exhibitors.length}개</span>
            </div>
          </div>

          <div className="min-h-[230px] flex-1 overflow-y-auto border-b border-[#171511] p-3 lg:min-h-0">
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
                          ? "bg-[#171511] text-white"
                          : "hover:bg-[#f0eadb] focus-visible:bg-[#f0eadb]"
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-extrabold">
                          {getDisplayName(exhibitor)}
                        </span>
                        <span
                          className={cn(
                            "block truncate text-xs",
                            isSelected ? "text-white/70" : "text-[#716a5c]"
                          )}
                        >
                          {exhibitor.nameEn || exhibitor.countryEn || "Seoul International Book Fair"}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-2">
                        {isFavorite ? <Heart className="h-4 w-4 fill-[#ff5a3d] text-[#ff5a3d]" /> : null}
                        <span
                          className={cn(
                            "min-w-16 border px-2 py-1 text-center text-xs font-black",
                            isSelected ? "border-white/40" : "border-[#171511]"
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
            <div className="bg-[#00ff66] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="inline-flex border border-[#171511] bg-[#171511] px-3 py-1 text-sm font-black text-white">
                    {selectedBooth}
                  </p>
                  <h2 className="mt-3 text-xl font-black">{getDisplayName(selected)}</h2>
                  {selected.nameEn ? <p className="text-sm font-bold text-[#214229]">{selected.nameEn}</p> : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => toggleFavorite(selectedBooth)}
                  aria-label="부스 찜하기"
                  className="border-[#171511] bg-white hover:bg-[#fff000]"
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      favoriteSet.has(selectedBooth) && "fill-[#ff5a3d] text-[#ff5a3d]"
                    )}
                  />
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold">
                <div className="border border-[#171511] bg-white px-3 py-2">
                  공유 부스
                  <strong className="block text-lg">{selectedBoothItems.length}</strong>
                </div>
                <div className="border border-[#171511] bg-white px-3 py-2">
                  구분
                  <strong className="block text-lg">{selected.special ? "시설" : "참가사"}</strong>
                </div>
              </div>

              {selectedBoothItems.length > 1 ? (
                <div className="mt-3 max-h-28 overflow-y-auto border border-[#171511] bg-white">
                  {selectedBoothItems.slice(0, 12).map((item) => (
                    <button
                      key={item.no}
                      type="button"
                      onClick={() => selectExhibitor(item)}
                      className="block w-full border-b border-[#171511]/20 px-3 py-2 text-left text-sm font-bold last:border-b-0 hover:bg-[#fff000]"
                    >
                      {getDisplayName(item)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </aside>

        <section className="flex min-h-[70vh] flex-col bg-[#e5ded1] lg:h-screen">
          <div className="flex items-center justify-between gap-3 border-b border-[#171511] bg-[#fffdf7] px-4 py-3">
            <div className="flex items-center gap-3">
              <LocateFixed className="h-5 w-5" />
              <p className="text-sm font-black">Floor Plan</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 text-xs font-bold text-[#625b50] sm:flex">
                <span>{exhibitors.length} entries</span>
                <span className="h-1 w-1 rounded-full bg-[#625b50]" />
                <span>{shapes.length} shapes</span>
              </div>
              <div className="flex items-center border border-[#171511] bg-white">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => zoomBy(0.86)}
                  aria-label="지도 축소"
                  className="rounded-none border-r border-[#171511]"
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
                  className="rounded-none border-x border-[#171511]"
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
            </div>
          </div>

          <div
            ref={viewportRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={cn(
              "relative flex-1 overflow-hidden bg-[#d8d1c4] touch-none select-none",
              isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
          >
            <div className="pointer-events-none absolute top-4 left-4 z-30 border border-[#171511] bg-[#fffdf7]/95 px-3 py-2 text-xs font-bold shadow-[3px_3px_0_#171511]">
              휠 확대/축소 · 드래그 이동
            </div>
            <div
              className="absolute top-0 left-0 overflow-hidden border border-[#171511] bg-white shadow-[8px_8px_0_#171511] will-change-transform"
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
                      "absolute transition focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-[#ff5a3d]",
                      isSelected ? "z-30" : isFavorite ? "z-20" : "z-10",
                      isSelected && "bg-[#00ff66]/45 ring-4 ring-[#00ff66]",
                      isFavorite && !isSelected && "bg-[#ff5a3d]/25 ring-2 ring-[#ff5a3d]",
                      !isSelected && !isFavorite && "hover:bg-[#fff000]/35 hover:ring-2 hover:ring-[#171511]"
                    )}
                    style={{
                      left: shape.x,
                      top: shape.y,
                      width: shape.width,
                      height: shape.height,
                    }}
                  >
                    {isFavorite ? (
                      <Star className="absolute -top-2 -right-2 h-4 w-4 fill-[#ff5a3d] text-[#171511]" />
                    ) : null}
                  </button>
                );
              })}

              {selectedShape ? (
                <div
                  className="pointer-events-none absolute z-[5] border-2 border-[#171511] bg-[#00ff66]/30 shadow-[0_0_0_5px_#00ff66]"
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
                  "pointer-events-none absolute z-40 max-w-[220px] text-center text-xs font-black leading-tight text-[#171511]",
                  isSelected && "text-[#032f14]",
                  isFavorite && !isSelected && "text-[#7a1f12]"
                )}
                style={{
                  left: transform.x + (shape.x + shape.width / 2) * transform.scale,
                  top: transform.y + (shape.y + shape.height * 0.42) * transform.scale,
                  width: 156,
                  fontSize: 12,
                  textShadow:
                    "0 1px 0 #fffdf7, 1px 0 0 #fffdf7, 0 -1px 0 #fffdf7, -1px 0 0 #fffdf7",
                  transform: "translate(-50%, -100%)",
                  wordBreak: "keep-all",
                  overflowWrap: "anywhere",
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {favoriteItems.length ? (
            <div className="border-t border-[#171511] bg-[#fffdf7] px-4 py-3">
              <div className="flex gap-2 overflow-x-auto">
                {favoriteItems.map((item) => (
                  <button
                    key={boothForMap(item)}
                    type="button"
                    onClick={() => selectExhibitor(item)}
                    className="inline-flex shrink-0 items-center gap-2 border border-[#171511] bg-white px-3 py-2 text-sm font-black hover:bg-[#fff000]"
                  >
                    <Heart className="h-4 w-4 fill-[#ff5a3d] text-[#ff5a3d]" />
                    {boothForMap(item)} {getDisplayName(item)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
