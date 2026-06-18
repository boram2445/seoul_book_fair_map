'use client';

import { memo } from 'react';

import { boothForMap, getFavoriteKey, getDisplayName } from './map-helpers';
import type { BoothShape, MapExhibitor } from './types';

interface MapLabelLayerProps {
  shapes: BoothShape[];
  labelExhibitorsByBooth: Record<string, MapExhibitor[]>;
  selectedBooth: string;
  favoriteSet: Set<string>;
}

/**
 * 맵 좌표계 안에 고정된 텍스트 라벨 레이어.
 * `transform`(pan/zoom)에 의존하지 않아 pan/zoom 프레임에서 bail-out한다.
 */
export const MapLabelLayer = memo(function MapLabelLayer({
  shapes,
  labelExhibitorsByBooth,
  selectedBooth,
  favoriteSet,
}: MapLabelLayerProps) {
  return (
    <>
      {shapes.map((shape) => {
        const boothItems = labelExhibitorsByBooth[shape.boothNumber] ?? [];
        if (!boothItems.length) return null;

        const isBlack = shape.fill === 'black';
        const isSelected = shape.boothNumber === selectedBooth;
        const isFavorite = boothItems.some((item) => favoriteSet.has(getFavoriteKey(item)));

        /**
         * 구역형 부스: 멤버의 origBooth 가 도형 번호와 다른 경우
         * (현재 B400 책마을만 해당 — 101개 참여사가 B401~B473 으로 세분)
         */
        const isZone = boothItems.some((it) => boothForMap(it) !== shape.boothNumber);

        const textColor = isBlack
          ? 'white'
          : isSelected
            ? 'var(--color-brand-green-ink)'
            : isFavorite
              ? 'var(--color-brand-coral-deep)'
              : '#333';
        const halo = isBlack
          ? '0 1px 0 #000, 1px 0 0 #000, 0 -1px 0 #000, -1px 0 0 #000'
          : '0 1px 0 white, 1px 0 0 white, 0 -1px 0 white, -1px 0 0 white';

        if (isZone) {
          // 구역 대표명: origBooth 가 구역 번호와 같은 항목의 이름
          const zoneTitle =
            getDisplayName(
              boothItems.find((it) => boothForMap(it) === shape.boothNumber) ?? boothItems[0],
            ) + ` (${shape.boothNumber})`;

          return (
            <div
              key={`label-${shape.boothNumber}`}
              className="pointer-events-none absolute z-[36] overflow-hidden"
              style={{
                left: shape.x,
                top: shape.y,
                width: shape.width,
                height: shape.height,
                padding: '4px 3px 2px',
                color: textColor,
                textShadow: halo,
              }}
            >
              {/* 헤더 */}
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  textAlign: 'center',
                  marginBottom: 2,
                  lineHeight: 1.2,
                }}
              >
                {zoneTitle}
              </div>
              {/* 2열 리스트 */}
              <div
                style={{
                  columnCount: 2,
                  columnGap: 3,
                  fontSize: 6.5,
                  fontWeight: 700,
                  lineHeight: 1.15,
                  textAlign: 'left',
                }}
              >
                {boothItems.map((item) => (
                  <div
                    key={item.no}
                    style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {boothForMap(item)} - {getDisplayName(item)}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // 일반 부스 — 높이에 비례한 최대 표시 수 (1줄 ≈ 13 map px, 상한 30)
        const maxDisplay = Math.min(Math.floor(shape.height / 13), 30);
        const displayed = boothItems.slice(0, maxDisplay);
        const overflow = boothItems.length - displayed.length;

        return (
          <div
            key={`label-${shape.boothNumber}`}
            className="pointer-events-none absolute z-[36] flex flex-col items-center overflow-hidden text-center"
            style={{
              left: shape.x,
              top: shape.y,
              width: shape.width,
              height: shape.height,
              paddingTop: Math.min(6, shape.height * 0.12),
              lineHeight: 1.15,
              color: textColor,
              textShadow: halo,
            }}
          >
            {!isBlack && (
              <span
                style={{
                  display: 'block',
                  fontSize: 9,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                }}
              >
                {shape.boothNumber}
              </span>
            )}
            {displayed.map((item) => (
              <span
                key={item.no}
                style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 800,
                  wordBreak: 'keep-all',
                  overflowWrap: 'anywhere',
                  maxWidth: '100%',
                }}
              >
                {getDisplayName(item)}
              </span>
            ))}
            {overflow > 0 && (
              <span
                style={{
                  display: 'block',
                  fontSize: 8,
                  fontWeight: 700,
                  opacity: 0.7,
                }}
              >
                외 {overflow}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
});
