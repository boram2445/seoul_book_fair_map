"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GripVertical,
  Heart,
  Instagram,
  Minus,
  Plus,
  Info,
  RotateCcw,
  Route,
  Search,
  Star,
  X,
} from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

import { getBoothEvents, getEventScheduleLabel } from "./booth-events";
import { boothForMap, exhibitors, getDisplayName, getSearchText, shapes } from "./map-data";
import { ExportFavoritesButton } from "./favorites-pdf/index";
import { buildRoute, MAP_HEIGHT, MAP_WIDTH } from "./route-path";
import type { BoothShape, MapExhibitor } from "./types";
import { useFavorites } from "./use-favorites";

const MIN_SCALE = 0.16;
const MAX_SCALE = 2.4;

const SHEET_HEIGHT_RATIO = 0.9; // 시트 최대 높이 = 뷰포트의 90%
const SHEET_PEEK_PX = 120; // peek 스냅: 최소 노출 높이(px)

/** 뷰포트 높이(vh)로부터 스냅 3종의 translateY 오프셋을 계산한다.
 *  offset 0 = 완전 확장(90vh 노출), 클수록 아래로 밀려 덜 보임. */
function computeSnapOffsets(vh: number) {
  const sheetHeight = vh * SHEET_HEIGHT_RATIO;
  return {
    expanded: 0, // 90vh 전체 노출
    half: sheetHeight - vh * 0.5, // 50vh 노출 (= 40vh 밀어내림)
    peek: sheetHeight - SHEET_PEEK_PX, // 120px만 노출
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// ─── 찜 목록 바 — 드래그 정렬 칩 ────────────────────────────────────────────

function SortableFavoriteChip({
  booth,
  label,
  onSelect,
  onRemove,
}: {
  booth: string;
  label: string;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: booth });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "inline-flex shrink-0 items-stretch border border-border bg-white text-sm font-black transition",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <button
        type="button"
        {...listeners}
        aria-label="순서 변경"
        className="flex cursor-grab items-center border-r border-border px-2 text-brand-muted hover:bg-brand-hover active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex items-center gap-2 px-3 py-2 hover:bg-brand-yellow"
      >
        <span
          role="button"
          aria-label="찜 해제"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onRemove(); } }}
          onPointerDown={(e) => e.stopPropagation()}
          className="inline-flex cursor-pointer items-center [&:hover>svg]:fill-brand-coral/40 [&:hover>svg]:text-brand-coral/40"
        >
          <Heart className="h-4 w-4 fill-brand-coral text-brand-coral transition-colors" />
        </span>
        {label}
      </button>
    </div>
  );
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
  const { favorites, toggleFavorite, reorderFavorites } = useFavorites();
  const isMobile = useIsMobile();
  const favoriteSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function onFavoriteDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = favorites.indexOf(String(active.id));
    const newIndex = favorites.indexOf(String(over.id));
    reorderFavorites(arrayMove(favorites, oldIndex, newIndex));
  }
  /** 시트 translateY 오프셋(px). 0 = 완전 확장(90vh 노출), 클수록 아래로 밀림. 첫 진입 = 절반 */
  const [sheetOffset, setSheetOffset] = useState(() => {
    if (typeof window === "undefined") return 0;
    return computeSnapOffsets(window.innerHeight).half;
  });
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  /** 모바일 시트 내부 뷰 상태: false = 리스트, true = 상세 */
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const sheetDragRef = useRef({ pointerId: -1, startY: 0, startOffset: 0, currentOffset: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    pointerId: 0,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const [isRouteVisible, setIsRouteVisible] = useState(false);

  const shapesByBooth = useMemo(() => {
    return new Map(shapes.map((shape) => [shape.boothNumber, shape]));
  }, []);

  /** A* 경로 꺾은선 — SVG polyline points */
  const routePath = useMemo(() => {
    if (!isRouteVisible || favorites.length < 2) return [];
    return buildRoute(favorites);
  }, [isRouteVisible, favorites]);

  /** 순번 배지 위치 — 각 찜 부스의 중심 */
  const routeBadges = useMemo(() => {
    if (!isRouteVisible || favorites.length < 2) return [];
    return favorites
      .map((booth) => shapesByBooth.get(booth))
      .filter((shape): shape is BoothShape => Boolean(shape))
      .map((shape, index) => ({
        x: shape.x + shape.width / 2,
        y: shape.y + shape.height / 2,
        boothNumber: shape.boothNumber,
        index,
      }));
  }, [isRouteVisible, favorites, shapesByBooth]);

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

    // 모바일: 시트가 가리는 높이를 빼고 가시 영역 상단 1/3에 부스를 맞춘다.
    // 데스크톱: 뷰포트 정중앙 그대로 (기존 동작 불변).
    let targetY: number;
    if (isMobile) {
      const visibleSheetHeight = Math.max(0, window.innerHeight * SHEET_HEIGHT_RATIO - sheetOffset);
      const visibleAreaHeight = rect.height - visibleSheetHeight;
      targetY = visibleAreaHeight / 3;
    } else {
      targetY = rect.height / 2;
    }

    setTransform({
      scale,
      x: rect.width / 2 - centerX * scale,
      y: targetY - centerY * scale,
    });
  }

  function selectExhibitor(exhibitor: MapExhibitor) {
    setSelectedNo(exhibitor.no);
    setIsIntroductionExpanded(false);
    centerBooth(boothForMap(exhibitor));
    // 모바일에서 선택 시 상세 뷰로 전환 (시트 높이는 그대로 유지)
    if (isMobile) setIsMobileDetailOpen(true);
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

  // ── 모바일 바텀시트 드래그 핸들러 (지도 pan/zoom과 동일한 pointer capture 패턴) ──

  function handleSheetPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    sheetDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startOffset: sheetOffset,
      currentOffset: sheetOffset,
    };
    setIsSheetDragging(true);
  }

  function handleSheetPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (sheetDragRef.current.pointerId !== event.pointerId) return;
    const dy = event.clientY - sheetDragRef.current.startY;
    const { expanded, peek } = computeSnapOffsets(window.innerHeight);
    const newOffset = clamp(sheetDragRef.current.startOffset + dy, expanded, peek);
    sheetDragRef.current.currentOffset = newOffset;
    setSheetOffset(newOffset);
  }

  function handleSheetPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (sheetDragRef.current.pointerId !== event.pointerId) return;
    setIsSheetDragging(false);
    // stale closure 방지: ref에 저장된 마지막 offset으로 스냅 계산
    const offsets = computeSnapOffsets(window.innerHeight);
    const snapValues = [offsets.expanded, offsets.half, offsets.peek];
    const current = sheetDragRef.current.currentOffset;
    const nearest = snapValues.reduce((a, b) =>
      Math.abs(a - current) <= Math.abs(b - current) ? a : b
    );
    setSheetOffset(nearest);
  }

  // 화면 회전 시 스냅 오프셋 재클램프
  useEffect(() => {
    function onResize() {
      const offsets = computeSnapOffsets(window.innerHeight);
      const snapValues = [offsets.expanded, offsets.half, offsets.peek];
      setSheetOffset((current) =>
        snapValues.reduce((a, b) => (Math.abs(a - current) <= Math.abs(b - current) ? a : b))
      );
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 모바일: 시트가 아래로 밀린 sheetOffset만큼 스크롤 컨테이너 바닥이 fold 아래에 있어
  // 끝까지 스크롤하려면 동일한 패딩이 필요하다. 데스크톱은 0.
  const scrollPaddingBottom = isMobile ? sheetOffset : 0;

  // 찜 바 — 데스크톱 하단과 모바일 드로어 최상단에서 공유
  const favoritesBar = favoriteItems.length ? (
    <DndContext
      sensors={favoriteSensors}
      collisionDetection={closestCenter}
      onDragEnd={onFavoriteDragEnd}
    >
      <SortableContext items={favorites} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {favoriteItems.map((item) => {
            const booth = boothForMap(item);
            return (
              <SortableFavoriteChip
                key={booth}
                booth={booth}
                label={`${booth} ${getDisplayName(item)}`}
                onSelect={() => selectExhibitor(item)}
                onRemove={() => toggleFavorite(booth)}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  ) : null;

  // 검색·필터·리스트 — 데스크톱 aside와 모바일 시트 리스트 뷰에서 공유
  const listContent = (
    <>
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
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center"
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
                "shrink-0 cursor-pointer border border-border px-3 py-1.5 text-xs font-black",
                selectedCategory === category ? "bg-brand-ink text-white" : "bg-white hover:bg-brand-yellow"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div
        className="min-h-[230px] flex-1 overflow-y-auto border-b border-border p-3 md:min-h-0"
        style={{ paddingBottom: scrollPaddingBottom }}
      >
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
                    "grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left transition",
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
                    {isFavorite ? (
                      <span
                        role="button"
                        aria-label="찜 해제"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(booth); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); toggleFavorite(booth); } }}
                        className="inline-flex cursor-pointer items-center [&:hover>svg]:fill-brand-coral/40 [&:hover>svg]:text-brand-coral/40"
                      >
                        <Heart className="h-4 w-4 fill-brand-coral text-brand-coral transition-colors" />
                      </span>
                    ) : null}
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
    </>
  );

  // 선택 출판사 상세 — 데스크톱 aside와 모바일 시트 상세 뷰에서 공유
  const detailContent = selected ? (
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
                onClick={() => {
                  setIsEventPanelOpen(true);
                }}
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
      ) : null;

  // 이벤트 상세 — 데스크톱은 플로팅 aside, 모바일은 시트 안 뷰로 공유
  const eventContent = selected ? (
    <>
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
                className="mt-2 cursor-pointer border border-border bg-white px-2 py-1 text-xs font-black hover:bg-brand-green"
              >
                {isIntroductionExpanded ? "접기" : "더보기"}
              </button>
            </div>
          ) : null}
        </div>
        {!isMobile && (
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
        )}
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
    </>
  ) : null;

  return (
    <div className="h-full min-h-[calc(100vh-125px)] bg-background text-foreground lg:min-h-[calc(100vh-81px)]">
      <section className="grid h-full min-h-[calc(100vh-125px)] grid-cols-1 lg:min-h-[calc(100vh-81px)] md:grid-cols-[390px_minmax(0,1fr)]">
        {/* 사이드바 — 모바일(768px 미만)에서는 hidden, 내용은 아래 바텀시트와 공유 */}
        <aside className="hidden min-h-0 flex-col border-b border-border bg-brand-panel md:flex md:h-[calc(100vh-125px)] md:border-r md:border-b-0 lg:h-[calc(100vh-81px)]">
          {listContent}
          {detailContent}
        </aside>

        <section className="flex h-[calc(100vh-125px)] min-h-[calc(100vh-125px)] flex-col bg-brand-surface lg:h-[calc(100vh-81px)] lg:min-h-0">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-brand-panel px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Info className="h-4 w-4 shrink-0 text-brand-subtle" />
              <div className="grid min-w-0 gap-0.5">
                <p className="truncate text-xs font-bold text-brand-subtle">서울국제도서전 비공식 프로젝트입니다.</p>
                <p className="truncate text-xs font-bold text-brand-subtle">부스 및 참가사 정보는 서울국제도서전 공식 홈페이지를 기반으로 제작되었습니다.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRouteVisible((v) => !v)}
                disabled={favorites.length < 2}
                aria-label="경로 표시 토글"
                className={cn(
                  "rounded-none border-border",
                  isRouteVisible
                    ? "bg-brand-coral text-white hover:bg-brand-coral hover:text-white"
                    : "bg-white"
                )}
              >
                <Route className="h-4 w-4" />
                경로
              </Button>
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
                      "absolute cursor-pointer transition focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-brand-coral",
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

              {/* 경로 오버레이 — 찜 순서대로 부스 중심을 잇는 선 + 순번 배지 */}
              {routePath.length >= 2 ? (
                <svg
                  className="pointer-events-none absolute inset-0 z-[35] overflow-visible"
                  style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
                  viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                  aria-hidden
                >
                  {/* A* 통로 경로 꺾은선 */}
                  <polyline
                    points={routePath.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="var(--color-brand-coral)"
                    strokeWidth={8}
                    strokeDasharray="20 8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.85}
                  />
                  {/* 찜 순번 배지 — 각 부스 중심 */}
                  {routeBadges.map((badge) => (
                    <g key={badge.boothNumber}>
                      <circle
                        cx={badge.x}
                        cy={badge.y}
                        r={20}
                        fill="var(--color-brand-coral)"
                        stroke="white"
                        strokeWidth={4}
                      />
                      <text
                        x={badge.x}
                        y={badge.y + 7}
                        textAnchor="middle"
                        fill="white"
                        fontSize={18}
                        fontWeight="bold"
                        fontFamily="system-ui, sans-serif"
                      >
                        {badge.index + 1}
                      </text>
                    </g>
                  ))}
                </svg>
              ) : null}
            </div>

            {/* 줌 컨트롤 — 지도 우측 상단 플로팅 */}
            <div
              className="pointer-events-auto absolute top-3 right-4 z-50 flex items-center border border-border bg-white shadow-brutal-sm"
              onPointerDown={(e) => e.stopPropagation()}
            >
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

            {/* 데스크톱 전용 플로팅 이벤트 패널 — 모바일은 바텀시트 안 뷰로 표시 */}
            {!isMobile && isEventPanelOpen && selected ? (
              <aside
                onPointerDown={(event) => event.stopPropagation()}
                className="absolute inset-x-4 top-16 bottom-4 z-[60] flex flex-col border border-border bg-brand-panel shadow-brutal sm:inset-x-auto sm:right-4 sm:w-[360px]"
              >
                {eventContent}
              </aside>
            ) : null}
          </div>

          {/* 찜 목록 바 — 모바일(768px 미만)에서는 바텀시트에 있으므로 md 이상 전용 */}
          {favoriteItems.length ? (
            <div className="hidden border-t border-border bg-brand-panel md:block">
              {favoritesBar}
            </div>
          ) : null}
        </section>
      </section>

      {/* 모바일 전용 바텀시트 — non-modal(오버레이 없음, 지도 인터랙션 유지)
          높이 90vh 고정 + translateY(sheetOffset)로 노출 높이 조절.
          데스크톱에서는 md:hidden으로 숨김 */}
      {isMobile ? (
        <div
          className="fixed inset-x-0 bottom-0 z-50 flex flex-col border-t border-border bg-brand-panel md:hidden"
          style={{
            height: `${SHEET_HEIGHT_RATIO * 100}vh`,
            transform: `translate3d(0, ${sheetOffset}px, 0)`,
            transition: isSheetDragging ? "none" : "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        >
          {/* 드래그 핸들 — pointer capture로 핸들 밖으로 나가도 이벤트 추적 */}
          <div
            role="separator"
            aria-label="바텀시트 드래그 핸들"
            className="flex cursor-grab touch-none items-center justify-center pb-2 pt-3 active:cursor-grabbing"
            onPointerDown={handleSheetPointerDown}
            onPointerMove={handleSheetPointerMove}
            onPointerUp={handleSheetPointerUp}
            onPointerCancel={handleSheetPointerUp}
          >
            <div className="h-1.5 w-12 rounded-full bg-brand-surface" />
          </div>
          <h2 className="sr-only">출판사 검색 및 목록</h2>
          {isEventPanelOpen && selected ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <button
                type="button"
                onClick={() => setIsEventPanelOpen(false)}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 border-b border-border px-4 py-2.5 text-sm font-black hover:bg-brand-hover"
              >
                <ChevronLeft className="h-4 w-4" />
                출판사로
              </button>
              <div
                className="min-h-0 flex-1 overflow-y-auto"
                style={{ paddingBottom: scrollPaddingBottom }}
              >
                {eventContent}
              </div>
            </div>
          ) : isMobileDetailOpen ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <button
                type="button"
                onClick={() => setIsMobileDetailOpen(false)}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 border-b border-border px-4 py-2.5 text-sm font-black hover:bg-brand-hover"
              >
                <ChevronLeft className="h-4 w-4" />
                목록으로
              </button>
              <div
                className="min-h-0 flex-1 overflow-y-auto"
                style={{ paddingBottom: scrollPaddingBottom }}
              >
                {detailContent}
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              {favoriteItems.length ? (
                <div className="shrink-0 border-b border-border bg-brand-panel">
                  {favoritesBar}
                </div>
              ) : null}
              {listContent}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
