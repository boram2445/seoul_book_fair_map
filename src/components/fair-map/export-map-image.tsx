'use client';

import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ImageDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  C,
  MAP_EXPORT_HEIGHT,
  MAP_EXPORT_WIDTH,
  type ExportRouteBadge,
  type ExportRoutePoint,
} from './favorites-pdf/export-map-document';
import { MapLabelLayer } from './map-label-layer';
import { HALL_ENTRANCES } from './route-path';
import type { BoothShape, MapExhibitor } from './types';

// brand-yellow hex (oklch(0.95 0.220 105) ≈ #fff000 — 입구 뱃지)
const YELLOW = '#fff000';

interface ExportMapImageDocProps {
  shapes: BoothShape[];
  labelExhibitorsByBooth: Record<string, MapExhibitor[]>;
  routePath: ExportRoutePoint[];
  routeBadges: ExportRouteBadge[];
  entranceKey: 'A' | 'B';
  innerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * 화면 밖 전체 지도 렌더 노드 (3230 × 3650).
 * outer wrapper에만 off-screen offset. innerRef가 가리키는 inner node에서
 * html-to-image가 (0,0) 기준으로 전체 해상도 PNG를 추출한다.
 */
function ExportMapImageDoc({
  shapes,
  labelExhibitorsByBooth,
  routePath,
  routeBadges,
  entranceKey,
  innerRef,
}: ExportMapImageDocProps) {
  const entrance = HALL_ENTRANCES[entranceKey];
  const showEntranceBadge = routeBadges.length >= 2;

  return (
    // Outer: off-screen. html-to-image에 캡처되지 않음.
    <div aria-hidden style={{ position: 'fixed', left: -99999, top: 0, overflow: 'hidden' }}>
      {/* Inner: ref가 가리키는 실제 캡처 대상 */}
      <div
        ref={innerRef}
        style={{
          position: 'relative',
          width: MAP_EXPORT_WIDTH,
          height: MAP_EXPORT_HEIGHT,
          backgroundColor: '#fff',
          overflow: 'hidden',
        }}
      >
        {/* 배경 floor-plan SVG */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/data/sibf-2026-floor-plan.svg"
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />

        {/* 경로 polyline — coral hex, oklch 없음 */}
        {routePath.length >= 2 ? (
          <svg
            aria-hidden
            viewBox={`0 0 ${MAP_EXPORT_WIDTH} ${MAP_EXPORT_HEIGHT}`}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              overflow: 'visible',
              zIndex: 30,
              pointerEvents: 'none',
            }}
          >
            <polyline
              points={routePath.map((p) => `${p.x},${p.y}`).join(' ')}
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

        {/*
         * 부스 이름 라벨 레이어 — 전체 부스.
         * selectedBooth='' / favoriteSet=∅ → textColor='#333'(hex), oklch 미사용.
         */}
        <MapLabelLayer
          shapes={shapes}
          labelExhibitorsByBooth={labelExhibitorsByBooth}
          selectedBooth=""
          favoriteSet={new Set()}
        />

        {/* 입구(0번) 뱃지 — 동선 활성 + 2개 이상 부스일 때 */}
        {showEntranceBadge ? (
          <div
            style={{
              position: 'absolute',
              left: entrance.x,
              top: entrance.y,
              transform: 'translate(-50%, -50%)',
              width: 80,
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: YELLOW,
              border: '8px solid #fff',
              color: C.ink,
              fontSize: 34,
              fontWeight: 900,
              fontFamily: 'sans-serif',
              boxSizing: 'border-box',
              zIndex: 40,
              pointerEvents: 'none',
            }}
          >
            0
          </div>
        ) : null}

        {/* 순번 뱃지 */}
        {routeBadges.map((badge) => (
          <div
            key={`badge-${badge.boothNumber}`}
            style={{
              position: 'absolute',
              left: badge.labelX,
              top: badge.labelY,
              transform: 'translate(-50%, -50%)',
              width: 80,
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.coral,
              border: '8px solid #fff',
              color: '#fff',
              fontSize: 34,
              fontWeight: 900,
              fontFamily: 'sans-serif',
              boxSizing: 'border-box',
              zIndex: 40,
              pointerEvents: 'none',
            }}
          >
            {badge.index + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 버튼 ──────────────────────────────────────────────────────────────────────

interface ExportImageButtonProps {
  shapes: BoothShape[];
  labelExhibitorsByBooth: Record<string, MapExhibitor[]>;
  routePath: ExportRoutePoint[];
  routeBadges: ExportRouteBadge[];
  entranceKey: 'A' | 'B';
  className?: string;
}

export function ExportImageButton({
  shapes,
  labelExhibitorsByBooth,
  routePath,
  routeBadges,
  entranceKey,
  className,
}: ExportImageButtonProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const innerRef = useRef<HTMLDivElement | null>(null);

  async function handleClick() {
    if (isCapturing) return;

    // off-screen 노드를 동기 마운트해 ref를 채운다 — PDF 패턴과 동일
    flushSync(() => setIsCapturing(true));

    const node = innerRef.current;
    if (!node) {
      setIsCapturing(false);
      return;
    }

    try {
      // floor-plan SVG 로드/decode 완료 대기
      const svgImg = node.querySelector('img');
      if (svgImg) {
        if (!svgImg.complete) {
          await new Promise<void>((resolve, reject) => {
            svgImg.addEventListener('load', () => resolve(), { once: true });
            svgImg.addEventListener('error', () => reject(new Error('SVG 로드 실패')), {
              once: true,
            });
          });
        }
        await svgImg.decode().catch(() => {
          // 이미 디코딩 완료 — 무시
        });
      }

      // pixelRatio 1 → 3230×3650 px (맵 단위 1:1, PDF와 동일)
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(node, { pixelRatio: 1, cacheBust: false });

      const a = document.createElement('a');
      a.download = '서울국제도서전-지도-2026.png';
      a.href = dataUrl;
      a.click();

      toast.success('이미지가 저장되었습니다.');
    } catch {
      toast.error('이미지 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsCapturing(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isCapturing}
        aria-label="전체 지도 이미지로 저장"
        className={className}
      >
        {isCapturing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageDown className="h-4 w-4" />
        )}
        이미지
      </Button>

      {/* 캡처 중에만 마운트하는 off-screen 전체 지도 렌더 노드 */}
      {isCapturing ? (
        <ExportMapImageDoc
          shapes={shapes}
          labelExhibitorsByBooth={labelExhibitorsByBooth}
          routePath={routePath}
          routeBadges={routeBadges}
          entranceKey={entranceKey}
          innerRef={innerRef}
        />
      ) : null}
    </>
  );
}
