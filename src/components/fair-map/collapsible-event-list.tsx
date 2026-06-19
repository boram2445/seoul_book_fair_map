"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

import { getEventScheduleLabel, type BoothEvent } from "./booth-events";

interface CollapsibleEventListProps {
  events: BoothEvent[];
  highlightCategory?: string;
}

/**
 * 모바일 전용 이벤트 토글 컴포넌트.
 * 헤더("이벤트 N개")를 누르면 접기/펼치기. 기본은 접힘.
 * 카드 클릭 이벤트와 충돌하지 않도록 stopPropagation 처리.
 */
export function CollapsibleEventList({ events, highlightCategory }: CollapsibleEventListProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (events.length === 0) return null;

  return (
    <div className="border-t border-border/20 md:hidden">
      {/* 토글 헤더 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-black text-brand-rust"
      >
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          이벤트 {events.length}개
        </span>
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5 text-brand-muted" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-brand-muted" />
        )}
      </button>

      {/* 이벤트 목록 */}
      {isOpen && (
        <ul className="border-t border-border/20">
          {events.map((event) => (
            <li
              key={`${getEventScheduleLabel(event)}-${event.title}`}
              className="flex flex-col gap-0.5 border-b border-border/20 px-3 py-2 last:border-b-0"
            >
              <span className="whitespace-nowrap font-mono text-xs font-black text-brand-coral-deep">
                {getEventScheduleLabel(event)}
              </span>
              <span className="min-w-0 text-sm">
                <span
                  className={cn(
                    "mr-1 border px-1.5 py-0.5 text-[11px] font-black",
                    highlightCategory && event.category === highlightCategory
                      ? "border-brand-ink bg-brand-yellow"
                      : "border-border bg-white",
                  )}
                >
                  {event.category}
                </span>
                <span className="font-bold">{event.title}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
