"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import type { ReviewScope } from "../_lib/review-data";
import { ReviewComposeForm } from "./review-compose-form";
import { ReviewCountBadge, useReviewCounts } from "./review-count";
import { ReviewFeed } from "./review-feed";

const TABS: { value: ReviewScope; label: string }[] = [
  { value: "fair", label: "도서전" },
  { value: "booth", label: "부스" },
  { value: "book", label: "책 추천" },
];

export function ReviewsBoard() {
  const [scope, setScope] = useState<ReviewScope>("fair");
  const counts = useReviewCounts();

  return (
    <div className="grid gap-4">
      <section className="border border-border bg-white">
        <div className="flex border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setScope(tab.value)}
              className={cn(
                "flex-1 cursor-pointer border-r border-border px-3 py-2 text-sm font-black last:border-r-0 sm:py-3",
                scope === tab.value
                  ? "bg-brand-ink text-white"
                  : "text-brand-muted hover:bg-brand-surface"
              )}
            >
              {tab.label} <ReviewCountBadge count={counts[tab.value]} />
            </button>
          ))}
        </div>
      </section>

      <ReviewComposeForm key={scope} scope={scope} />

      <section className="border border-border bg-white">
        <ReviewFeed scope={scope} />
      </section>
    </div>
  );
}
