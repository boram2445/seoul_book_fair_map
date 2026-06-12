"use client";

import { useReviewCounts } from "@/app/(fair)/_components/review-count";

export function PublisherReviewHeader({ exhibitorNo }: { exhibitorNo: number }) {
  const counts = useReviewCounts(exhibitorNo);
  const total = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);

  return (
    <p className="text-sm font-black">
      후기{total > 0 && <span className="ml-1 font-bold text-brand-muted">({total})</span>}
    </p>
  );
}
