"use client";

import { Instagram } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TipItem = {
  category: string;
  title: string;
  content: string;
};

export type TipPost = {
  sourceName: string;
  instagramUrl?: string;
  content: string;
  tips: TipItem[];
};

function getAccountUrl(sourceName: string) {
  const handle = sourceName.startsWith("@") ? sourceName.slice(1) : sourceName;
  return `https://www.instagram.com/${handle}/`;
}

type ViewMode = "by-category" | "by-account";

export function TipsList({ posts }: { posts: TipPost[] }) {
  const [view, setView] = useState<ViewMode>("by-category");

  // 주제별 뷰: tips를 평탄화하며 부모 post 정보 부착
  type FlatTip = TipItem & { sourceName: string; instagramUrl?: string };
  const flatTips: FlatTip[] = posts.flatMap((post) =>
    post.tips.map((tip) => ({
      ...tip,
      sourceName: post.sourceName,
      instagramUrl: post.instagramUrl,
    })),
  );

  // category 기준 그룹핑 (입력 순서 유지)
  const categoryGroups = flatTips.reduce<{ category: string; tips: FlatTip[] }[]>((acc, tip) => {
    const existing = acc.find((g) => g.category === tip.category);
    if (existing) {
      existing.tips.push(tip);
    } else {
      acc.push({ category: tip.category, tips: [tip] });
    }
    return acc;
  }, []);

  // 계정별 뷰: sourceName 기준 게시물 그룹핑 (posts 순서 유지)
  const accountGroups = posts.reduce<{ sourceName: string; posts: TipPost[] }[]>((acc, post) => {
    const existing = acc.find((g) => g.sourceName === post.sourceName);
    if (existing) {
      existing.posts.push(post);
    } else {
      acc.push({ sourceName: post.sourceName, posts: [post] });
    }
    return acc;
  }, []);

  return (
    <section className="grid gap-4">
      {/* 뷰 토글 */}
      <div className="flex overflow-hidden border border-border bg-white">
        {(["by-category", "by-account"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setView(mode)}
            className={cn(
              "flex-1 border-r py-2 text-sm font-black last:border-r-0",
              view === mode
                ? "border-r-border bg-brand-ink text-white"
                : "border-r-border bg-white text-brand-ink hover:bg-brand-surface",
            )}
          >
            {mode === "by-category" ? "주제별" : "계정별"}
          </button>
        ))}
      </div>

      {/* 주제별 뷰 */}
      {view === "by-category" && (
        <div className="grid gap-6">
          {categoryGroups.map((group) => {
            // 같은 카테고리 내 동일 출처 팁을 하나의 카드로 합침
            const sourceGroups = group.tips.reduce<{ sourceName: string; instagramUrl?: string; tips: FlatTip[] }[]>(
              (acc, tip) => {
                const existing = acc.find((g) => g.sourceName === tip.sourceName);
                if (existing) {
                  existing.tips.push(tip);
                } else {
                  acc.push({ sourceName: tip.sourceName, instagramUrl: tip.instagramUrl, tips: [tip] });
                }
                return acc;
              },
              [],
            );

            return (
              <div key={group.category} className="grid gap-3">
                <div className="flex items-center gap-3">
                  <span className="border border-border bg-brand-yellow px-2 py-1 text-xs font-black">
                    {group.category}
                  </span>
                  <span className="text-xs font-black text-brand-muted">{sourceGroups.length}개</span>
                </div>
                <div className="grid gap-3">
                  {sourceGroups.map((sg) => (
                    <article
                      key={sg.sourceName}
                      className="overflow-hidden border border-border bg-white"
                    >
                      <div className="divide-y divide-border/20">
                        {sg.tips.map((tip) => (
                          <div key={tip.title} className="px-4 py-3">
                            <h3 className="text-sm font-black leading-6">{tip.title}</h3>
                            <p className="mt-2 whitespace-pre-line text-sm font-bold leading-6 text-brand-subtle">
                              {tip.content}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-border/20 px-4 py-3">
                        <span className="min-w-0 truncate text-xs font-black text-brand-muted">
                          출처 {sg.sourceName}
                        </span>
                        {sg.instagramUrl ? (
                          <Button
                            asChild
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 shrink-0 rounded-none border-border bg-brand-panel px-2 text-xs font-black hover:bg-brand-yellow"
                          >
                            <a href={sg.instagramUrl} target="_blank" rel="noreferrer">
                              <Instagram className="h-4 w-4" />
                              원문
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 계정별 뷰 */}
      {view === "by-account" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {accountGroups.flatMap((group) =>
            group.posts.map((post) => (
              <article
                key={`${post.sourceName}-${post.instagramUrl}`}
                className="flex flex-col overflow-hidden border border-border bg-white"
              >
                <div className="flex flex-1 flex-col p-4">
                  <p className="flex-1 whitespace-pre-line text-sm font-bold leading-6 text-brand-subtle">
                    {post.content}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/20 pt-3">
                    <span className="min-w-0 truncate text-xs font-black text-brand-muted">
                      출처 {post.sourceName}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        asChild
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-none border-border bg-brand-panel px-2 text-xs font-black hover:bg-brand-yellow"
                      >
                        <a href={getAccountUrl(post.sourceName)} target="_blank" rel="noreferrer">
                          <Instagram className="h-4 w-4" />
                          계정
                        </a>
                      </Button>
                      {post.instagramUrl ? (
                        <Button
                          asChild
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-none border-border bg-brand-panel px-2 text-xs font-black hover:bg-brand-yellow"
                        >
                          <a href={post.instagramUrl} target="_blank" rel="noreferrer">
                            <Instagram className="h-4 w-4" />
                            원문
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            )),
          )}
        </div>
      )}
    </section>
  );
}
