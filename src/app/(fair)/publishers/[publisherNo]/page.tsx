import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ExternalLink, Heart, Instagram, MessageSquareText } from "lucide-react";

import { GetPublisherByExhibitorNo } from "@/api/fair-map/fair-map";
import { ReviewComposeForm } from "@/app/(fair)/_components/review-compose-form";
import { getReviewsForPublisher } from "@/app/(fair)/_lib/review-data";
import { Panel } from "@/components/fair-app/panel";
import { boothForMap, getDisplayName } from "@/components/fair-map/map-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const mockEventRows = [
  {
    time: "10:30",
    category: "사인회",
    title: "작가 사인회",
  },
  {
    time: "13:20",
    category: "토크",
    title: "오늘의 책을 고르는 대화",
  },
  {
    time: "16:00",
    category: "이벤트",
    title: "현장 한정 굿즈 증정",
  },
];


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
  const publisher = await GetPublisherByExhibitorNo({ no });

  if (!publisher) {
    notFound();
  }

  const booth = boothForMap(publisher);
  const displayName = getDisplayName(publisher);
  const heartCount = publisher.favoriteCount;
  const categories = publisher.categories ?? [];
  const publisherReviews = getReviewsForPublisher(booth, displayName);

  return (
    <div className="bg-brand-surface">
      <Panel
        title={displayName}
        icon={MessageSquareText}
        action={
          <Button asChild variant="outline" className="rounded-none border-border bg-white font-black hover:bg-brand-yellow">
            <Link href="/popular">
              <ArrowLeft className="h-4 w-4" />
              목록
            </Link>
          </Button>
        }
      >
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
                    className="rounded-none border-border bg-brand-panel font-black hover:bg-brand-yellow"
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
                    className="rounded-none border-border bg-brand-panel font-black hover:bg-brand-yellow"
                  >
                    <a href={publisher.homepageUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Homepage
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
              <p
                className={cn(
                  "text-sm font-bold leading-6 text-brand-subtle",
                  publisher.introduction ? undefined : "text-brand-muted"
                )}
              >
                {publisher.introduction || "아직 소개 정보가 없습니다."}
              </p>

              <div className="border border-border bg-brand-surface">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-brand-rust">
                    <CalendarDays className="h-4 w-4" />
                    이벤트
                  </span>
                  <span className="text-xs font-black text-brand-muted">{mockEventRows.length}개 예정</span>
                </div>
                <ul>
                  {mockEventRows.map((event) => (
                    <li
                      key={`${booth}-${event.time}-${event.title}`}
                      className="grid grid-cols-[4rem_minmax(0,1fr)] gap-2 border-b border-border/20 px-3 py-2 text-sm last:border-b-0"
                    >
                      <span className="font-mono text-xs font-black text-brand-coral-deep">{event.time}</span>
                      <span className="min-w-0">
                        <span className="mr-1 border border-border bg-white px-1.5 py-0.5 text-[11px] font-black">
                          {event.category}
                        </span>
                        <span className="font-bold">{event.title}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          <section className="border border-border bg-white">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-black">후기</p>
              <span className="text-xs font-black text-brand-muted">{publisherReviews.length}개</span>
            </div>
            {publisherReviews.length ? (
              <div className="grid gap-0">
                {publisherReviews.map((review) => (
                  <article key={review.id} className="border-b border-border/20 p-4 last:border-b-0">
                    <p className="text-sm font-bold leading-6 text-brand-subtle">{review.body}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Avatar size="sm" className="border border-border">
                        <AvatarImage src={review.authorAvatarUrl} alt={`${review.author} 프로필`} />
                        <AvatarFallback>{review.author.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <p className="text-xs font-black text-brand-muted">{review.author}</p>
                      <span className="text-xs text-brand-muted">·</span>
                      <span className="text-xs font-black text-brand-muted">{review.time}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="p-4">
                <p className="text-sm font-bold leading-6 text-brand-muted">아직 이 출판사에 작성된 후기가 없습니다.</p>
              </div>
            )}
          </section>

          <ReviewComposeForm defaultScope="booth" defaultPublisherNo={publisher.no} variant="publisher" />
        </div>
      </Panel>
    </div>
  );
}
