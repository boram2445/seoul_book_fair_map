import { useRef, useState } from "react";
import { toast } from "sonner";

import { MAP_EXPORT_HEIGHT, MAP_EXPORT_WIDTH } from "./export-map-document";

// A4 portrait dimensions in points (72 pt = 1 inch)
const A4_W = 595.28;
const A4_H = 841.89;
const MAP_MARGIN = 8; // pt
const LIST_MARGIN = 24; // pt

/**
 * Orchestrates the two-step PDF export:
 *   1. Rasterise the off-screen map node → PNG via html-to-image
 *   2. Rasterise the off-screen list node → PNG via html-to-image
 *   3. Compose both images into a two-page PDF via jsPDF and trigger download
 *
 * Both heavy libraries are loaded lazily (dynamic import) so they are excluded
 * from the initial bundle and never execute on the server.
 */
export function useExportFavoritesPdf() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  async function exportPdf() {
    const mapNode = mapRef.current;
    const listNode = listRef.current;
    if (!mapNode || !listNode) return;

    setIsExporting(true);
    try {
      // Ensure the floor-plan SVG has finished loading before we capture.
      // img.decode() rejects if the image failed to load.
      const svgImg = mapNode.querySelector("img");
      if (svgImg) {
        if (!svgImg.complete) {
          await new Promise<void>((resolve, reject) => {
            svgImg.addEventListener("load", () => resolve(), { once: true });
            svgImg.addEventListener("error", () => reject(new Error("SVG 로드 실패")), {
              once: true,
            });
          });
        }
        await svgImg.decode().catch(() => {
          // Already decoded — safe to ignore
        });
      }

      // Lazy-load rasterisation + PDF libraries
      const [{ toPng }, { jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("jspdf"),
      ]);

      // Rasterise both nodes concurrently.
      // Map at pixelRatio 1 is already ~3230 × 3650 px (≈ 390 DPI on A4).
      // List at pixelRatio 2 gives crisp text at a smaller rendered size.
      const [mapDataUrl, listDataUrl] = await Promise.all([
        toPng(mapNode, { pixelRatio: 1, cacheBust: false }),
        toPng(listNode, { pixelRatio: 2, cacheBust: false }),
      ]);

      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

      // ── Page 1: Map ────────────────────────────────────────────────
      // Keep the full map visible, but use a tighter page margin than the list page.
      const mapImgW = A4_W - MAP_MARGIN * 2;
      const mapImgH = mapImgW * (MAP_EXPORT_HEIGHT / MAP_EXPORT_WIDTH);
      doc.addImage(mapDataUrl, "PNG", MAP_MARGIN, MAP_MARGIN, mapImgW, mapImgH);

      // ── Page 2: List ───────────────────────────────────────────────
      // Use a dynamic page height so a long favourites list is never clipped.
      const listImgW = A4_W - LIST_MARGIN * 2;
      const listImgH = listImgW * (listNode.offsetHeight / listNode.offsetWidth);
      const listPageH = Math.max(A4_H, listImgH + LIST_MARGIN * 2);
      doc.addPage([A4_W, listPageH]);
      doc.addImage(listDataUrl, "PNG", LIST_MARGIN, LIST_MARGIN, listImgW, listImgH);

      doc.save("서울국제도서전-찜부스-2026.pdf");
    } catch {
      toast.error("PDF 저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsExporting(false);
    }
  }

  return { mapRef, listRef, exportPdf, isExporting };
}
