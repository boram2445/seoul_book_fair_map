"use client";

import { useState, useMemo } from "react";
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
import { CalendarDays, GripVertical, Heart, Instagram, MapPinned, NotebookPen } from "lucide-react";

import { getBoothEvents, getEventScheduleLabel } from "@/components/fair-map/booth-events";
import { boothForMap, getFavoriteKey, getDisplayName } from "@/components/fair-map/map-data";
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
  onMemoChange,
  onFavoriteToggle,
}: {
  favKey: string;
  booth: string;
  exhibitor: FairMapPublisher;
  index: number;
  memo: string;
  onMemoChange: (booth: string, text: string) => void;
  onFavoriteToggle: (favKey: string) => void;
}) {
  // 마운트 시 초기값으로만 사용, 변경은 onBlur 저장
  const [localMemo, setLocalMemo] = useState(memo);
  const events = getBoothEvents(booth);
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
        <article className="relative">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="찜 해제"
            className="absolute top-3 right-3 z-10 rounded-none border-border bg-white shadow-brutal-sm hover:bg-brand-yellow"
            onClick={() => onFavoriteToggle(favKey)}
          >
            <Heart className="h-4 w-4 fill-brand-coral text-brand-coral" />
          </Button>

          <div className="grid gap-3 border-b border-border p-4 pr-16 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
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
              <h3 className="mt-3 truncate text-lg font-black">{getDisplayName(exhibitor)}</h3>
              {exhibitor.nameEn ? (
                <p className="text-sm font-bold text-brand-muted">{exhibitor.nameEn}</p>
              ) : null}
              {exhibitor.categories?.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[...new Set(exhibitor.categories)].slice(0, 6).map((category) => (
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

            <div className="flex flex-wrap gap-2 md:justify-end md:pr-12">
              {exhibitor.instagramUrl ? (
                <Button
                  asChild
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-none border-border bg-brand-panel px-2 text-xs font-black hover:bg-brand-yellow md:h-9 md:px-3 md:text-sm"
                >
                  <a href={exhibitor.instagramUrl} target="_blank" rel="noreferrer">
                    <Instagram className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Instagram
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
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
                rows={4}
                className="min-h-24 w-full resize-none border border-border bg-white px-3 py-2 text-sm font-bold leading-6 text-foreground placeholder:text-brand-muted focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>

            <div className="border border-border bg-brand-surface">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-brand-rust">
                  <CalendarDays className="h-4 w-4" />
                  이벤트
                </span>
                <span className="text-xs font-black text-brand-muted">{events.length}개 예정</span>
              </div>
              <ul>
                {events.slice(0, 3).map((event) => (
                  <li
                    key={`${getEventScheduleLabel(event)}-${event.title}`}
                    className="grid grid-cols-[5.75rem_minmax(0,1fr)] gap-2 border-b border-border/20 px-3 py-2 text-sm last:border-b-0"
                  >
                    <span className="font-mono text-xs font-black whitespace-nowrap text-brand-coral-deep">
                      {getEventScheduleLabel(event)}
                    </span>
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
      </div>
    </li>
  );
}

// ─── 메인 리스트 ──────────────────────────────────────────────────────────────

export function RouteList({ publishers }: { publishers: FairMapPublisher[] }) {
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
