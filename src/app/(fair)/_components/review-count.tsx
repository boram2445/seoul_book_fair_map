"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import type { ReviewScope } from "../_lib/review-data";
import { COMMENTS_EVENT } from "./review-compose-form";

type CountMap = Partial<Record<ReviewScope, number>>;

export function useReviewCounts(exhibitorNo?: number): CountMap {
  const supabase = useMemo(() => createClient(), []);
  const [counts, setCounts] = useState<CountMap>({});

  useEffect(() => {
    function fetchCounts() {
      supabase
        .rpc("count_comments", { p_exhibitor_no: exhibitorNo ?? null })
        .then(({ data, error }) => {
          if (error) {
            console.warn("[comments] count_comments failed:", error.message);
            return;
          }
          const map: CountMap = {};
          for (const row of (data as { scope: ReviewScope; cnt: number }[]) ?? []) {
            map[row.scope] = Number(row.cnt);
          }
          setCounts(map);
        });
    }

    fetchCounts();
    window.addEventListener(COMMENTS_EVENT, fetchCounts);
    return () => window.removeEventListener(COMMENTS_EVENT, fetchCounts);
  }, [supabase, exhibitorNo]);

  return counts;
}

/** 숫자를 "(N)" 형태로 표시. 0이면 null 반환. */
export function ReviewCountBadge({ count }: { count: number | undefined }) {
  if (!count) return null;
  return <span className="font-bold text-brand-muted">({count})</span>;
}
