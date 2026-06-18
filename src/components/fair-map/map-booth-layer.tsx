'use client';

import { memo } from 'react';
import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

import { getFavoriteKey, getDisplayName } from './map-helpers';
import { MAP_HEIGHT, MAP_WIDTH } from './route-path';
import type { BoothShape, MapExhibitor } from './types';

interface MapBoothLayerProps {
  shapes: BoothShape[];
  exhibitorsByBooth: Record<string, MapExhibitor[]>;
  selectedBooth: string;
  selectedShape: BoothShape | undefined;
  favoriteSet: Set<string>;
  routeOrderByBooth: Map<string, number>;
  routePath: { x: number; y: number }[];
  onSelectExhibitor: (exhibitor: MapExhibitor) => void;
}

/**
 * 부스 클릭 레이어 + 선택 하이라이트 + 경로 SVG.
 * `transform`(pan/zoom)에 의존하지 않아 pan/zoom 프레임에서 bail-out한다.
 */
export const MapBoothLayer = memo(function MapBoothLayer({
  shapes,
  exhibitorsByBooth,
  selectedBooth,
  selectedShape,
  favoriteSet,
  routeOrderByBooth,
  routePath,
  onSelectExhibitor,
}: MapBoothLayerProps) {
  return (
    <>
      {shapes.map((shape) => {
        const boothItems = exhibitorsByBooth[shape.boothNumber] ?? [];
        if (!boothItems.length) return null;

        const isSelected = shape.boothNumber === selectedBooth;
        const isFavorite = boothItems.some((item) => favoriteSet.has(getFavoriteKey(item)));

        return (
          <button
            key={shape.boothNumber}
            type="button"
            aria-label={`${shape.boothNumber} ${boothItems.map(getDisplayName).join(', ')}`}
            title={`${shape.boothNumber} ${boothItems.map(getDisplayName).join(', ')}`}
            onPointerDown={(event) => {
              if (event.pointerType === 'mouse') event.stopPropagation();
            }}
            onClick={() => onSelectExhibitor(boothItems[0])}
            className={cn(
              'absolute cursor-pointer transition focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-brand-coral',
              isSelected ? 'z-30' : isFavorite ? 'z-20' : 'z-10',
              isSelected && 'bg-brand-green/45 ring-4 ring-brand-green',
              isFavorite && !isSelected && 'bg-brand-coral/25 ring-2 ring-brand-coral',
              !isSelected &&
                !isFavorite &&
                'hover:bg-brand-yellow/35 hover:ring-2 hover:ring-brand-ink',
            )}
            style={{
              left: shape.x,
              top: shape.y,
              width: shape.width,
              height: shape.height,
            }}
          >
            {isFavorite && !routeOrderByBooth.has(shape.boothNumber) ? (
              <Star className="absolute -top-3 -right-3 h-6 w-6 fill-brand-coral text-foreground drop-shadow-[0_1px_0_var(--color-brand-panel)]" />
            ) : null}
          </button>
        );
      })}

      {selectedShape ? (
        <div
          className="pointer-events-none absolute z-[5] border-2 border-border bg-brand-green/30 shadow-[0_0_0_5px_var(--color-brand-green)]"
          style={{
            left: selectedShape.x,
            top: selectedShape.y,
            width: selectedShape.width,
            height: selectedShape.height,
          }}
        />
      ) : null}

      {routePath.length >= 2 ? (
        <svg
          className="pointer-events-none absolute inset-0 z-[35] overflow-visible"
          style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          aria-hidden
        >
          <polyline
            points={routePath.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="var(--color-brand-coral)"
            strokeWidth={8}
            strokeDasharray="20 8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
        </svg>
      ) : null}
    </>
  );
});
