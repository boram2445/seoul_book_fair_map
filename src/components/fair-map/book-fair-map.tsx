'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  GripVertical,
  Heart,
  MapPin,
  Maximize,
  Minus,
  Plus,
  Info,
  Route,
  Search,
  X,
} from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLinkButton } from '@/components/fair-app/external-link-button';
import { FavoriteButton } from '@/components/fair-app/favorite-button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

import { BoothEventDetailList } from './booth-event-detail-list';
import { type BoothEvent, getEventScheduleLabel } from './booth-events';
import { boothForMap, getFavoriteKey, getDisplayName, getSearchText, normalizeSearch } from './map-helpers';
import { MapBoothLayer } from './map-booth-layer';
import { MapLabelLayer } from './map-label-layer';
import { ExportFavoritesButton } from './favorites-pdf/index';
import { buildRoute, MAP_HEIGHT, MAP_WIDTH } from './route-path';
import type { BoothShape, MapExhibitor } from './types';
import { useFavorites } from './use-favorites';

const MIN_SCALE = 0.16;
const MAX_SCALE = 2.4;
const FOCUS_SCALE = 0.55;

const TOP_PANEL_HEIGHT_RATIO = 0.4;
const TOP_PANEL_COLLAPSED_PX = 50;

function getViewportHeight() {
  if (typeof window === 'undefined') return 0;
  return window.innerHeight;
}

/** offset 0 = 중간 펼침, 음수 = 상단으로 접힘 */
function computeSnapOffsets(panelHeight: number) {
  return {
    expanded: 0,
    collapsed: -(panelHeight - TOP_PANEL_COLLAPSED_PX),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function computeFitTransform(viewportWidth: number, viewportHeight: number, mobile: boolean) {
  const visibleH = mobile ? viewportHeight - TOP_PANEL_COLLAPSED_PX : viewportHeight;
  const scale = clamp(Math.min(viewportWidth / MAP_WIDTH, visibleH / MAP_HEIGHT), MIN_SCALE, MAX_SCALE);
  const x = (viewportWidth - MAP_WIDTH * scale) / 2;
  const y = mobile
    ? TOP_PANEL_COLLAPSED_PX + (visibleH - MAP_HEIGHT * scale) / 2
    : (viewportHeight - MAP_HEIGHT * scale) / 2;
  return { scale, x, y };
}

function distanceBetween(
  first: { x: number; y: number },
  second: { x: number; y: number },
) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function centerBetween(
  first: { x: number; y: number },
  second: { x: number; y: number },
) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

// ─── 찜 목록 바 — 드래그 정렬 칩 ────────────────────────────────────────────

function SortableFavoriteChip({
  favKey,
  label,
  onSelect,
  onRemove,
}: {
  favKey: string;
  label: string;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: favKey,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'inline-flex shrink-0 items-stretch border border-border bg-white text-xs font-black transition',
        isDragging && 'opacity-50 shadow-lg',
      )}
    >
      <button
        type="button"
        {...listeners}
        aria-label="순서 변경"
        className="flex cursor-grab items-center border-r border-border px-1.5 text-brand-muted hover:bg-brand-hover active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 items-center gap-1.5 px-2 py-1.5 hover:bg-brand-yellow"
      >
        <span className="truncate max-w-[7rem] md:max-w-[12rem]">{label}</span>
        <span
          role="button"
          aria-label="찜 해제"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              onRemove();
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="-m-1 inline-flex shrink-0 cursor-pointer items-center p-1 [&:hover>svg]:fill-brand-coral/40 [&:hover>svg]:text-brand-coral/40"
        >
          <Heart className="h-3 w-3 fill-brand-coral text-brand-coral transition-colors" />
        </span>
      </button>
    </div>
  );
}

interface BookFairMapProps {
  exhibitors: MapExhibitor[];
  shapes: BoothShape[];
  eventsByBooth: Record<string, BoothEvent[]>;
}

