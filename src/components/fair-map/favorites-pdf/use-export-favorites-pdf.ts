import { useRef, useState } from "react";
import { toast } from "sonner";

import { HALL_REGIONS } from "./export-map-document";

// A4 portrait dimensions in points (72 pt = 1 inch)
const A4_W = 595.28;
const A4_H = 841.89;
// Landscape A4: width and height are swapped
const LANDSCAPE_W = A4_H; // 841.89
const LANDSCAPE_H = A4_W; // 595.28
const HALL_SIDE_M = 8;   // side/bottom margin pt
const HALL_LABEL_H = 22; // height reserved for hall name label
const HALL_TOP_M = HALL_SIDE_M + HALL_LABEL_H;
const HALL_GAP = 8;      // gap between table and map
const LIST_MARGIN = 24;  // pt

/**
 * Crops a rectangular region from a PNG data URL using an offscreen canvas.
 * Coordinates are in map pixels (pixelRatio 1 → 1:1 with map units).
 */
function cropToDataUrl(
  src: string,
  region: { x: number; y: number; width: number; height: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = region.width;
      canvas.height = region.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas 2d context unavailable"));
        return;
      }
      ctx.drawImage(
        img,
        region.x,
        region.y,
        region.width,
        region.height,
        0,
        0,
        region.width,
        region.height,
      );
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("crop image load failed"));
    img.src = src;
  });
}

/**
 * Orchestrates the three-page PDF export:
 *   1. Rasterise all off-screen nodes (map, list, hall tables A & B)
 *   2. Canvas-crop Hall A and Hall B from the full-map PNG
 *   3. Compose: Hall B (landscape) · Hall A (landscape) · List (portrait)
 *      Each hall page = top band (table) + bottom band (map crop) + hall label
 *
 * Heavy libraries are loaded lazily so they are excluded from the initial bundle.
 */
export function useExportFavoritesPdf() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const tableRefA = useRef<HTMLDivElement | null>(null);
  const tableRefB = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  async function exportPdf() {
    const mapNode = mapRef.current;
    const listNode = listRef.current;
    const tableANode = tableRefA.current;
    const tableBNode = tableRefB.current;
    if (!mapNode || !listNode || !tableANode || !tableBNode) return;

    setIsExporting(true);
    try {
      // Ensure the floor-plan SVG has finished loading before we capture.
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

      // Rasterise all nodes concurrently.
      // Map at pixelRatio 1 → 3230×3650 px (1:1 with map units).
      // Tables at 1.5 → crisp enough without blowing up memory.
      // List at 2 → crisp text at its smaller rendered size.
      const [mapDataUrl, listDataUrl, tableADataUrl, tableBDataUrl] = await Promise.all([
        toPng(mapNode, { pixelRatio: 1, cacheBust: false }),
        toPng(listNode, { pixelRatio: 2, cacheBust: false }),
        toPng(tableANode, { pixelRatio: 1.5, cacheBust: false }),
        toPng(tableBNode, { pixelRatio: 1.5, cacheBust: false }),
      ]);

      // Crop each hall from the full-map PNG
      const [hallADataUrl, hallBDataUrl] = await Promise.all([
        cropToDataUrl(mapDataUrl, HALL_REGIONS.A),
        cropToDataUrl(mapDataUrl, HALL_REGIONS.B),
      ]);

      // Create document with first page as landscape A4
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

      /**
       * Places one hall page: table band at top + map crop band below + hall label.
       * Table height is scaled to fit the available width, capped at 45% of content
       * height so the map always has room.
       */
      function placeHallPage(
        hallDataUrl: string,
        hallRegion: { width: number; height: number },
        tableDataUrl: string,
        tableNode: HTMLDivElement,
        label: string,
      ) {
        const availW = LANDSCAPE_W - HALL_SIDE_M * 2;
        const contentH = LANDSCAPE_H - HALL_TOP_M - HALL_SIDE_M;

        // Table: fit to available width; if that exceeds 70% of content height,
        // cap the height and shrink width proportionally (preserve aspect ratio).
        // The map shows only booth numbers so it stays legible even when small;
        // the table therefore gets the larger share of the page.
        const tableAspect = tableNode.offsetWidth / tableNode.offsetHeight;
        const naturalTableH = availW / tableAspect;
        const tableImgH = Math.min(naturalTableH, contentH * 0.70);
        const tableImgW = tableImgH * tableAspect;

        // Map: remaining height
        const mapAvailH = contentH - tableImgH - HALL_GAP;
        const mapAvailW = availW;
        const mapAspect = hallRegion.width / hallRegion.height;
        const pageMapAspect = mapAvailW / mapAvailH;
        let mapImgW: number, mapImgH: number;
        if (mapAspect >= pageMapAspect) {
          mapImgW = mapAvailW;
          mapImgH = mapAvailW / mapAspect;
        } else {
          mapImgH = mapAvailH;
          mapImgW = mapAvailH * mapAspect;
        }

        const tableX = HALL_SIDE_M + (availW - tableImgW) / 2;
        const tableY = HALL_TOP_M;
        doc.addImage(tableDataUrl, "PNG", tableX, tableY, tableImgW, tableImgH);

        const mapX = HALL_SIDE_M + (mapAvailW - mapImgW) / 2;
        const mapY = tableY + tableImgH + HALL_GAP;
        doc.addImage(hallDataUrl, "PNG", mapX, mapY, mapImgW, mapImgH);

      }

      // ── Page 1: Hall B (landscape) ─────────────────────────────────
      placeHallPage(hallBDataUrl, HALL_REGIONS.B, tableBDataUrl, tableBNode, "Hall B");

      // ── Page 2: Hall A (landscape) ─────────────────────────────────
      doc.addPage([LANDSCAPE_W, LANDSCAPE_H]);
      placeHallPage(hallADataUrl, HALL_REGIONS.A, tableADataUrl, tableANode, "Hall A");

      // ── Page 3: List (portrait) ────────────────────────────────────
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

  return { mapRef, listRef, tableRefA, tableRefB, exportPdf, isExporting };
}
