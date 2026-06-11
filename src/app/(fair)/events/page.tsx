import { CalendarDays, ListFilter } from "lucide-react";

import { Panel } from "@/components/fair-app/panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const eventRows = [
  {
    time: "10:30",
    category: "사인회",
    booth: "B홀",
    title: "작가와 만나는 오전 세션",
  },
  {
    time: "13:00",
    category: "토크",
    booth: "독립출판 구역",
    title: "오늘의 책을 고르는 대화",
  },
  {
    time: "16:20",
    category: "워크숍",
    booth: "아트북 라운지",
    title: "표지 디자인 미니 클래스",
  },
];

export default function EventsPage() {
  return (
    <div className="bg-brand-surface">
      <Panel title="이벤트" icon={CalendarDays}>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["전체", "시간", "카테고리", "부스"].map((filter, index) => (
            <button
              key={filter}
              type="button"
              className={cn(
                "shrink-0 border border-border px-4 py-2 text-sm font-black",
                index === 0 ? "bg-brand-ink text-white" : "bg-white hover:bg-brand-yellow"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="grid gap-3">
          {eventRows.map((event) => (
            <article
              key={`${event.time}-${event.title}`}
              className="grid gap-3 border border-border bg-white p-4 sm:grid-cols-[88px_120px_minmax(0,1fr)_auto] sm:items-center"
            >
              <strong className="font-mono text-xl">{event.time}</strong>
              <span className="w-fit border border-border bg-brand-yellow px-2 py-1 text-xs font-black">
                {event.category}
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-base font-black">{event.title}</h3>
                <p className="text-sm font-bold text-brand-muted">{event.booth}</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="border-border bg-brand-panel">
                <ListFilter className="h-4 w-4" />
                보기
              </Button>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
