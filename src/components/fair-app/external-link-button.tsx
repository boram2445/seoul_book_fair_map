import type { MouseEventHandler, ReactNode } from 'react';
import { Globe, Instagram } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  instagram: Instagram,
  homepage: Globe,
} as const;

const DEFAULT_LABEL: Record<'instagram' | 'homepage', string> = {
  instagram: 'Instagram',
  homepage: 'Homepage',
};

export interface ExternalLinkButtonProps {
  href: string;
  kind: 'instagram' | 'homepage';
  /** 기본값: instagram→"Instagram", homepage→"Homepage". "원문"·"계정" 등 override 가능. */
  label?: ReactNode;
  /** 배경색 토큰: 'white'(기본) = bg-white, 'panel' = bg-brand-panel */
  tone?: 'white' | 'panel';
  /** 카드 내부 클릭 전파 방지 등 */
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  /** hidden md:inline-flex 등 부모 레이아웃 제어용 */
  className?: string;
  /** true이면 모바일(<md)에서 라벨을 숨기고 아이콘만 표시. 데스크탑(md+)에서는 라벨 복귀. */
  mobileIconOnly?: boolean;
}

/**
 * 인스타그램 / 홈페이지 외부 링크 버튼.
 * 모바일: h-7 / px-2 / text-[10px] / 아이콘 size-3
 * 데스크탑: md:h-9 / md:px-2.5 / md:text-[11px] / 아이콘 size-3.5
 */
export function ExternalLinkButton({
  href,
  kind,
  label,
  tone = 'white',
  onClick,
  className,
  mobileIconOnly = false,
}: ExternalLinkButtonProps) {
  const Icon = ICON_MAP[kind];
  const resolvedLabel = label ?? DEFAULT_LABEL[kind];
  const ariaLabel = typeof resolvedLabel === 'string' ? resolvedLabel : DEFAULT_LABEL[kind];

  return (
    <Button
      asChild
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        'shrink-0 rounded-none border-border font-black hover:bg-brand-yellow',
        'h-7 px-2 text-[10px] md:h-9 md:px-2.5 md:text-[11px]',
        '[&_svg:not([class*="size-"])]:size-3 md:[&_svg:not([class*="size-"])]:size-3.5',
        tone === 'panel' ? 'bg-brand-panel' : 'bg-white',
        className,
      )}
    >
      <a href={href} target="_blank" rel="noreferrer" aria-label={ariaLabel} onClick={onClick}>
        <Icon />
        {mobileIconOnly ? (
          <span className="hidden md:inline">{resolvedLabel}</span>
        ) : (
          resolvedLabel
        )}
      </a>
    </Button>
  );
}
