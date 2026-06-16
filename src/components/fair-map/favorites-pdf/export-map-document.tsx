"use client";

import type React from "react";

import { boothForMap, exhibitorByFavoriteKey, exhibitors, getDisplayName, shapes as allShapes } from "../map-data";
import type { BoothShape, MapExhibitor } from "../types";

export const MAP_EXPORT_WIDTH = 3230;
export const MAP_EXPORT_HEIGHT = 3650;

// Hall-level bounding boxes derived from booth shape coordinates.
// A 60 px margin on each side ensures coral outlines, route badges, and
// overflow labels are not clipped at the hall boundary.
const HALL_PAD = 60;

function _computeHallBbox(prefix: string) {
  const hs = allShapes.filter((s) => s.boothNumber.startsWith(prefix));
  const minX = Math.max(0, Math.min(...hs.map((s) => s.x)) - HALL_PAD);
  const minY = Math.max(0, Math.min(...hs.map((s) => s.y)) - HALL_PAD);
  const maxX = Math.min(MAP_EXPORT_WIDTH, Math.max(...hs.map((s) => s.x + s.width)) + HALL_PAD);
  const maxY = Math.min(MAP_EXPORT_HEIGHT, Math.max(...hs.map((s) => s.y + s.height)) + HALL_PAD);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export const HALL_REGIONS = {
  A: _computeHallBbox("A"),
  B: _computeHallBbox("B"),
};

// Stable hex values used in place of CSS custom properties.
// html-to-image serialises the DOM to an SVG foreignObject, where oklch() tokens
// may not resolve — explicit hex values guarantee colour fidelity.
export const C = {
  coral: "#ff5a3d",
  coralBg: "rgba(255,90,61,0.22)",
  coralDeep: "#7a1f12",
  ink: "#171511",
  panel: "#fffdf7",
  muted: "#888",
  border: "#e2e0d9",
} as const;

export interface FavoriteExportItem {
  favKey: string;
  booth: string;
  name: string;
  shape: BoothShape;
}

export type ExportRoutePoint = {
  x: number;
  y: number;
};

export type ExportRouteBadge = ExportRoutePoint & {
  labelX: number;
  labelY: number;
  boothNumber: string;
  index: number;
};

/** Resolves favorite keys (exhibitor.no strings) → shapes + display names, silently drops unmatched. */
export function buildFavoriteItems(favKeys: string[]): FavoriteExportItem[] {
  const shapeMap = new Map(allShapes.map((s) => [s.boothNumber, s]));
  return favKeys.flatMap((favKey) => {
    const ex = exhibitorByFavoriteKey.get(favKey);
    if (!ex) return [];
    const booth = boothForMap(ex);
    const shape = shapeMap.get(booth);
    if (!shape) return [];
    return [{ favKey, booth, name: getDisplayName(ex), shape }];
  });
}

// ── Map page ────────────────────────────────────────────────────────────────

interface ExportMapPageProps {
  items: FavoriteExportItem[];
  routePath: ExportRoutePoint[];
  routeBadges: ExportRouteBadge[];
  ref?: React.Ref<HTMLDivElement>;
}

/**
 * Off-screen component: full-resolution floor plan (3230 × 3650 px) with
 * coral highlights and publisher-name labels drawn on every favourite booth.
 *
 * IMPORTANT: the off-screen offset (left: -99999px) lives on the OUTER wrapper
 * only. The ref points to the INNER node which has no position offset, so
 * html-to-image captures it at coordinates (0,0) rather than (-99999px, 0).
 */
export function ExportMapPage({ items, routePath, routeBadges, ref }: ExportMapPageProps) {
  // Build label grouping identical to book-fair-map.tsx labelExhibitorsByBooth:
  // key = origBooth if that shape exists, else booth (handles B400 책마을 zone).
  const shapeSet = new Set(allShapes.map((s) => s.boothNumber));
  const labelExhibitorsByBooth = exhibitors.reduce<Record<string, MapExhibitor[]>>((acc, ex) => {
    const key = ex.origBooth && shapeSet.has(ex.origBooth) ? ex.origBooth : ex.booth;
    acc[key] = acc[key] ?? [];
    acc[key].push(ex);
    return acc;
  }, {});

  const favBoothSet = new Set(items.map((it) => it.booth));

  return (
    // Outer wrapper: off-screen, never captured
    <div
      aria-hidden
      style={{ position: "fixed", left: -99999, top: 0, overflow: "hidden" }}
    >
      {/* Inner node: captured by html-to-image via ref */}
      <div
        ref={ref}
        style={{
          position: "relative",
          width: MAP_EXPORT_WIDTH,
          height: MAP_EXPORT_HEIGHT,
          backgroundColor: "#fff",
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/data/sibf-2026-floor-plan.svg"
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />

        {/* Route polyline */}
        {routePath.length >= 2 ? (
          <svg
            aria-hidden
            viewBox={`0 0 ${MAP_EXPORT_WIDTH} ${MAP_EXPORT_HEIGHT}`}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
              zIndex: 30,
              pointerEvents: "none",
            }}
          >
            <polyline
              points={routePath.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={C.coral}
              strokeWidth={8}
              strokeDasharray="20 8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          </svg>
        ) : null}

        {/* ── Coral fill + ring for favorited booths (below labels) ── */}
        {Array.from(
          items.reduce<Map<string, BoothShape>>((map, { booth, shape }) => {
            if (!map.has(booth)) map.set(booth, shape);
            return map;
          }, new Map()).values()
        ).map((shape) => (
          <div
            key={`fav-fill-${shape.boothNumber}`}
            style={{
              position: "absolute",
              left: shape.x,
              top: shape.y,
              width: shape.width,
              height: shape.height,
              backgroundColor: C.coralBg,
              outline: `6px solid ${C.coral}`,
              boxSizing: "border-box",
              zIndex: 10,
            }}
          />
        ))}

        {/* ── Unified static label layer (mirrors book-fair-map.tsx:1265-1408) ── */}
        {allShapes.map((shape) => {
          const boothItems = labelExhibitorsByBooth[shape.boothNumber] ?? [];
          if (!boothItems.length) return null;

          const isBlack = shape.fill === "black";
          const isFavorite = favBoothSet.has(shape.boothNumber);
          const isZone = boothItems.some((it) => boothForMap(it) !== shape.boothNumber);

          const textColor = isBlack ? "white" : isFavorite ? C.coralDeep : "#333";
          const halo = isBlack
            ? "0 1px 0 #000, 1px 0 0 #000, 0 -1px 0 #000, -1px 0 0 #000"
            : "0 1px 0 white, 1px 0 0 white, 0 -1px 0 white, -1px 0 0 white";

          if (isZone) {
            // B400 책마을: header + 2-col list
            const zoneTitle =
              getDisplayName(
                boothItems.find((it) => boothForMap(it) === shape.boothNumber) ?? boothItems[0],
              ) + ` (${shape.boothNumber})`;

            return (
              <div
                key={`label-${shape.boothNumber}`}
                style={{
                  position: "absolute",
                  left: shape.x,
                  top: shape.y,
                  width: shape.width,
                  height: shape.height,
                  padding: "4px 3px 2px",
                  color: textColor,
                  textShadow: halo,
                  pointerEvents: "none",
                  zIndex: 36,
                  overflow: "hidden",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 800, textAlign: "center", marginBottom: 3, lineHeight: 1.2 }}>
                  {zoneTitle}
                </div>
                <div style={{ columnCount: 2, columnGap: 4, fontSize: 11, fontWeight: 700, lineHeight: 1.2, textAlign: "left" }}>
                  {boothItems.map((item) => (
                    <div key={item.no} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {boothForMap(item)} - {getDisplayName(item)}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Regular booth
          const maxDisplay = Math.min(Math.floor(shape.height / 24), 30);
          const displayed = boothItems.slice(0, maxDisplay);
          const overflow = boothItems.length - displayed.length;

          return (
            <div
              key={`label-${shape.boothNumber}`}
              style={{
                position: "absolute",
                left: shape.x,
                top: shape.y,
                width: shape.width,
                height: shape.height,
                paddingTop: Math.min(6, shape.height * 0.12),
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                lineHeight: 1.15,
                color: textColor,
                textShadow: halo,
                pointerEvents: "none",
                zIndex: 36,
                overflow: "hidden",
              }}
            >
              {!isBlack && (
                <span style={{ display: "block", fontSize: 17, fontFamily: "monospace", fontWeight: 700 }}>
                  {shape.boothNumber}
                </span>
              )}
              {displayed.map((item) => (
                <span
                  key={item.no}
                  style={{ display: "block", fontSize: 19, fontWeight: 800, wordBreak: "keep-all", overflowWrap: "anywhere", maxWidth: "100%" }}
                >
                  {getDisplayName(item)}
                </span>
              ))}
              {overflow > 0 && (
                <span style={{ display: "block", fontSize: 14, fontWeight: 700, opacity: 0.7 }}>
                  외 {overflow}
                </span>
              )}
            </div>
          );
        })}

        {/* ── Route order badges — coral square + visit number at booth corner ── */}
        {routeBadges.map((badge) => (
          <div
            key={`badge-${badge.boothNumber}`}
            style={{
              position: "absolute",
              left: badge.labelX,
              top: badge.labelY,
              transform: "translate(-50%, -50%)",
              width: 80,
              height: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: C.coral,
              border: "8px solid #fff",
              color: "#fff",
              fontSize: 34,
              fontWeight: 900,
              fontFamily: "sans-serif",
              boxSizing: "border-box",
              zIndex: 40,
              pointerEvents: "none",
            }}
          >
            {badge.index + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── List page ────────────────────────────────────────────────────────────────

interface ExportListPageProps {
  items: FavoriteExportItem[];
  ref?: React.Ref<HTMLDivElement>;
}

/**
 * Off-screen component: A4-width list of favourite booths (page 2 of the PDF).
 * Same wrapper/inner pattern as ExportMapPage.
 */
export function ExportListPage({ items, ref }: ExportListPageProps) {
  return (
    // Outer wrapper: off-screen, never captured
    <div
      aria-hidden
      style={{ position: "fixed", left: -99999, top: 0, overflow: "hidden" }}
    >
      {/* Inner node: captured by html-to-image via ref */}
      <div
        ref={ref}
        style={{
          width: 794,
          padding: "48px 56px",
          backgroundColor: C.panel,
          fontFamily: "sans-serif",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ borderBottom: `3px solid ${C.ink}`, paddingBottom: 16, marginBottom: 32 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: C.coral, margin: "0 0 6px" }}>
            서울국제도서전 2026 · SIBF
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.ink, margin: 0 }}>
            내 찜 부스 목록
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "8px 0 0" }}>
            총 {items.length}개 부스
          </p>
        </div>

        {/* Numbered rows: [index] [부스배지] 출판사명 */}
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map(({ favKey, booth, name }, index) => (
            <li
              key={favKey}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "10px 0",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              {/* Index number */}
              <span
                style={{
                  flexShrink: 0,
                  width: 28,
                  fontSize: 12,
                  fontWeight: 800,
                  color: C.muted,
                  textAlign: "right",
                }}
              >
                {index + 1}
              </span>
              {/* Booth number badge */}
              <span
                style={{
                  flexShrink: 0,
                  padding: "3px 8px",
                  backgroundColor: C.coral,
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.03em",
                }}
              >
                {booth}
              </span>
              {/* Publisher name */}
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.ink,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </span>
            </li>
          ))}
        </ol>

        {/* Footer */}
        <p
          style={{
            marginTop: 32,
            fontSize: 11,
            color: C.muted,
            textAlign: "right",
          }}
        >
          지곰 지도 · sibf.or.kr
        </p>
      </div>
    </div>
  );
}
