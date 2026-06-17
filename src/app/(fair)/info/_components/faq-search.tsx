"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";

export type FaqItem = {
  category: string;
  question: string;
  answer: string;
};

export function FaqSearch({ items }: { items: FaqItem[] }) {
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;

    return items.filter((item) => {
      return [item.category, item.question, item.answer].join(" ").toLowerCase().includes(normalized);
    });
  }, [items, query]);

  return (
    <section className="grid gap-4">
      <div className="flex items-center gap-2 border border-border bg-white px-3">
        <Search className="h-4 w-4 shrink-0" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="티켓, 환불, 강연, 재입장 검색"
          className="h-9 border-0 px-0 text-sm shadow-none focus-visible:ring-0 md:h-11"
        />
      </div>

      <div className="flex items-center justify-between text-xs font-black text-brand-muted">
        <span>FAQ {filteredItems.length}개</span>
        <span>출처 sibf.kr</span>
      </div>

      <div className="grid gap-3">
        {filteredItems.map((item) => (
          <article key={`${item.category}-${item.question}`} className="border border-border bg-white">
            <div className="flex items-start gap-3 border-b border-border/20 px-4 py-3">
              <span className="shrink-0 whitespace-nowrap border border-border bg-brand-yellow px-2 py-1 text-xs font-black">
                {item.category}
              </span>
              <h3 className="min-w-0 text-sm font-black leading-6">{item.question}</h3>
            </div>
            <p className="px-4 py-3 text-sm font-bold leading-6 text-brand-subtle">{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
