import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronRight,
  Heart,
  MapPin,
} from 'lucide-react';

import { type BoothEvent, getEventScheduleLabel } from '@/components/fair-map/booth-events';
import { CollapsibleEventList } from '@/components/fair-map/collapsible-event-list';
import { boothForMap, getDisplayName } from '@/components/fair-map/map-helpers';
import type { FairMapPublisher } from '@/lib/types/fair-map/type';
import { cn } from '@/lib/utils';

import { ExternalLinkButton } from './external-link-button';
import { FavoriteButton } from './favorite-button';

export interface PublisherCardProps {
  exhibitor: FairMapPublisher;
  index: number;
  isFavorite: boolean;
  events: BoothEvent[];
  onFavoriteToggle: () => void;
  onNavigate: () => void;
  /** 좌측 컬럼 (42px). 있으면 2열 그리드로 래핑, 없으면 article이 루트. */
  leading?: ReactNode;
  /** 순번·부스 배지 색조. 'ink' = 인기 탭(검정/노랑), 'green' = 찜내역 탭(초록/회색). */
  rankTone?: 'ink' | 'green';
  /** 모바일 전용 블록 (헤더 아래, 이벤트 토글 위). 외부 wrapper 포함해서 전달. */
  mobileBlock?: ReactNode;
  /** 데스크톱 md:grid 섹션의 좌측 콘텐츠. */
  desktopAside?: ReactNode;
  /** 데스크톱 이벤트 박스 최대 표시 개수. undefined 이면 전체. */
  maxEvents?: number;
  /** 이벤트 박스 "전체 보기" 링크 href. maxEvents 초과 시에만 노출. */
  eventsHref?: string;
  /** 드래그 중 여부 (찜내역 탭 dnd-kit에서 전달). */
  isDragging?: boolean;
  /** 이 카테고리와 일치하는 이벤트 배지를 강조. */
  highlightCategory?: string;
}

