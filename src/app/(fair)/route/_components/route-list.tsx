"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, ChevronRight, ExternalLink, GripVertical, Heart, Instagram, MapPinned, NotebookPen } from "lucide-react";

import { type BoothEvent, getEventScheduleLabel } from "@/components/fair-map/booth-events";
import { boothForMap, getFavoriteKey, getDisplayName } from "@/components/fair-map/map-helpers";
import { useFavorites } from "@/components/fair-map/use-favorites";
import { useBoothMemo } from "@/components/fair-map/use-booth-memo";
import type { FairMapPublisher } from "@/lib/types/fair-map/type";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── 개별 카드 ────────────────────────────────────────────────────────────────

function SortableBoothCard({
  favKey,
  booth,
  exhibitor,
  index,
  memo,
  events,
  onMemoChange,
  onFavoriteToggle,
}: {
  favKey: string;
  booth: string;
  exhibitor: FairMapPublisher;
  index: number;
  memo: string;
  events: BoothEvent[];
  onMemoChange: (booth: string, text: string) => void;
  onFavoriteToggle: (favKey: string) => void;
}) {
  // 마운트 시 초기값으로만 사용, 변경은 onBlur 저장
  const router = useRouter();
  const href = `/publishers/${exhibitor.no}`;
  const [localMemo, setLocalMemo] = useState(memo);
  const heartCount = exhibitor.favoriteCount + 1;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: favKey });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn("border border-border bg-white", isDragging && "opacity-50 shadow-brutal-sm")}
    >
      <div className="grid grid-cols-[42px_minmax(0,1fr)]">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex cursor-grab items-center justify-center border-r border-border bg-brand-panel text-brand-muted hover:bg-brand-hover active:cursor-grabbing touch-none"
          aria-label="순서 변경"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <article
          className="relative cursor-pointer transition-colors hover:bg-brand-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
          tabIndex={0}
          onClick={() => router.push(href)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            router.push(href);
          }}
        >
          {/* 상단 우측 액션 행: 링크 버튼(md) + 하트 */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
            {exhibitor.instagramUrl ? (
              <Button
                asChild
                type="button"
                variant="outline"
                size="sm"
                className="hidden md:inline-flex h-9 rounded-none border-border bg-white px-2.5 text-[11px] font-black hover:bg-brand-yellow"
              >
                <a href={exhibitor.instagramUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                  <Instagram className="h-3.5 w-3.5" />
                  Instagram
                </a>
              </Button>
            ) : null}
            {exhibitor.homepageUrl ? (
              <Button
                asChild
                type="button"
                variant="outline"
                size="sm"
                className="hidden md:inline-flex h-9 rounded-none border-border bg-white px-2.5 text-[11px] font-black hover:bg-brand-yellow"
              >
                <a href={exhibitor.homepageUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Homepage
                </a>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="찜 해제"
              className="size-8 rounded-none border-border bg-white shadow-brutal-sm hover:bg-brand-yellow md:size-9"
              onClick={(e) => { e.stopPropagation(); onFavoriteToggle(favKey); }}
            >
              <Heart className="h-3.5 w-3.5 fill-brand-coral text-brand-coral md:h-4 md:w-4" />
            </Button>
          </div>

          <div className="border-b border-border p-4 pr-14">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border border-border bg-brand-green px-2 py-1 text-xs font-black text-brand-green-ink">
                  {index + 1}
                </span>
                <span className="border border-border bg-brand-panel px-2 py-1 text-xs font-black text-brand-muted">
                  {booth}
                </span>
                <span className="inline-flex items-center gap-1 border border-border bg-white px-2 py-1 text-xs font-black text-brand-coral-deep">
                  <Heart className="h-3.5 w-3.5 fill-brand-coral text-brand-coral" />
                  {heartCount}
                </span>
              </div>
              <div className="mt-3 flex min-w-0 items-center gap-2">
                <h3 className="min-w-0 truncate text-base font-black md:text-lg">{getDisplayName(exhibitor)}</h3>
                <Link
                  href={`/publishers/${exhibitor.no}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex shrink-0 items-center justify-center text-brand-muted hover:text-brand-ink"
                  aria-label="출판사 상세 보기"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              {(exhibitor.nameEn || exhibitor.categories?.length) ? (
                <p className="mt-1.5 truncate text-xs font-bold text-brand-muted">
                  {[
                    exhibitor.nameEn,
                    [...new Set(exhibitor.categories ?? [])].slice(0, 6).join(", ") || null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
            </div>
            {/* 모바일 전용 링크 버튼 */}
            {(exhibitor.instagramUrl || exhibitor.homepageUrl) ? (
              <div className="mt-3 flex flex-wrap gap-2 md:hidden">
                {exhibitor.instagramUrl ? (
                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-none border-border bg-white px-2 text-[10px] font-black hover:bg-brand-yellow"
                  >
                    <a href={exhibitor.instagramUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                      <Instagram className="h-3 w-3" />
                      Instagram
                    </a>
                  </Button>
                ) : null}
                {exhibitor.homepageUrl ? (
                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-none border-border bg-white px-2 text-[10px] font-black hover:bg-brand-yellow"
                  >
                    <a href={exhibitor.homepageUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink className="h-3 w-3" />
                      Homepage
                    </a>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* 방문 메모 — 모바일 전용 단독 블록 */}
          <div className="border-t border-border p-4 md:hidden">
            <div className="mb-2 flex items-center gap-2 text-xs font-black text-brand-muted">
              <NotebookPen className="h-3.5 w-3.5" />
              <span>방문 메모</span>
            </div>
            <textarea
              value={localMemo}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setLocalMemo(e.target.value)}
              onBlur={(e) => {
                if (e.target.value === memo) return;
                onMemoChange(favKey, e.target.value);
                toast.success("메모가 저장되었습니다.");
              }}
              placeholder="구매할 책, 사인회 시간, 들를 이유를 적어두세요"
              rows={2}
              className="min-h-14 w-full resize-none border border-border bg-white px-3 py-2 text-sm font-bold leading-6 text-foreground placeholder:text-brand-muted focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
          {/* 모바일: 이벤트 있을 때만 인라인 표시 */}
          {events.length > 0 ? (
            <div className="border-t border-border p-3 md:hidden">
              <div className="flex items-center gap-1.5 pb-2 text-xs font-black text-brand-rust">
                <CalendarDays className="h-3.5 w-3.5" />
                이벤트 {events.length}개
              </div>
              <ul className="border border-border">
                {events.slice(0, 3).map((event) => (
                  <li
                    key={`${getEventScheduleLabel(event)}-${event.title}`}
                    className={cn(
                      "grid gap-2 border-b border-border/20 px-3 py-2 text-sm last:border-b-0",
                      event.startAt
                        ? "grid-cols-[8.25rem_minmax(0,1fr)]"
                        : "grid-cols-[5.75rem_minmax(0,1fr)]",
                    )}
                  >
                    <span className="font-mono text-xs font-black whitespace-nowrap text-brand-coral-deep">
                      {getEventScheduleLabel(event)}
                    </span>
                    <span className="flex min-w-0 flex-wrap items-center gap-x-1">
                      <span className="border border-border bg-white px-1.5 py-0.5 text-[11px] font-black">
                        {event.category}
                      </span>
                      <span className="font-bold">{event.title}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {/* 웹: 방문 메모(좌) + 이벤트 박스(우, 이벤트 있을 때만) */}
          <div className={cn("hidden border-t border-border p-4 md:grid md:gap-3", events.length > 0 && "lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]")}>
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-black text-brand-muted">
                <NotebookPen className="h-3.5 w-3.5" />
                <span>방문 메모</span>
              </div>
              <textarea
                value={localMemo}
                onChange={(e) => setLocalMemo(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value === memo) return;
                  onMemoChange(favKey, e.target.value);
                  toast.success("메모가 저장되었습니다.");
                }}
                placeholder="구매할 책, 사인회 시간, 들를 이유를 적어두세요"
                rows={2}
                className="min-h-14 w-full resize-none border border-border bg-white px-3 py-2 text-sm font-bold leading-6 text-foreground placeholder:text-brand-muted focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
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
                  {events.slice(0, 3).map((event) => (
                    <li
                      key={`${getEventScheduleLabel(event)}-${event.title}`}
                      className={cn(
                        "grid gap-2 border-b border-border/20 px-3 py-2 text-sm last:border-b-0",
                        event.startAt
                          ? "grid-cols-[8.25rem_minmax(0,1fr)]"
                          : "grid-cols-[5.75rem_minmax(0,1fr)]",
                      )}
                    >
                      <span className="font-mono text-xs font-black whitespace-nowrap text-brand-coral-deep">
                        {getEventScheduleLabel(event)}
                      </span>
                      <span className="flex min-w-0 flex-wrap items-center gap-x-1">
                        <span className="border border-border bg-white px-1.5 py-0.5 text-[11px] font-black">
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
      </div>
    </li>
  );
}

// ─── 메인 리스트 ──────────────────────────────────────────────────────────────

export function RouteList({
  publishers,
  eventsByBooth,
}: {
  publishers: FairMapPublisher[];
  eventsByBooth: Record<string, BoothEvent[]>;
}) {
  const { favorites, reorderFavorites, toggleFavorite } = useFavorites();
  const { memos, updateMemo } = useBoothMemo();

  const publisherByKey = useMemo(
    () => new Map(publishers.map((p) => [getFavoriteKey(p), p])),
    [publishers],
  );

  const favoriteItems = useMemo(() => {
    return favorites
      .map((key) => {
        const exhibitor = publisherByKey.get(key);
        return exhibitor ? { favKey: key, booth: boothForMap(exhibitor), exhibitor } : null;
      })
      .filter(
        (item): item is { favKey: string; booth: string; exhibitor: FairMapPublisher } => Boolean(item),
      );
  }, [favorites, publisherByKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = favorites.indexOf(String(active.id));
    const newIndex = favorites.indexOf(String(over.id));
    reorderFavorites(arrayMove(favorites, oldIndex, newIndex));
  }

  if (!favoriteItems.length) {
    return (
      <div className="grid min-h-72 place-items-center border border-border bg-brand-panel p-6 text-center">
        <div className="max-w-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center border border-border bg-brand-yellow shadow-brutal-sm">
            <MapPinned className="h-6 w-6" />
          </span>
          <p className="mt-5 text-xl font-black">아직 저장한 부스가 없습니다.</p>
          <p className="mt-2 text-sm font-bold leading-6 text-brand-muted">
            홈 지도에서 관심 부스를 찜하면 방문 순서와 메모를 여기에서 정리할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={favorites} strategy={verticalListSortingStrategy}>
          <ol className="grid gap-3">
            {favoriteItems.map(({ favKey, booth, exhibitor }, index) => (
              <SortableBoothCard
                key={favKey}
                favKey={favKey}
                booth={booth}
                exhibitor={exhibitor}
                index={index}
                memo={memos[favKey] ?? ""}
                events={eventsByBooth[String(exhibitor.no)] ?? []}
                onMemoChange={updateMemo}
                onFavoriteToggle={toggleFavorite}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}
