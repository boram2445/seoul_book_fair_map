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
const LIST_MARGIN = 24; // pt

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
 *   1. Rasterise the off-screen map node → PNG via html-to-image
 *   2. Canvas-crop Hall A and Hall B from the full-map PNG
 *   3. Rasterise the off-screen list node → PNG via html-to-image
 *   4. Compose: Hall A (landscape) · Hall B (landscape) · List (portrait)
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

      // Rasterise the full map (pixelRatio 1 → 3230 × 3650 px, 1:1 with map units).
      // List at pixelRatio 2 gives crisp text at its smaller rendered size.
      const [mapDataUrl, listDataUrl] = await Promise.all([
        toPng(mapNode, { pixelRatio: 1, cacheBust: false }),
        toPng(listNode, { pixelRatio: 2, cacheBust: false }),
      ]);

      // Crop each hall from the full-map PNG
      const [hallADataUrl, hallBDataUrl] = await Promise.all([
        cropToDataUrl(mapDataUrl, HALL_REGIONS.A),
        cropToDataUrl(mapDataUrl, HALL_REGIONS.B),
      ]);

      // Create document with first page as landscape A4
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

      // Helper: fit a hall image into a landscape A4 page with a hall name label.
      // Reserves HALL_LABEL_H pt at the top for the title text.
      function placeHallImage(dataUrl: string, region: { width: number; height: number }, label: string) {
        const availW = LANDSCAPE_W - HALL_SIDE_M * 2;
        const availH = LANDSCAPE_H - HALL_TOP_M - HALL_SIDE_M;
        const aspect = region.width / region.height;
        const pageAspect = availW / availH;

        let imgW: number, imgH: number;
        if (aspect >= pageAspect) {
          imgW = availW;
          imgH = availW / aspect;
        } else {
          imgH = availH;
          imgW = availH * aspect;
        }

        const offsetX = HALL_SIDE_M + (availW - imgW) / 2;
        const offsetY = HALL_TOP_M + (availH - imgH) / 2;
        doc.addImage(dataUrl, "PNG", offsetX, offsetY, imgW, imgH);

        // Hall name label (coral, top-left)
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(23, 21, 17); // C.ink
        doc.text(label, HALL_SIDE_M, HALL_SIDE_M + 14);
      }

      // ── Page 1: Hall B (landscape) ─────────────────────────────────
      placeHallImage(hallBDataUrl, HALL_REGIONS.B, "Hall B");

      // ── Page 2: Hall A (landscape) ─────────────────────────────────
      doc.addPage([LANDSCAPE_W, LANDSCAPE_H]);
      placeHallImage(hallADataUrl, HALL_REGIONS.A, "Hall A");

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

  return { mapRef, listRef, exportPdf, isExporting };
}
