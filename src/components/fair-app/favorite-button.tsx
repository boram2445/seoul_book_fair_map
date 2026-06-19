'use client';

import { Heart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * 찜 토글 버튼 — 전 화면 공통 시각 기준
 * 찜됨: 코랄 배경 + 흰 하트 / 안됨: 중립 배경 + 코랄 외곽선 하트
 */
export function FavoriteButton({ isFavorite, onToggle, className }: FavoriteButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={isFavorite ? '찜 해제' : '찜하기'}
      className={cn(
        'size-8 rounded-none border-border bg-brand-panel hover:bg-brand-yellow md:size-9',
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <Heart
        className={cn(
          'h-3.5 w-3.5 md:h-4 md:w-4',
          isFavorite ? 'fill-brand-coral text-brand-coral' : 'text-brand-coral',
        )}
      />
    </Button>
  );
}
