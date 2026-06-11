"use client";

import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { buildFavoriteItems, ExportListPage, ExportMapPage } from "./export-map-document";
import { useExportFavoritesPdf } from "./use-export-favorites-pdf";

interface ExportFavoritesButtonProps {
  /** Booth numbers to include — passed from the parent's useFavorites() result. */
  booths: string[];
}

/**
 * Renders a "PDF 저장" button and mounts the two off-screen capture nodes needed
 * for export. The nodes are hidden via position: fixed / left: -99999px so they
 * do not affect the visible layout.
 */
export function ExportFavoritesButton({ booths }: ExportFavoritesButtonProps) {
  const items = buildFavoriteItems(booths);
  const { mapRef, listRef, exportPdf, isExporting } = useExportFavoritesPdf();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={exportPdf}
        disabled={isExporting || items.length === 0}
        className="shrink-0 border-border bg-white hover:bg-brand-yellow"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        PDF 저장
      </Button>

      {/* Off-screen capture nodes — not visible to the user */}
      <ExportMapPage ref={mapRef} items={items} />
      <ExportListPage ref={listRef} items={items} />
    </>
  );
}
