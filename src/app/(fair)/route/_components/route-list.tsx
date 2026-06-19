"use client";

import { useState, useMemo } from "react";
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
import { GripVertical, MapPinned, NotebookPen } from "lucide-react";

import { type BoothEvent } from "@/components/fair-map/booth-events";
import { getFavoriteKey } from "@/components/fair-map/map-helpers";
import { useFavorites } from "@/components/fair-map/use-favorites";
import { useBoothMemo } from "@/components/fair-map/use-booth-memo";
import { PublisherCard } from "@/components/fair-app/publisher-card";
import type { FairMapPublisher } from "@/lib/types/fair-map/type";
import { boothForMap } from "@/components/fair-map/map-helpers";

// ─── 개별 카드 ────────────────────────────────────────────────────────────────

function SortableBoothCard({
  favKey,
  exhibitor,
  index,
  memo,
  events,
  onMemoChange,
  onFavoriteToggle,
}: {
  favKey: string;
  exhibitor: FairMapPublisher;
  index: number;
  memo: string;
  events: BoothEvent[];
  onMemoChange: (booth: string, text: string) => void;
  onFavoriteToggle: (favKey: string) => void;
}) {
  const router = useRouter();
  const href = `/publishers/${exhibitor.no}`;
  const [localMemo, setLocalMemo] = useState(memo);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: favKey });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const memoEditor = (
    <>
      <div className="mb-2 flex items-center gap-2 text-xs font-black text-brand-muted">
        <NotebookPen className="h-3.5 w-3.5" />
        <span>방문 메모</span>
      </div>
      <textarea
        value={localMemo}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onChange={(e) => setLocalMemo(e.target.value)}
        onBlur={(e) => {
          if (e.target.value === memo) return;
          onMemoChange(favKey, e.target.value);
          toast.success("메모가 저장되었습니다.");
        }}
        placeholder="구매할 굿즈, 책, 방문 이유를 기록해보세요."
        rows={2}
        className="min-h-14 w-full resize-none border border-border bg-white px-3 py-2 text-sm font-bold leading-6 text-foreground placeholder:text-brand-muted focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
    </>
  );

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="border border-border bg-white"
    >
      <PublisherCard
        exhibitor={exhibitor}
        index={index}
        isFavorite={true}
        events={events}
        onFavoriteToggle={() => onFavoriteToggle(favKey)}
        onNavigate={() => router.push(href)}
        isDragging={isDragging}
        rankTone="green"
        maxEvents={3}
        eventsHref={href}
        leading={
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="flex cursor-grab items-center justify-center border-r border-border/20 bg-brand-panel text-brand-muted hover:bg-brand-hover active:cursor-grabbing touch-none"
            aria-label="순서 변경"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
        mobileBlock={
          <div className="border-t border-border/20 p-4 md:hidden">
            {memoEditor}
          </div>
        }
        desktopAside={<div>{memoEditor}</div>}
      />
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
            {favoriteItems.map(({ favKey, exhibitor }, index) => (
              <SortableBoothCard
                key={favKey}
                favKey={favKey}
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
