import { ExternalLinkButton } from "@/components/fair-app/external-link-button";
import { type BoothEvent, getEventScheduleLabel } from "./booth-events";

interface BoothEventDetailListProps {
  events: BoothEvent[];
}

export function BoothEventDetailList({ events }: BoothEventDetailListProps) {
  if (events.length === 0) {
    return (
      <p className="px-3 py-4 text-sm font-bold text-brand-muted">
        예정된 이벤트가 없습니다.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => (
        <li
          key={`${getEventScheduleLabel(event)}-${event.title}`}
          className="overflow-hidden border border-border bg-white"
        >
          {event.imageUrl ? (
            <div
              className="aspect-[4/3] border-b border-border bg-brand-surface bg-cover bg-center"
              style={{ backgroundImage: `url(${event.imageUrl})` }}
            />
          ) : null}
          <div className="p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-sm font-black text-brand-coral-deep">
                {getEventScheduleLabel(event)}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                {event.period ? (
                  <span className="border border-border bg-brand-yellow px-2 py-1 text-xs font-black">
                    기간 이벤트
                  </span>
                ) : null}
                <span className="border border-border bg-brand-green px-2 py-1 text-xs font-black">
                  {event.category}
                </span>
              </div>
            </div>
            <h4 className="mt-3 text-base font-black leading-5">{event.title}</h4>
            <p className="mt-2 whitespace-pre-line text-sm font-bold leading-5 text-brand-subtle">
              {event.content}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/20 pt-3">
              <span className="min-w-0 truncate text-xs font-black text-brand-muted">
                출처 {event.sourceName}
              </span>
              {event.instagramUrl ? (
                <ExternalLinkButton
                  href={event.instagramUrl}
                  kind="instagram"
                  label="원문"
                  tone="panel"
                />
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