export function BookFairMap({ exhibitors, shapes, eventsByBooth }: BookFairMapProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedNo, setSelectedNo] = useState<number>(4);
  const [transform, setTransform] = useState({ scale: 0.28, x: 56, y: 18 });
  const [isDragging, setIsDragging] = useState(false);
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
  /** 모바일 상단 패널 translateY 오프셋(px). 0 = 중간 펼침, 음수 = 접힘 */
  const [sheetOffset, setSheetOffset] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return computeSnapOffsets(getViewportHeight() * TOP_PANEL_HEIGHT_RATIO).collapsed;
  });
  const [topPanelHeight, setTopPanelHeight] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  /** 모바일 시트 내부 뷰 상태: false = 리스트, true = 상세 */
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const sheetDragRef = useRef({
    pointerId: -1,
    startY: 0,
    startOffset: 0,
    currentOffset: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
    didDrag: false,
  });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const topPanelRef = useRef<HTMLDivElement | null>(null);
  /** exhibitor.no → <li> DOM 노드 맵. 선택 변화 시 scrollIntoView에 사용. */
  const listItemRefsRef = useRef<Map<number, HTMLLIElement>>(new Map());
  const lastSheetToggleTimeRef = useRef(0);
  const transformRef = useRef(transform);
  const sheetOffsetRef = useRef(sheetOffset);
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef({
    pointerId: 0,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const pinchRef = useRef({
    startDistance: 0,
    startScale: transform.scale,
    worldX: 0,
    worldY: 0,
  });

  /** 맵 wrapper div — 명령형 style.transform 기록용 */
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);
  /** 순번 배지 div 맵 (boothNumber → element) — 명령형 위치 동기화용 */
  const badgeRefsRef = useRef(new Map<string, HTMLDivElement>());
  /** 줌 % 텍스트 span — 명령형 textContent 동기화용 */
  const zoomPctRef = useRef<HTMLSpanElement | null>(null);
  /** 항상 최신 routeBadges 를 담는 ref — wheel useEffect 내 stale 방지 */
  const routeBadgesRef = useRef<Array<{ boothNumber: string; labelX: number; labelY: number }>>([]);
  /** 휠 버스트 종료 감지용 디바운스 타이머 */
  const wheelCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isRouteVisible, setIsRouteVisible] = useState(false);
  const [isRoutePreview, setIsRoutePreview] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const routeActive = isRouteVisible || isRoutePreview;

  const routeDesktopRef = useRef<HTMLDivElement>(null);
  const routeMobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isTooltipOpen) return;
    function handleOutside(e: PointerEvent) {
      const target = e.target as Node;
      if (
        !routeDesktopRef.current?.contains(target) &&
        !routeMobileRef.current?.contains(target)
      ) {
        setIsTooltipOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [isTooltipOpen]);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    sheetOffsetRef.current = sheetOffset;
  }, [sheetOffset]);

  /**
   * 제스처 프레임마다 React 재렌더 없이 DOM을 직접 갱신한다.
   * - transformRef 갱신 → wrapper style.transform 기록
   * - 순번 배지 위치·크기 동기화
   * - 줌 % 텍스트 동기화
   * 모든 의존 값이 ref이므로 useCallback deps 는 빈 배열.
   */
  const applyTransformImperative = useCallback(
    (next: { scale: number; x: number; y: number }) => {
      transformRef.current = next;

      const w = mapWrapperRef.current;
      if (w) {
        w.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) scale(${next.scale})`;
      }

      const badgeSize = clamp(next.scale * 40, 16, 28);
      for (const badge of routeBadgesRef.current) {
        const el = badgeRefsRef.current.get(badge.boothNumber);
        if (!el) continue;
        el.style.left = `${next.x + badge.labelX * next.scale}px`;
        el.style.top = `${next.y + badge.labelY * next.scale}px`;
        el.style.width = `${badgeSize}px`;
        el.style.height = `${badgeSize}px`;
        el.style.minWidth = `${badgeSize}px`;
        el.style.fontSize = `${clamp(badgeSize * 0.48, 10, 14)}px`;
      }

      if (zoomPctRef.current) {
        zoomPctRef.current.textContent = `${Math.round(next.scale * 100)}%`;
      }
    },
    [], // refs only — stable across renders
  );

  function getTopPanelHeight() {
    return topPanelHeight || getViewportHeight() * TOP_PANEL_HEIGHT_RATIO;
  }

  const shapesByBooth = useMemo(() => {
    return new Map(shapes.map((shape) => [shape.boothNumber, shape]));
  }, [shapes]);

  const exhibitorByFavoriteKey = useMemo(() => {
    return new Map(exhibitors.map((exhibitor) => [getFavoriteKey(exhibitor), exhibitor]));
  }, [exhibitors]);

  /** 경로·순번 배지용 — 출판사 단위 찜을 부스 단위로 중복 제거(순서 유지) */
  const favoriteBooths = useMemo(() => {
    const seen = new Set<string>();
    return favorites
      .map((key) => exhibitorByFavoriteKey.get(key))
      .filter((ex): ex is MapExhibitor => Boolean(ex))
      .map((ex) => boothForMap(ex))
      .filter((booth) => {
        if (seen.has(booth)) return false;
        seen.add(booth);
        return true;
      });
  }, [exhibitorByFavoriteKey, favorites]);

  /** A* 경로 꺾은선 — SVG polyline points */
  const routePath = useMemo(() => {
    if (!routeActive || favoriteBooths.length < 2) return [];
    return buildRoute(favoriteBooths);
  }, [routeActive, favoriteBooths]);

  /** 순번 배지 위치 — 각 찜 부스의 중심 */
  const routeBadges = useMemo(() => {
    if (!routeActive || favoriteBooths.length < 2) return [];
    return favoriteBooths
      .map((booth) => shapesByBooth.get(booth))
      .filter((shape): shape is BoothShape => Boolean(shape))
      .map((shape, index) => ({
        x: shape.x + shape.width / 2,
        y: shape.y + shape.height / 2,
        labelX: shape.x + shape.width,
        labelY: shape.y,
        boothNumber: shape.boothNumber,
        index,
      }));
  }, [routeActive, favoriteBooths, shapesByBooth]);

  const routeOrderByBooth = useMemo(() => {
    return new Map(routeBadges.map((badge) => [badge.boothNumber, badge.index + 1]));
  }, [routeBadges]);

  // wheel useEffect([]) 내 stale 방지 — 최신 routeBadges 를 ref 에 유지
  useEffect(() => {
    routeBadgesRef.current = routeBadges;
  }, [routeBadges]);

  const routeBadgeSize = clamp(transform.scale * 40, 16, 28);

  const exhibitorsByBooth = useMemo(() => {
    return exhibitors.reduce<Record<string, MapExhibitor[]>>((acc, exhibitor) => {
      const booth = exhibitor.origBooth || exhibitor.booth;
      acc[booth] = acc[booth] ?? [];
      acc[booth].push(exhibitor);
      return acc;
    }, {});
  }, [exhibitors]);

  /**
   * 라벨 레이어 전용 — origBooth가 도형으로 존재하지 않으면 booth(구역 키)로 폴백.
   * B400(책마을) 같이 내부 구획이 도형 없이 origBooth만 세분된 경우, 전부 구역 도형에 통합.
   */
  const labelExhibitorsByBooth = useMemo(() => {
    return exhibitors.reduce<Record<string, MapExhibitor[]>>((acc, exhibitor) => {
      const key =
        exhibitor.origBooth && shapesByBooth.has(exhibitor.origBooth)
          ? exhibitor.origBooth
          : exhibitor.booth;
      acc[key] = acc[key] ?? [];
      acc[key].push(exhibitor);
      return acc;
    }, {});
  }, [exhibitors, shapesByBooth]);

  const selected = exhibitors.find((exhibitor) => exhibitor.no === selectedNo) ?? exhibitors[0];
  const selectedBooth = selected ? boothForMap(selected) : '';
  const selectedShape = selected ? shapesByBooth.get(selectedBooth) : undefined;
  const selectedBoothEvents = selected ? (eventsByBooth[String(selected.no)] ?? []) : [];
  const selectedBoothItems = selectedBooth ? (exhibitorsByBooth[selectedBooth] ?? []) : [];
  const selectedBoothPeers = selected
    ? selectedBoothItems.filter((exhibitor) => exhibitor.no !== selected.no)
    : [];
  const categoryOptions = useMemo(() => {
    const categoryCounts = exhibitors.reduce<Record<string, number>>((acc, exhibitor) => {
      for (const category of exhibitor.categories ?? []) {
        acc[category] = (acc[category] ?? 0) + 1;
      }
      return acc;
    }, {});

    return [
      '전체',
      ...Object.entries(categoryCounts)
        .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0], 'ko'))
        .slice(0, 10)
        .map(([category]) => category),
    ];
  }, [exhibitors]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const filteredExhibitors = useMemo(() => {
    const normalized = normalizeSearch(debouncedQuery);
    return exhibitors.filter((exhibitor) => {
      const matchesQuery = normalized ? normalizeSearch(getSearchText(exhibitor)).includes(normalized) : true;
      const matchesCategory =
        selectedCategory === '전체'
          ? true
          : (exhibitor.categories ?? []).includes(selectedCategory);
      return matchesQuery && matchesCategory;
    });
  }, [exhibitors, debouncedQuery, selectedCategory]);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const favoriteItems = useMemo(() => {
    return favorites
      .map((key) => exhibitorByFavoriteKey.get(key))
      .filter((exhibitor): exhibitor is MapExhibitor => Boolean(exhibitor));
  }, [exhibitorByFavoriteKey, favorites]);
  const isTopPanelExpanded = sheetOffset > -1;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function handleNativeWheel(event: WheelEvent) {
      // 오버레이 패널(이벤트 aside, 모바일 바텀시트) 위 휠은 패널 스크롤로 위임
      if ((event.target as HTMLElement).closest('[data-map-overlay]')) return;
      event.preventDefault();
      const target = event.currentTarget;
      if (!(target instanceof HTMLElement)) return;

      const rect = target.getBoundingClientRect();
      const anchorX = event.clientX - rect.left;
      const anchorY = event.clientY - rect.top;
      const zoomFactor = event.deltaY > 0 ? 0.88 : 1.14;

      // 제스처 중 GPU 힌트 (첫 이벤트 때만 설정, 이후 idempotent)
      const w = mapWrapperRef.current;
      if (w) w.style.willChange = 'transform';

      // 현재 transform 은 ref 에서 읽어 state 갱신 없이 계산
      const current = transformRef.current;
      const nextScale = clamp(current.scale * zoomFactor, MIN_SCALE, MAX_SCALE);
      const worldX = (anchorX - current.x) / current.scale;
      const worldY = (anchorY - current.y) / current.scale;
      const next = {
        scale: nextScale,
        x: anchorX - worldX * nextScale,
        y: anchorY - worldY * nextScale,
      };

      // DOM 직접 갱신 — React 재렌더 없음
      applyTransformImperative(next);

      // 버스트 종료 감지: 마지막 휠 이후 150ms 내 새 이벤트 없으면 state 커밋
      if (wheelCommitTimerRef.current !== null) clearTimeout(wheelCommitTimerRef.current);
      wheelCommitTimerRef.current = setTimeout(() => {
        wheelCommitTimerRef.current = null;
        if (w) w.style.willChange = 'auto';
        setTransform({ ...transformRef.current });
      }, 150);
    }

    viewport.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      viewport.removeEventListener('wheel', handleNativeWheel);
    };
  }, [applyTransformImperative]);

  const centerBooth = useCallback(function centerBooth(booth: string, nextScale?: number) {
    const shape = shapesByBooth.get(booth);
    const viewport = viewportRef.current;
    if (!shape || !viewport) return;

    const rect = viewport.getBoundingClientRect();
    // transformRef 사용 → transform state 의존성 제거 (useCallback 안정화)
    const scale = nextScale ?? transformRef.current.scale;
    const centerX = shape.x + shape.width / 2;
    const centerY = shape.y + shape.height / 2;

    // 모바일: 상단 패널이 가린 영역 아래쪽의 가시 영역 중앙에 부스를 맞춘다.
    // 데스크톱: 뷰포트 정중앙 그대로 (기존 동작 불변).
    let targetY: number;
    if (isMobile) {
      const panelHeight = getViewportHeight() * TOP_PANEL_HEIGHT_RATIO;
      // sheetOffsetRef 사용 → sheetOffset state 의존성 제거
      const coveredHeight = Math.max(TOP_PANEL_COLLAPSED_PX, panelHeight + sheetOffsetRef.current);
      const visibleAreaHeight = Math.max(1, rect.height - coveredHeight);
      targetY = coveredHeight + visibleAreaHeight * (2 / 3);
    } else {
      targetY = rect.height / 2;
    }

    setTransform({
      scale,
      x: rect.width / 2 - centerX * scale,
      y: targetY - centerY * scale,
    });
  }, [shapesByBooth, isMobile]);

  const selectExhibitor = useCallback(function selectExhibitor(
    exhibitor: MapExhibitor,
    options: { shouldFocusMap?: boolean; focusMap?: boolean; keepView?: boolean } = {},
  ) {
    setSelectedNo(exhibitor.no);
    setIsIntroductionExpanded(false);
    if (!options.keepView && (!isMobile || options.shouldFocusMap || options.focusMap)) {
      // transformRef 사용 → transform state 의존성 제거
      const nextScale = options.focusMap
        ? Math.max(transformRef.current.scale, FOCUS_SCALE)
        : undefined;
      centerBooth(boothForMap(exhibitor), nextScale);
    }
    if (isMobile) {
      // topPanelRef DOM 직접 읽기 → topPanelHeight state 의존성 제거
      const panelH =
        topPanelRef.current?.getBoundingClientRect().height ??
        getViewportHeight() * TOP_PANEL_HEIGHT_RATIO;
      setSheetOffset(computeSnapOffsets(panelH).expanded);
      setIsMobileDetailOpen(true);
    }
  }, [isMobile, centerBooth]);

  /** 지도 부스 버튼 전용 — keepView:true 고정, MapBoothLayer 에 안정 참조로 전달 */
  const onSelectBoothExhibitor = useCallback((exhibitor: MapExhibitor) => {
    selectExhibitor(exhibitor, { keepView: true });
  }, [selectExhibitor]);

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
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const mobile = window.innerWidth < 768;
    setTransform(computeFitTransform(rect.width, rect.height, mobile));
  }

  function startPan(pointerId: number, point: { x: number; y: number }) {
    dragRef.current = {
      pointerId,
      startX: point.x,
      startY: point.y,
      originX: transformRef.current.x,
      originY: transformRef.current.y,
    };
  }

  function startPinch(points: { x: number; y: number }[]) {
    const viewport = viewportRef.current;
    if (!viewport || points.length < 2) return;

    const rect = viewport.getBoundingClientRect();
    const center = centerBetween(points[0], points[1]);
    const anchorX = center.x - rect.left;
    const anchorY = center.y - rect.top;
    const current = transformRef.current;

    pinchRef.current = {
      startDistance: distanceBetween(points[0], points[1]),
      startScale: current.scale,
      worldX: (anchorX - current.x) / current.scale,
      worldY: (anchorY - current.y) / current.scale,
    };
  }

  function closeTopPanel() {
    setSheetOffset(computeSnapOffsets(getTopPanelHeight()).collapsed);
    setIsEventPanelOpen(false);
    setIsMobileDetailOpen(false);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const points = Array.from(activePointersRef.current.values());
    if (points.length >= 2) {
      startPinch(points);
      setIsDragging(false);
      return;
    }

    startPan(event.pointerId, { x: event.clientX, y: event.clientY });
    setIsDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!activePointersRef.current.has(event.pointerId)) return;
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const points = Array.from(activePointersRef.current.values());
    if (points.length >= 2) {
      const viewport = viewportRef.current;
      if (!viewport || pinchRef.current.startDistance <= 0) return;

      const rect = viewport.getBoundingClientRect();
      const center = centerBetween(points[0], points[1]);
      const anchorX = center.x - rect.left;
      const anchorY = center.y - rect.top;
      const nextScale = clamp(
        pinchRef.current.startScale *
          (distanceBetween(points[0], points[1]) / pinchRef.current.startDistance),
        MIN_SCALE,
        MAX_SCALE,
      );

      // 핀치 — 명령형 DOM 갱신
      applyTransformImperative({
        scale: nextScale,
        x: anchorX - pinchRef.current.worldX * nextScale,
        y: anchorY - pinchRef.current.worldY * nextScale,
      });
      return;
    }

    if (!isDragging || dragRef.current.pointerId !== event.pointerId) return;

    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;

    // 드래그 — 명령형 DOM 갱신
    applyTransformImperative({
      ...transformRef.current,
      x: dragRef.current.originX + dx,
      y: dragRef.current.originY + dy,
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    activePointersRef.current.delete(event.pointerId);

    const points = Array.from(activePointersRef.current.entries());
    if (points.length >= 2) {
      startPinch(points.map(([, point]) => point));
      return;
    }

    if (points.length === 1) {
      const [pointerId, point] = points[0];
      startPan(pointerId, point);
      setIsDragging(true);
      return;
    }

    if (dragRef.current.pointerId === event.pointerId || points.length === 0) {
      // 제스처 종료 — transformRef 를 state 로 커밋 (한 번만 재렌더)
      setTransform({ ...transformRef.current });
      setIsDragging(false);
    }
  }

  // ── 모바일 상단 패널 드래그 핸들러 (지도 pan/zoom과 동일한 pointer capture 패턴) ──

  function handleSheetPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const now = performance.now();
    sheetDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startOffset: sheetOffset,
      currentOffset: sheetOffset,
      lastY: event.clientY,
      lastTime: now,
      velocity: 0,
      didDrag: false,
    };
    setIsSheetDragging(true);
  }

  function toggleTopPanel() {
    const now = performance.now();
    if (now - lastSheetToggleTimeRef.current < 120) return;

    lastSheetToggleTimeRef.current = now;
    const offsets = computeSnapOffsets(getTopPanelHeight());
    setSheetOffset((current) =>
      Math.abs(current - offsets.expanded) < 1 ? offsets.collapsed : offsets.expanded,
    );
  }

  function handleSheetPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (sheetDragRef.current.pointerId !== event.pointerId) return;

    const now = performance.now();
    const elapsed = Math.max(1, now - sheetDragRef.current.lastTime);
    const dy = event.clientY - sheetDragRef.current.startY;
    const { expanded, collapsed } = computeSnapOffsets(getTopPanelHeight());
    const newOffset = clamp(sheetDragRef.current.startOffset + dy, collapsed, expanded);

    sheetDragRef.current.didDrag = sheetDragRef.current.didDrag || Math.abs(dy) > 4;
    sheetDragRef.current.velocity = (event.clientY - sheetDragRef.current.lastY) / elapsed;
    sheetDragRef.current.lastY = event.clientY;
    sheetDragRef.current.lastTime = now;
    sheetDragRef.current.currentOffset = newOffset;
    setSheetOffset(newOffset);
  }

  function handleSheetPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (sheetDragRef.current.pointerId !== event.pointerId) return;
    setIsSheetDragging(false);

    const offsets = computeSnapOffsets(getTopPanelHeight());
    const current = sheetDragRef.current.currentOffset;

    if (!sheetDragRef.current.didDrag) {
      toggleTopPanel();
      return;
    }

    const threshold = (offsets.expanded + offsets.collapsed) / 2;
    const velocity = sheetDragRef.current.velocity;

    if (velocity > 0.35) {
      setSheetOffset(offsets.expanded);
      return;
    }

    if (velocity < -0.35) {
      setSheetOffset(offsets.collapsed);
      return;
    }

    setSheetOffset(current > threshold ? offsets.expanded : offsets.collapsed);
  }

  // 화면 회전 시 스냅 오프셋 재클램프
  useEffect(() => {
    function syncPanelSnap() {
      const measuredHeight =
        topPanelRef.current?.getBoundingClientRect().height ??
        getViewportHeight() * TOP_PANEL_HEIGHT_RATIO;
      setTopPanelHeight(measuredHeight);

      const offsets = computeSnapOffsets(measuredHeight);
      setSheetOffset((current) => (current > -1 ? offsets.expanded : offsets.collapsed));
    }

    syncPanelSnap();
    const observer = new ResizeObserver(syncPanelSnap);
    if (topPanelRef.current) observer.observe(topPanelRef.current);

    window.addEventListener('resize', syncPanelSnap);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncPanelSnap);
    };
  }, [isMobile]);

  useEffect(() => {
    listItemRefsRef.current.get(selectedNo)?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [selectedNo]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const mobile = window.innerWidth < 768;
    setTransform(computeFitTransform(rect.width, rect.height, mobile));
  }, []);

  const scrollPaddingBottom = 0;

  // 찜 바 — 데스크톱 하단과 모바일 드로어 최상단에서 공유
  const favoritesBar = favoriteItems.length ? (
    <DndContext
      sensors={favoriteSensors}
      collisionDetection={closestCenter}
      onDragEnd={onFavoriteDragEnd}
    >
      <SortableContext items={favorites} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-1.5 overflow-x-auto px-3 py-2">
          {favoriteItems.map((item) => {
            const favKey = getFavoriteKey(item);
            const booth = boothForMap(item);
            return (
              <SortableFavoriteChip
                key={favKey}
                favKey={favKey}
                label={`${booth} ${getDisplayName(item)}`}
                onSelect={() => selectExhibitor(item, { focusMap: true })}
                onRemove={() => toggleFavorite(favKey)}
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
      <div className="border-b border-border p-3 md:p-4">
        <div className="flex items-center gap-2 border border-border bg-white px-2.5 md:px-3">
          <Search className="h-4 w-4 shrink-0" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="출판사, 부스, 국가 검색"
            className="h-9 border-0 px-0 text-sm shadow-none focus-visible:ring-0 md:h-11"
          />
          <span className="shrink-0 text-xs font-bold tabular-nums text-brand-muted">
            {filteredExhibitors.length}/{exhibitors.length}
          </span>
          {query ? (
            <button
              type="button"
              aria-label="검색어 지우기"
              onClick={() => setQuery('')}
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {categoryOptions.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={cn(
                'shrink-0 cursor-pointer border border-border px-3 py-1.5 text-xs font-black',
                selectedCategory === category
                  ? 'bg-brand-ink text-white'
                  : 'bg-white hover:bg-brand-yellow',
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
            const favKey = getFavoriteKey(exhibitor);
            const isSelected = exhibitor.no === selected?.no;
            const isFavorite = favoriteSet.has(favKey);

            return (
              <li
                key={exhibitor.no}
                ref={(node) => {
                  if (node) listItemRefsRef.current.set(exhibitor.no, node);
                  else listItemRefsRef.current.delete(exhibitor.no);
                }}
              >
                <button
                  type="button"
                  onClick={() => selectExhibitor(exhibitor, { focusMap: true })}
                  className={cn(
                    'grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left transition',
                    isSelected
                      ? 'bg-brand-ink text-white'
                      : 'hover:bg-brand-hover focus-visible:bg-brand-hover',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold">
                      {getDisplayName(exhibitor)}
                    </span>
                    <span
                      className={cn(
                        'block truncate text-xs',
                        isSelected ? 'text-white/70' : 'text-brand-muted',
                      )}
                    >
                      {exhibitor.nameEn || exhibitor.countryEn || 'Seoul International Book Fair'}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    {isFavorite ? (
                      <span
                        role="button"
                        aria-label="찜 해제"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(favKey);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            toggleFavorite(favKey);
                          }
                        }}
                        className="-my-1 inline-flex h-9 w-9 cursor-pointer items-center justify-center [&:hover>svg]:fill-brand-coral/40 [&:hover>svg]:text-brand-coral/40"
                      >
                        <Heart className="h-4 w-4 fill-brand-coral text-brand-coral transition-colors" />
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        'min-w-16 border px-2 py-1 text-center text-xs font-black',
                        isSelected ? 'border-white/40' : 'border-border',
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
      {/* 모바일: 상단 액션 줄 — < 뒤로가기(좌) / ♡·>(우) */}
      {isMobile && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsMobileDetailOpen(false)}
              aria-label="목록으로 돌아가기"
              className="size-8 shrink-0 rounded-none border-border bg-white hover:bg-brand-yellow"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="border border-border bg-brand-ink px-2 py-0.5 text-xs font-black text-white">
              {selectedBooth}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FavoriteButton
              isFavorite={!!selected && favoriteSet.has(getFavoriteKey(selected))}
              onToggle={() => selected && toggleFavorite(getFavoriteKey(selected))}
              className="size-8 md:size-8"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsEventPanelOpen(true)}
              aria-label="출판사 상세 패널 열기"
              className="size-8 rounded-none border border-border bg-brand-yellow hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {/* 콘텐츠 + 데스크톱 액션 */}
      <div className={cn(!isMobile && 'flex items-start justify-between gap-3')}>
        <div className={cn('min-w-0', !isMobile && 'flex-1')}>
          {!isMobile && (
            <p className="inline-flex border border-border bg-brand-ink px-2 py-0.5 text-xs font-black text-white md:px-3 md:py-1 md:text-sm">
              {selectedBooth}
            </p>
          )}
          <h2 className="text-base font-black md:mt-2 md:text-xl">{getDisplayName(selected)}</h2>
          {selected.nameEn ? (
            <p className="text-sm font-bold text-brand-green-deep">{selected.nameEn}</p>
          ) : null}
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
        </div>
        {/* 데스크톱 전용 액션 버튼 */}
        {!isMobile && (
          <div className="flex shrink-0 items-center gap-2">
            <FavoriteButton
              isFavorite={!!selected && favoriteSet.has(getFavoriteKey(selected))}
              onToggle={() => selected && toggleFavorite(getFavoriteKey(selected))}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsEventPanelOpen(true)}
              aria-label="출판사 상세 패널 열기"
              className="size-9 rounded-none border border-border bg-brand-yellow hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex w-full flex-nowrap items-center gap-1.5 overflow-hidden">
        {selected.instagramUrl ? (
          <ExternalLinkButton href={selected.instagramUrl} kind="instagram" tone="white" mobileIconOnly />
        ) : null}
        {selected.homepageUrl ? (
          <ExternalLinkButton href={selected.homepageUrl} kind="homepage" tone="white" mobileIconOnly />
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => centerBooth(selectedBooth)}
          className="ml-auto h-7 shrink-0 rounded-none border-border bg-white px-2 text-[10px] font-black hover:bg-brand-yellow md:h-9 md:px-2.5 md:text-[11px] [&_svg:not([class*='size-'])]:size-3 md:[&_svg:not([class*='size-'])]:size-3.5"
        >
          <MapPin />
          지도
        </Button>
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

      {selectedBoothPeers.length ? (
        <div className="mt-3 border border-border/50 bg-brand-panel/80 p-2">
          <p className="text-[11px] font-black text-brand-muted">
            같은 부스 출판사 <span className="text-foreground">{selectedBoothPeers.length}곳</span>
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {selectedBoothPeers.map((exhibitor) => (
              <button
                key={exhibitor.no}
                type="button"
                onClick={() => selectExhibitor(exhibitor, { focusMap: true })}
                className="border border-border bg-white px-1.5 py-0.5 text-[11px] font-black hover:bg-brand-yellow"
              >
                {getDisplayName(exhibitor)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  ) : null;

  // 이벤트 상세 — 데스크톱은 플로팅 aside, 모바일은 시트 안 뷰로 공유
  const eventContent = selected ? (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-border bg-brand-yellow p-4">
        {isMobile && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setIsEventPanelOpen(false)}
            aria-label="출판사로 돌아가기"
            className="size-8 shrink-0 rounded-none border-border bg-white hover:bg-white/80 md:size-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <p className="inline-flex border border-border bg-brand-ink px-2 py-1 text-xs font-black text-white">
            {selectedBooth}
          </p>
          <h3 className="mt-2 truncate text-lg font-black">{getDisplayName(selected)}</h3>
          {selected.introduction ? (
            <div className="mt-3">
              <p
                className={cn(
                  'text-xs font-bold leading-5 text-brand-green-ink',
                  !isIntroductionExpanded && 'line-clamp-3',
                )}
              >
                {selected.introduction}
              </p>
              <button
                type="button"
                onClick={() => setIsIntroductionExpanded((current) => !current)}
                className="mt-2 cursor-pointer border border-border bg-white px-2 py-1 text-xs font-black hover:bg-brand-green"
              >
                {isIntroductionExpanded ? '접기' : '더보기'}
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
      <div className={cn('p-3', !isMobile && 'min-h-0 flex-1 overflow-y-auto')}>
        <div className="mb-3 flex items-center justify-between border border-border bg-white px-3 py-2">
          <span className="text-xs font-black text-brand-muted">이벤트</span>
          <strong className="text-sm font-black">{selectedBoothEvents.length}개</strong>
        </div>
        <BoothEventDetailList events={selectedBoothEvents} />
      </div>
      <div className="border-t border-border bg-white px-4 py-3 text-xs font-bold text-brand-muted">
        <CalendarDays className="mr-1 inline h-4 w-4 align-[-3px]" />
        실제 이벤트 데이터 연결 전 레이아웃 골격입니다.
      </div>
    </>
  ) : null;

  return (
    <div className="h-full bg-background text-foreground">
      <section className="grid h-full grid-cols-1 md:grid-cols-[390px_minmax(0,1fr)]">
        {/* 사이드바 — 모바일(768px 미만)에서는 hidden, 내용은 아래 바텀시트와 공유 */}
        <aside className="hidden h-full min-h-0 flex-col border-b border-border bg-brand-panel md:flex md:border-r md:border-b-0">
          {listContent}
          {detailContent}
        </aside>

        <section className="flex h-full min-h-0 flex-col bg-brand-surface">
          <div className="hidden items-center justify-between gap-3 border-b border-border bg-brand-panel px-4 py-3 md:flex">
            <div className="flex min-w-0 items-center gap-3">
              <Info className="h-4 w-4 shrink-0 text-brand-subtle" />
              <div className="grid min-w-0 gap-0.5">
                <p className="truncate text-xs font-bold text-brand-subtle">
                  서울국제도서전 비공식 프로젝트입니다.
                </p>
                <p className="truncate text-xs font-bold text-brand-subtle">
                  부스 및 참가사 정보는{' '}
                  <a
                    href="https://sibf.kr/"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    서울국제도서전 공식 홈페이지
                  </a>
                  를 기반으로 제작되었습니다.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                ref={routeDesktopRef}
                className="relative"
                onMouseEnter={() => !isRouteVisible && setIsRoutePreview(true)}
                onMouseLeave={() => setIsRoutePreview(false)}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (favoriteBooths.length < 2) {
                      setIsTooltipOpen((v) => !v);
                      return;
                    }
                    const next = !isRouteVisible;
                    setIsRouteVisible(next);
                    setIsTooltipOpen(next);
                  }}
                  aria-label="경로 표시 토글"
                  className={cn(
                    'rounded-none border-border',
                    isRouteVisible && favoriteBooths.length >= 2
                      ? 'bg-brand-coral text-white hover:bg-brand-coral hover:text-white'
                      : 'bg-white',
                  )}
                >
                  <Route className="h-4 w-4" />
                  경로
                </Button>
                {(isTooltipOpen || isRoutePreview) ? (
                  <div className="absolute top-full left-1/2 z-[60] mt-1 w-52 -translate-x-1/2 border border-border bg-white px-3 py-2 shadow-brutal-sm text-xs font-bold text-brand-muted">
                    {favoriteBooths.length < 2
                      ? '찜한 부스가 2개 이상이어야 경로를 볼 수 있어요.'
                      : '찜 내역 탭에서 드래그해 순서를 바꿀 수 있어요.'}
                  </div>
                ) : null}
              </div>
              <ExportFavoritesButton
                favKeys={favorites}
                routePath={routePath}
                routeBadges={routeBadges}
                eventsByBooth={eventsByBooth}
              />
            </div>
          </div>

          <div
            ref={viewportRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={cn(
              'relative flex-1 overflow-hidden bg-brand-map touch-none select-none [-webkit-touch-callout:none]',
              isDragging ? 'cursor-grabbing' : 'cursor-grab',
            )}
          >
            <div
              ref={mapWrapperRef}
              className="absolute top-0 left-0 overflow-hidden border border-border bg-white shadow-brutal"
              style={{
                width: MAP_WIDTH,
                height: MAP_HEIGHT,
                // translate3d → GPU 합성 레이어 힌트
                transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
                transformOrigin: '0 0',
                willChange: isDragging ? 'transform' : 'auto',
              }}
            >
              <Image
                src="/data/sibf-2026-floor-plan.svg"
                alt="2026 서울국제도서전 부스 배치도"
                fill
                priority
                unoptimized
                className="select-none object-contain pointer-events-none [-webkit-touch-callout:none]"
                draggable={false}
              />

              {/* 부스 클릭 레이어 + 선택 하이라이트 + 경로 오버레이 */}
              <MapBoothLayer
                shapes={shapes}
                exhibitorsByBooth={exhibitorsByBooth}
                selectedBooth={selectedBooth}
                selectedShape={selectedShape}
                favoriteSet={favoriteSet}
                routeOrderByBooth={routeOrderByBooth}
                routePath={routePath}
                onSelectExhibitor={onSelectBoothExhibitor}
              />

              {/* 정적 부스 라벨 레이어 — 맵 좌표계 안쪽, CSS transform 으로 줌/팬 */}
              <MapLabelLayer
                shapes={shapes}
                labelExhibitorsByBooth={labelExhibitorsByBooth}
                selectedBooth={selectedBooth}
                favoriteSet={favoriteSet}
              />
            </div>

            {routeBadges.map((badge) => (
              <div
                key={badge.boothNumber}
                ref={(el) => {
                  if (el) badgeRefsRef.current.set(badge.boothNumber, el);
                  else badgeRefsRef.current.delete(badge.boothNumber);
                }}
                className="pointer-events-none absolute z-[46] flex items-center justify-center border-2 border-white bg-brand-coral font-black text-white shadow-brutal-sm"
                style={{
                  left: transform.x + badge.labelX * transform.scale,
                  top: transform.y + badge.labelY * transform.scale,
                  width: routeBadgeSize,
                  height: routeBadgeSize,
                  minWidth: routeBadgeSize,
                  fontSize: clamp(routeBadgeSize * 0.48, 10, 14),
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {badge.index + 1}
              </div>
            ))}

            {isMobile && isTopPanelExpanded ? (
              <button
                type="button"
                aria-label="선택 패널 바깥 영역 닫기"
                className="absolute inset-0 cursor-default bg-transparent md:hidden"
                style={{ zIndex: 49 }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  closeTopPanel();
                }}
              />
            ) : null}

            {isMobile ? (
              <div
                ref={topPanelRef}
                data-map-overlay
                className="absolute inset-x-0 top-0 z-50 flex flex-col border-b border-border/60 bg-brand-panel md:hidden"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerMove={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onTouchEnd={(event) => event.stopPropagation()}
                style={{
                  height: `${TOP_PANEL_HEIGHT_RATIO * 100}dvh`,
                  transform: `translate3d(0, ${sheetOffset}px, 0)`,
                  transition: isSheetDragging
                    ? 'none'
                    : 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
                }}
              >
                <h2 className="sr-only">출판사 검색 및 목록</h2>
                <div
                  className="min-h-0 flex-1 overflow-hidden"
                >
                  {isEventPanelOpen && selected ? (
                    <div className="h-full overflow-y-auto">{eventContent}</div>
                  ) : isMobileDetailOpen ? (
                    <div className="h-full overflow-y-auto bg-brand-green">{detailContent}</div>
                  ) : (
                    <div className="flex h-full min-h-0 flex-col">
                      {favoriteItems.length ? (
                        <div className="shrink-0 border-b border-border bg-brand-panel">
                          {favoritesBar}
                        </div>
                      ) : null}
                      {listContent}
                    </div>
                  )}
                </div>
                <div
                  role="button"
                  aria-label={isTopPanelExpanded ? '선택 패널 닫기' : '선택 패널 열기'}
	                  aria-expanded={isTopPanelExpanded}
	                  className="flex h-[50px] cursor-grab touch-none items-center justify-between gap-2 border-t border-border/60 bg-brand-yellow px-3 active:cursor-grabbing"
                  onPointerDown={handleSheetPointerDown}
                  onPointerMove={handleSheetPointerMove}
                  onPointerUp={handleSheetPointerUp}
                  onPointerCancel={handleSheetPointerUp}
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                    {([
                      ['bg-zone-general',  '일반'],
                      ['bg-zone-special',  '특별전시'],
                      ['bg-zone-hall',     '독자만남홀'],
                      ['bg-zone-indie',    '책마을'],
                      ['bg-zone-vip',      '특별구역'],
                      ['bg-zone-facility', '전시·WC'],
                    ] as const).map(([bg, label]) => (
                      <span key={label} className="inline-flex items-center gap-1">
                        <span className={cn('h-2.5 w-2.5 shrink-0 border border-border/40', bg)} />
                        <span className="text-[10px] font-bold text-brand-rust">{label}</span>
                      </span>
                    ))}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 border border-border bg-white px-1.5 py-0.5 text-xs font-black">
                      {isTopPanelExpanded ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" />
                          닫기
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" />
                          열기
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* 모바일 액션 — 기존 줌 컨트롤 위치에 핵심 액션만 노출 */}
            <div
              className="pointer-events-auto absolute top-[58px] right-2 z-40 flex items-center gap-1.5 md:hidden"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div ref={routeMobileRef} className="relative">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (favoriteBooths.length < 2) {
                      setIsTooltipOpen((v) => !v);
                      return;
                    }
                    const next = !isRouteVisible;
                    setIsRouteVisible(next);
                    setIsTooltipOpen(next);
                  }}
                  aria-label="경로 표시 토글"
                  className={cn(
                    'rounded-none border-border bg-white shadow-brutal-sm',
                    isRouteVisible && favoriteBooths.length >= 2
                      ? 'bg-brand-coral text-white hover:bg-brand-coral hover:text-white'
                      : 'bg-white',
                  )}
                >
                  <Route className="h-4 w-4" />
                  경로
                </Button>
                {isTooltipOpen ? (
                  <div className="absolute top-full left-1/2 z-[60] mt-1 w-52 -translate-x-1/2 border border-border bg-white px-3 py-2 shadow-brutal-sm text-xs font-bold text-brand-muted">
                    {favoriteBooths.length < 2
                      ? '찜한 부스가 2개 이상이어야 경로를 볼 수 있어요.'
                      : (
                        <>
                          <span className="block">찜 내역 탭에서 드래그해 순서를 바꿀 수 있어요.</span>
                          <span className="mt-1 block">경로 버튼을 켜고 PDF를 저장하면 경로도 함께 저장돼요.</span>
                        </>
                      )}
                  </div>
                ) : null}
              </div>
              <ExportFavoritesButton
                favKeys={favorites}
                routePath={routePath}
                routeBadges={routeBadges}
                eventsByBooth={eventsByBooth}
              />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={resetMap}
                aria-label="지도 처음 위치로"
                className="rounded-none border-border bg-white shadow-brutal-sm"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>

            {/* 줌 컨트롤 — 데스크톱 지도 우측 상단 플로팅 */}
            <div
              className="pointer-events-auto absolute top-3 right-4 z-50 hidden items-center border border-border bg-white shadow-brutal-sm md:flex"
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
              <span ref={zoomPctRef} className="min-w-14 px-2 text-center text-xs font-black">
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
                <Maximize className="h-4 w-4" />
              </Button>
            </div>


            {/* 데스크톱 전용 플로팅 이벤트 패널 — 모바일은 바텀시트 안 뷰로 표시 */}
            {!isMobile && isEventPanelOpen && selected ? (
              <aside
                data-map-overlay
                onPointerDown={(event) => event.stopPropagation()}
                className="absolute inset-x-4 top-16 bottom-4 z-[60] flex flex-col border border-border bg-brand-panel shadow-brutal sm:inset-x-auto sm:left-4 sm:w-[360px]"
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

    </div>
  );
}
