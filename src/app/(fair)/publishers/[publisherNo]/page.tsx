import { notFound } from "next/navigation";
import { CalendarDays, ExternalLink, Heart, Instagram } from "lucide-react";

import { GetPublisherByExhibitorNo, GetPublisherEvents } from "@/api/fair-map/fair-map";
import { ReviewComposeForm } from "@/app/(fair)/_components/review-compose-form";
import { ReviewFeed } from "@/app/(fair)/_components/review-feed";
import { BackButton } from "./_components/back-button";
import { PublisherReviewHeader } from "./_components/publisher-review-header";
import { BoothEventDetailList } from "@/components/fair-map/booth-event-detail-list";
import { boothForMap, getDisplayName } from "@/components/fair-map/map-helpers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


export default async function PublisherDetailPage({
  params,
}: {
  params: Promise<{ publisherNo: string }>;
}) {
  const { publisherNo } = await params;
  const no = Number(publisherNo);
  if (!Number.isInteger(no)) {
    notFound();
  }
  const [publisher, eventsByBooth] = await Promise.all([
    GetPublisherByExhibitorNo({ no }),
    GetPublisherEvents(),
  ]);

  if (!publisher) {
    notFound();
  }

  const booth = boothForMap(publisher);
  const displayName = getDisplayName(publisher);
  const heartCount = publisher.favoriteCount;
  const events = eventsByBooth[String(publisher.no)] ?? [];
  const categories = publisher.categories ?? [];
  return (
    <div className="bg-brand-panel">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4">
          <BackButton />
        </div>
        <div className="grid gap-4">
          <article className="border border-border bg-white">
            <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-border bg-brand-yellow px-2 py-1 text-xs font-black text-brand-rust">
                    {booth}
                  </span>
                  <span className="inline-flex items-center gap-1 border border-border bg-white px-2 py-1 text-xs font-black text-brand-coral-deep">
                    <Heart className="h-3.5 w-3.5 fill-brand-coral text-brand-coral" />
                    {heartCount}
                  </span>
                </div>
                <h1 className="mt-3 text-xl font-black">{displayName}</h1>
                {publisher.nameEn ? <p className="text-sm font-bold text-brand-muted">{publisher.nameEn}</p> : null}
                {categories.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {categories.slice(0, 8).map((category) => (
                      <span
                        key={category}
                        className="border border-border/60 bg-brand-panel px-2 py-1 text-xs font-black text-brand-subtle"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 md:justify-end">
                {publisher.instagramUrl ? (
                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-none border-border bg-brand-panel px-2.5 text-[11px] font-black hover:bg-brand-yellow"
                  >
                    <a href={publisher.instagramUrl} target="_blank" rel="noreferrer">
                      <Instagram className="h-4 w-4" />
                      Instagram
                    </a>
                  </Button>
                ) : null}
                {publisher.homepageUrl ? (
                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-none border-border bg-brand-panel px-2.5 text-[11px] font-black hover:bg-brand-yellow"
                  >
                    <a href={publisher.homepageUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Homepage
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className={cn("grid items-start gap-3 p-4", events.length > 0 && "lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]")}>
              <p
                className={cn(
                  "text-sm font-bold leading-6 text-brand-subtle",
                  publisher.introduction ? undefined : "text-brand-muted"
                )}
              >
                {publisher.introduction || "아직 소개 정보가 없습니다."}
              </p>

              {events.length > 0 ? (
                <div className="flex flex-col border border-border bg-brand-surface lg:max-h-[480px]">
                  <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-brand-rust">
                      <CalendarDays className="h-4 w-4" />
                      이벤트
                    </span>
                    <span className="text-xs font-black text-brand-muted">{events.length}개</span>
                  </div>
                  <div className="overflow-y-auto p-3">
                    <BoothEventDetailList events={events} />
                  </div>
                </div>
              ) : null}
            </div>
          </article>

          <section className="border border-border bg-white">
            <div className="border-b border-border px-4 py-3">
              <PublisherReviewHeader exhibitorNo={publisher.no} />
            </div>
            <ReviewFeed exhibitorNo={publisher.no} hideTag />
          </section>

          <ReviewComposeForm defaultPublisherNo={publisher.no} variant="publisher" />
        </div>
      </div>
    </div>
  );
}
