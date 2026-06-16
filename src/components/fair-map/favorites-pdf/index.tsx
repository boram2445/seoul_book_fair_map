"use client";

import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

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
}

/**
 * Renders a "PDF 저장" button and mounts all off-screen capture nodes:
 *   - Full-resolution map (for cropping into hall pages)
 *   - Hall A & B booth-number tables (top band on each hall page)
 *   - Favourites list (page 3)
 *
 * All nodes are hidden via position: fixed / left: -99999px.
 */
export function ExportFavoritesButton({
  favKeys,
  routePath = [],
  routeBadges = [],
}: ExportFavoritesButtonProps) {
  const items = buildFavoriteItems(favKeys);
  const { mapRef, listRef, tableRefA, tableRefB, exportPdf, isExporting } =
    useExportFavoritesPdf();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={exportPdf}
        disabled={isExporting || items.length === 0}
        className="shrink-0 rounded-none border border-border bg-white hover:bg-brand-yellow"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        PDF 저장
      </Button>

      {/* Off-screen capture nodes — not visible to the user */}
      <ExportMapPage ref={mapRef} items={items} routePath={routePath} routeBadges={routeBadges} />
      <ExportListPage ref={listRef} items={items} />
      <ExportHallTable ref={tableRefA} hall="A" favKeys={favKeys} />
      <ExportHallTable ref={tableRefB} hall="B" favKeys={favKeys} />
    </>
  );
}
