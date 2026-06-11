"use client";

import Link from "next/link";
import { MessageSquareText } from "lucide-react";

import { ReviewComposeForm } from "@/app/(fair)/_components/review-compose-form";
import { getPublisherHrefForReview, reviewRows } from "@/app/(fair)/_lib/review-data";
import { Panel } from "@/components/fair-app/panel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function getReviewTagClass(scope: string) {
  return cn(
    "border border-border px-2 py-1 text-xs font-black",
    scope === "fair" ? "bg-brand-yellow text-brand-rust" : "bg-brand-green text-brand-green-ink"
  );
}

export default function ReviewsPage() {
  return (
    <div className="bg-brand-surface">
      <Panel title="후기" icon={MessageSquareText}>
        <div className="grid gap-4">
          <section className="border border-border bg-white">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-black">후기 피드</p>
            </div>
            <div className="grid gap-0">
              {reviewRows.map((review) => {
                const publisherHref = getPublisherHrefForReview(review);

                return (
                  <article key={review.id} className="border-b border-border/20 p-4 last:border-b-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {publisherHref ? (
                        <Link href={publisherHref} className={cn(getReviewTagClass(review.scope), "hover:bg-brand-yellow")}>
                          {review.target}
                        </Link>
                      ) : (
                        <span className={getReviewTagClass(review.scope)}>{review.target}</span>
                      )}
                      <span className="text-xs font-black text-brand-muted">{review.time}</span>
                    </div>
                    <p className="mt-3 text-sm font-bold leading-6 text-brand-subtle">{review.body}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Avatar size="sm" className="border border-border">
                        <AvatarImage src={review.authorAvatarUrl} alt={`${review.author} 프로필`} />
                        <AvatarFallback>{review.author.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <p className="text-xs font-black text-brand-muted">{review.author}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <ReviewComposeForm />
        </div>
      </Panel>
    </div>
  );
}