export function PublisherCard({
  exhibitor,
  index,
  isFavorite,
  events,
  onFavoriteToggle,
  onNavigate,
  leading,
  rankTone = 'ink',
  mobileBlock,
  desktopAside,
  maxEvents,
  eventsHref,
  isDragging,
  highlightCategory,
}: PublisherCardProps) {
  const booth = boothForMap(exhibitor);
  const publisherHref = `/publishers/${exhibitor.no}`;
  const heartCount = exhibitor.favoriteCount + (isFavorite ? 1 : 0);
  const displayedEvents = maxEvents !== undefined ? events.slice(0, maxEvents) : events;
  const hasMoreEvents = eventsHref !== undefined && maxEvents !== undefined && events.length > maxEvents;
  const categories = exhibitor.categories ?? [];

  const article = (
    <article
      className={cn(
        'relative cursor-pointer transition-colors hover:bg-brand-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink',
        !leading && 'border border-border bg-white',
      )}
      tabIndex={0}
      onClick={onNavigate}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        onNavigate();
      }}
    >
      {/* 상단 우측 액션 행: 링크 버튼(md) + 찜 */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        {exhibitor.instagramUrl ? (
          <ExternalLinkButton
            href={exhibitor.instagramUrl}
            kind="instagram"
            tone="white"
            onClick={(e) => e.stopPropagation()}
            className="hidden md:inline-flex"
          />
        ) : null}
        {exhibitor.homepageUrl ? (
          <ExternalLinkButton
            href={exhibitor.homepageUrl}
            kind="homepage"
            tone="white"
            onClick={(e) => e.stopPropagation()}
            className="hidden md:inline-flex"
          />
        ) : null}
        <FavoriteButton isFavorite={isFavorite} onToggle={onFavoriteToggle} />
      </div>

      {/* 헤더 */}
      <div className="border-b border-border/20 p-4 pr-14">
        <div className="min-w-0">
          {/* 배지 행: 순번 · 부스 · 찜 수 */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'border border-border px-2 py-1 text-xs font-black',
                rankTone === 'green'
                  ? 'bg-brand-green text-brand-green-ink'
                  : 'bg-brand-ink text-white',
              )}
            >
              {index + 1}
            </span>
            <span className="inline-flex items-center gap-1 bg-brand-hover px-2 py-1 text-xs font-black text-brand-muted">
              <MapPin className="h-3 w-3 shrink-0" />
              {booth}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-black text-brand-coral-deep">
              <Heart className="h-3.5 w-3.5 fill-brand-coral text-brand-coral" />
              {heartCount}
            </span>
          </div>

          {/* 이름 + 상세 링크 */}
          <div className="mt-3 flex min-w-0 items-center gap-2">
            <h3 className="min-w-0 truncate text-base font-black md:text-lg">
              {getDisplayName(exhibitor)}
            </h3>
            <Link
              href={publisherHref}
              onClick={(e) => e.stopPropagation()}
              className="flex shrink-0 items-center gap-0.5 text-xs font-black text-brand-rust hover:text-brand-ink"
              aria-label="출판사 상세 보기"
            >
              상세
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* 영문명 · 카테고리 */}
          {(exhibitor.nameEn || categories.length > 0) ? (
            <p className="mt-1.5 truncate text-xs font-bold text-brand-muted">
              {[
                exhibitor.nameEn,
                [...new Set(categories)].slice(0, 6).join(', ') || null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}
        </div>

        {/* 모바일 전용 링크 버튼 */}
        {(exhibitor.instagramUrl || exhibitor.homepageUrl) ? (
          <div className="mt-3 -mr-10 flex flex-wrap justify-end gap-2 md:hidden">
            {exhibitor.instagramUrl ? (
              <ExternalLinkButton
                href={exhibitor.instagramUrl}
                kind="instagram"
                tone="white"
                mobileIconOnly
                onClick={(e) => e.stopPropagation()}
              />
            ) : null}
            {exhibitor.homepageUrl ? (
              <ExternalLinkButton
                href={exhibitor.homepageUrl}
                kind="homepage"
                tone="white"
                mobileIconOnly
                onClick={(e) => e.stopPropagation()}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 모바일 슬롯 (메모 등) — 외부 wrapper 포함해 그대로 렌더 */}
      {mobileBlock ?? null}

      {/* 모바일 이벤트 토글 */}
      <CollapsibleEventList events={events} highlightCategory={highlightCategory} />

      {/* 데스크톱: 소개/메모(좌) + 이벤트 박스(우) */}
      <div
        className={cn(
          'hidden border-t border-border/20 p-4 md:grid md:gap-3',
          events.length > 0 && 'lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]',
        )}
      >
        {desktopAside}
        {events.length > 0 ? (
          <div className="border border-border/20 bg-brand-surface">
            <div className="flex items-center justify-between border-b border-border/20 px-3 py-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-brand-rust">
                <CalendarDays className="h-4 w-4" />
                이벤트
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs font-black text-brand-muted">{events.length}개</span>
                {hasMoreEvents ? (
                  <Link
                    href={eventsHref!}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-0.5 text-xs font-black text-brand-muted hover:text-brand-ink"
                  >
                    전체 보기 <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </span>
            </div>
            <ul>
              {displayedEvents.map((event) => (
                <li
                  key={`${getEventScheduleLabel(event)}-${event.title}`}
                  className={cn(
                    'grid items-baseline gap-2 border-b border-border/20 px-3 py-2 text-sm last:border-b-0',
                    event.startAt
                      ? 'grid-cols-[8.25rem_minmax(0,1fr)]'
                      : 'grid-cols-[5.75rem_minmax(0,1fr)]',
                  )}
                >
                  <span className="whitespace-nowrap font-mono text-xs font-black text-brand-coral-deep">
                    {getEventScheduleLabel(event)}
                  </span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-1">
                    <span
                      className={cn(
                        'border px-1.5 py-0.5 text-[11px] font-black',
                        highlightCategory && event.category === highlightCategory
                          ? 'border-brand-ink bg-brand-yellow'
                          : 'border-border bg-white',
                      )}
                    >
                      {event.category}
                    </span>
                    <span className="font-bold">{event.title}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );

  if (leading) {
    return (
      <div
        className={cn(
          'grid grid-cols-[42px_minmax(0,1fr)]',
          isDragging && 'opacity-50 shadow-brutal-sm',
        )}
      >
        {leading}
        {article}
      </div>
    );
  }

  return article;
}
