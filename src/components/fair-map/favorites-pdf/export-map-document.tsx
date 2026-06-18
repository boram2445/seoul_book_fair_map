"use client";

import type React from "react";

import { getEventScheduleLabel, type BoothEvent } from "../booth-events";
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
  memoBg: "rgba(255,90,61,0.08)",
  eventText: "#555",
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

        {/* ── Number-only label layer — names are in the per-hall table below the map ── */}
        {allShapes.map((shape) => {
          // Black booths have their numbers baked into the SVG as white glyphs — skip.
          if (shape.fill === "black") return null;

          const isFavorite = favBoothSet.has(shape.boothNumber);
          const textColor = isFavorite ? C.coralDeep : "#333";
          // Fixed font size so all booth numbers appear at uniform scale across the page.
          const fontSize = shape.boothNumber.startsWith("A") ? 26 : 32;

          return (
            <div
              key={`label-${shape.boothNumber}`}
              style={{
                position: "absolute",
                left: shape.x,
                top: shape.y,
                width: shape.width,
                height: shape.height,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                color: textColor,
                textShadow: "0 1px 0 white, 1px 0 0 white, 0 -1px 0 white, -1px 0 0 white",
                pointerEvents: "none",
                zIndex: 36,
              }}
            >
              <span style={{ fontSize, fontFamily: "monospace", fontWeight: 900, lineHeight: 1 }}>
                {shape.boothNumber}
              </span>
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
  eventsByBooth?: Record<string, BoothEvent[]>;
  memos?: Record<string, string>;
  ref?: React.Ref<HTMLDivElement>;
}

/**
 * Off-screen component: A4-width list of favourite booths (page 2 of the PDF).
 * Each row shows: [index] [부스번호 배지] 출판사명, followed by:
 *   - Event rows (title · schedule label) when present
 *   - Memo block when present
 * Same wrapper/inner pattern as ExportMapPage.
 */
export function ExportListPage({ items, eventsByBooth = {}, memos = {}, ref }: ExportListPageProps) {
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
          width: 1123,
          padding: "40px 48px",
          backgroundColor: C.panel,
          fontFamily: "sans-serif",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ borderBottom: `3px solid ${C.ink}`, paddingBottom: 8, marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: C.coral, margin: "0 0 4px" }}>
            서울국제도서전 2026 · SIBF
          </p>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: C.ink, margin: 0, whiteSpace: "nowrap" }}>
              찜 부스
            </h1>
            <span style={{ fontSize: 13, color: C.muted }}>
              총 {items.length}개 부스
            </span>
          </div>
        </div>

        {/* Numbered rows: 2-column layout, each item contains booth + events + memo */}
        <ol style={{ listStyle: "none", margin: 0, padding: 0, columnCount: 2, columnGap: 32 }}>
          {items.map(({ favKey, booth, name }, index) => {
            const events = eventsByBooth[favKey] ?? [];
            const memo = memos[favKey] ?? "";

            return (
              <li
                key={favKey}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  padding: "6px 0",
                  borderBottom: `1px solid ${C.border}`,
                  breakInside: "avoid",
                  pageBreakInside: "avoid",
                }}
              >
                {/* Main row: index + booth badge + publisher name */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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
                </div>

                {/* Event rows — title · schedule label only */}
                {events.length > 0 && (
                  <div style={{ marginTop: 5, paddingLeft: 42, display: "flex", flexDirection: "column", gap: 3 }}>
                    {events.map((ev, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 6,
                          fontSize: 12,
                          color: C.eventText,
                        }}
                      >
                        <span style={{ flexShrink: 0, fontSize: 10, color: C.coral }}>▸</span>
                        <span style={{ fontWeight: 600, color: C.ink }}>{ev.title}</span>
                        <span style={{ color: C.muted, flexShrink: 0 }}>
                          {getEventScheduleLabel(ev)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Memo block */}
                {memo && (
                  <div
                    style={{
                      marginTop: 6,
                      marginLeft: 42,
                      padding: "5px 10px",
                      backgroundColor: C.memoBg,
                      borderLeft: `3px solid ${C.coral}`,
                      boxSizing: "border-box",
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 800, color: C.coral, marginRight: 6 }}>
                      메모
                    </span>
                    <span style={{ fontSize: 12, color: C.ink, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                      {memo}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
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

// ── Hall table page ──────────────────────────────────────────────────────────

interface ExportHallTableProps {
  hall: "A" | "B";
  favKeys: string[];
  ref?: React.Ref<HTMLDivElement>;
}

/**
 * Off-screen component: compact booth-number ↔ publisher-name table for one hall.
 * Captured at pixelRatio 1.5 and placed in the top band of each hall's PDF page.
 * Favourite booths are highlighted in coral so users can cross-reference the map.
 */
export function ExportHallTable({ hall, favKeys, ref }: ExportHallTableProps) {
  // Build a set of booths that are favourited
  const favBoothSet = new Set(
    favKeys.flatMap((fk) => {
      const ex = exhibitorByFavoriteKey.get(fk);
      return ex ? [boothForMap(ex)] : [];
    }),
  );

  // Group exhibitors by their effective booth (boothForMap), filtered to this hall.
  // Using boothForMap breaks B400 zone down into individual B401–B473 sub-booths.
  const entries: [string, MapExhibitor[]][] = Array.from(
    exhibitors
      .filter((ex) => boothForMap(ex).startsWith(hall))
      .reduce<Map<string, MapExhibitor[]>>((map, ex) => {
        const key = boothForMap(ex);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ex);
        return map;
      }, new Map())
      .entries(),
  ).sort(([a], [b]) => (parseInt(a.slice(1), 10) || 0) - (parseInt(b.slice(1), 10) || 0));

  return (
    <div aria-hidden style={{ position: "fixed", left: -99999, top: 0, overflow: "hidden" }}>
      <div
        ref={ref}
        style={{
          width: 1500,
          padding: "12px 20px 10px",
          backgroundColor: C.panel,
          fontFamily: "sans-serif",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            marginBottom: 8,
            borderBottom: `2px solid ${C.ink}`,
            paddingBottom: 5,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 900, color: C.ink }}>Hall {hall}</span>
          <span style={{ fontSize: 10, color: C.muted }}>입점사 목록 · {entries.length}개 부스</span>
        </div>
        {/* Multi-column booth list */}
        <div style={{ columnCount: hall === "A" ? 8 : 6, columnGap: 8 }}>
          {entries.map(([boothKey, items]) => {
            const isFav = favBoothSet.has(boothKey);
            return (
              <div
                key={boothKey}
                style={{
                  display: "flex",
                  gap: 5,
                  padding: "1px 0",
                  breakInside: "avoid",
                  pageBreakInside: "avoid",
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: isFav ? C.coral : C.muted,
                    flexShrink: 0,
                    minWidth: 50,
                    lineHeight: 1.3,
                  }}
                >
                  {boothKey}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    color: isFav ? C.coralDeep : C.ink,
                    fontWeight: isFav ? 800 : 400,
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {items.map((it) => getDisplayName(it)).join("·")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
