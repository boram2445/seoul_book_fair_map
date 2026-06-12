"use client";

import type React from "react";

import { boothForMap, exhibitorByFavoriteKey, getDisplayName, shapes as allShapes } from "../map-data";
import type { BoothShape } from "../types";

export const MAP_EXPORT_WIDTH = 3230;
export const MAP_EXPORT_HEIGHT = 3650;

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
            {routeBadges.map((badge) => (
              <g key={badge.boothNumber}>
                <circle
                  cx={badge.x}
                  cy={badge.y}
                  r={26}
                  fill={C.coral}
                  stroke="#fff"
                  strokeWidth={5}
                />
                <text
                  x={badge.x}
                  y={badge.y + 9}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={24}
                  fontWeight={900}
                  fontFamily="system-ui, sans-serif"
                >
                  {badge.index + 1}
                </text>
              </g>
            ))}
          </svg>
        ) : null}

        {/* Group by booth so the same booth with multiple favorites renders one overlay */}
        {Array.from(
          items.reduce<Map<string, { booth: string; names: string[]; shape: BoothShape }>>(
            (map, { booth, name, shape }) => {
              const entry = map.get(booth);
              if (entry) entry.names.push(name);
              else map.set(booth, { booth, names: [name], shape });
              return map;
            },
            new Map()
          ).values()
        ).map(({ booth, names, shape }) => (
          <div key={booth}>
            {/* Coral fill + ring — mirrors book-fair-map.tsx "isFavorite" styles */}
            <div
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
            {/* Publisher-name label — mirrors the screen-space label in book-fair-map.tsx */}
            <div
              style={{
                position: "absolute",
                left: shape.x + shape.width / 2,
                top: shape.y + shape.height * 0.42,
                width: 440,
                transform: "translate(-50%, -100%)",
                fontSize: 40,
                fontWeight: 800,
                lineHeight: 1.3,
                textAlign: "center",
                color: C.coralDeep,
                wordBreak: "keep-all",
                overflowWrap: "anywhere",
                textShadow: `0 2px 0 ${C.panel}, 2px 0 0 ${C.panel}, 0 -2px 0 ${C.panel}, -2px 0 0 ${C.panel}`,
                zIndex: 20,
                pointerEvents: "none",
              }}
            >
              {names.map((n, i) => (
                <span key={i} style={{ display: "block" }}>{n}</span>
              ))}
            </div>
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
