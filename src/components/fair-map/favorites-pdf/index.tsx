"use client";

import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { BoothEvent } from "../booth-events";
import { useBoothMemo } from "../use-booth-memo";
import {
  buildFavoriteItems,
  ExportHallTable,
  ExportListPage,
  ExportMapPage,
  type ExportRouteBadge,
  type ExportRoutePoint,
} from "./export-map-document";
import { useExportFavoritesPdf } from "./use-export-favorites-pdf";

interface ExportFavoritesButtonProps {
  /** Favorite keys (exhibitor.no strings) — passed from the parent's useFavorites() result. */
  favKeys: string[];
  routePath?: ExportRoutePoint[];
  routeBadges?: ExportRouteBadge[];
  /** All booth events keyed by exhibitor.no string — from the server prop. */
  eventsByBooth?: Record<string, BoothEvent[]>;
}

/**
 * Renders a "PDF 저장" button and mounts all off-screen capture nodes:
 *   - Full-resolution map (for cropping into hall pages)
 *   - Hall A & B booth-number tables (top band on each hall page)
 *   - Favourites list (page 3) — includes events (title+time) and user memos
 *
 * All nodes are hidden via position: fixed / left: -99999px.
 */
export function ExportFavoritesButton({
  favKeys,
  routePath = [],
  routeBadges = [],
  eventsByBooth = {},
}: ExportFavoritesButtonProps) {
  const items = buildFavoriteItems(favKeys);
  const { memos } = useBoothMemo();
  const { mapRef, listRef, tableRefA, tableRefB, exportPdf, isExporting } =
    useExportFavoritesPdf();

  return (
    <>
      <div className="group relative shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={exportPdf}
          disabled={isExporting || items.length === 0}
          className="w-full rounded-none border border-border bg-white hover:bg-brand-yellow"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          PDF 저장
        </Button>
        <div className="absolute top-full left-1/2 z-[60] mt-1 hidden w-52 -translate-x-1/2 border border-border bg-white px-3 py-2 shadow-brutal-sm text-xs font-bold text-brand-muted group-hover:block">
          경로 버튼을 켜고 저장하면 경로도 함께 저장돼요.
        </div>
      </div>

      {/* Off-screen capture nodes — not visible to the user */}
      <ExportMapPage ref={mapRef} items={items} routePath={routePath} routeBadges={routeBadges} />
      <ExportListPage ref={listRef} items={items} eventsByBooth={eventsByBooth} memos={memos} />
      <ExportHallTable ref={tableRefA} hall="A" favKeys={favKeys} />
      <ExportHallTable ref={tableRefB} hall="B" favKeys={favKeys} />
    </>
  );
}
