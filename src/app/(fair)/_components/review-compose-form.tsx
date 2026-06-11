"use client";

import { useEffect, useMemo, useState } from "react";
import { LogIn, Search, Send } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { boothForMap, exhibitors, getDisplayName } from "@/components/fair-map/map-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const targetOptions = exhibitors
  .slice()
  .sort((a, b) => boothForMap(a).localeCompare(boothForMap(b), "ko"))
  .map((exhibitor) => ({
    value: `${exhibitor.no}`,
    booth: boothForMap(exhibitor),
    name: getDisplayName(exhibitor),
    searchText: `${boothForMap(exhibitor)} ${getDisplayName(exhibitor)} ${exhibitor.nameEn}`.toLowerCase(),
    label: `${boothForMap(exhibitor)} ${getDisplayName(exhibitor)}`,
  }));

type ReviewComposeFormProps = {
  defaultScope?: "fair" | "booth";
  defaultPublisherNo?: number;
  variant?: "full" | "publisher";
};

export function ReviewComposeForm({
  defaultScope = "fair",
  defaultPublisherNo,
  variant = "full",
}: ReviewComposeFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [boothQuery, setBoothQuery] = useState("");
  const [selectedBoothValue, setSelectedBoothValue] = useState(
    defaultPublisherNo ? `${defaultPublisherNo}` : targetOptions[0]?.value ?? ""
  );
  const selectedBooth = targetOptions.find((option) => option.value === selectedBoothValue);
  const filteredTargets = useMemo(() => {
    const query = boothQuery.trim().toLowerCase();
    if (!query) return targetOptions.slice(0, 12);

    return targetOptions.filter((option) => option.searchText.includes(query)).slice(0, 12);
  }, [boothQuery]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  }

  const reviewSubmitButton = user ? (
    <Button type="button" className="rounded-none border border-border bg-brand-ink font-black text-white">
      <Send className="h-4 w-4" />
      등록
    </Button>
  ) : (
    <Button
      type="button"
      variant="outline"
      onClick={handleLogin}
      className="rounded-none border-border bg-white font-black hover:bg-brand-green"
    >
      <LogIn className="h-4 w-4" />
      로그인 후 작성
    </Button>
  );

  if (variant === "publisher") {
    return (
      <section className="border border-border bg-brand-yellow p-4">
        <form className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="publisher-review-content" className="text-xs font-black text-brand-rust">
              후기
            </Label>
            <Textarea
              id="publisher-review-content"
              placeholder="이 부스에서 좋았던 점이나 참고할 점을 남겨주세요."
              className="min-h-32 resize-none rounded-none border-border bg-white font-bold shadow-none"
            />
          </div>

          <div className="flex justify-end">{reviewSubmitButton}</div>
        </form>
      </section>
    );
  }

  return (
    <section className="border border-border bg-brand-yellow p-4">
      <Tabs defaultValue={defaultScope} className="gap-4">
        <TabsList className="grid h-11 w-full grid-cols-2 rounded-none border border-border bg-white p-0">
          <TabsTrigger value="fair" className="h-full rounded-none font-black">
            서울국제 도서전
          </TabsTrigger>
          <TabsTrigger value="booth" className="h-full rounded-none font-black">
            부스
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fair" className="m-0">
          <form className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fair-review-content" className="text-xs font-black text-brand-rust">
                후기
              </Label>
              <Textarea
                id="fair-review-content"
                placeholder="서울국제도서전 전체 경험을 남겨주세요."
                className="min-h-32 resize-none rounded-none border-border bg-white font-bold shadow-none"
              />
            </div>

            <div className="flex justify-end">{reviewSubmitButton}</div>
          </form>
        </TabsContent>

        <TabsContent value="booth" className="m-0">
          <form className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="booth-review-search" className="text-xs font-black text-brand-rust">
                부스 검색
              </Label>
              <div className="flex items-center gap-2 border border-border bg-white px-3">
                <Search className="h-4 w-4 shrink-0" />
                <Input
                  id="booth-review-search"
                  value={boothQuery}
                  onChange={(event) => setBoothQuery(event.target.value)}
                  placeholder="부스 번호나 참여사 이름 검색"
                  className="h-11 border-0 px-0 font-bold shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="max-h-52 overflow-y-auto border border-border bg-white">
                {filteredTargets.length ? (
                  filteredTargets.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedBoothValue(option.value)}
                      className={cn(
                        "grid w-full cursor-pointer grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 border-b border-border/20 px-3 py-2 text-left text-sm last:border-b-0",
                        selectedBoothValue === option.value ? "bg-brand-ink text-white" : "hover:bg-brand-green"
                      )}
                    >
                      <span
                        className={cn(
                          "border px-2 py-1 text-center text-xs font-black",
                          selectedBoothValue === option.value ? "border-white/40" : "border-border"
                        )}
                      >
                        {option.booth}
                      </span>
                      <span className="min-w-0 truncate font-black">{option.name}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-4 text-sm font-bold text-brand-muted">검색 결과가 없습니다.</p>
                )}
              </div>
              {selectedBooth ? (
                <p className="text-xs font-black text-brand-rust">선택됨: {selectedBooth.label}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="booth-review-content" className="text-xs font-black text-brand-rust">
                후기
              </Label>
              <Textarea
                id="booth-review-content"
                placeholder="방문한 부스에서 좋았던 점이나 참고할 점을 남겨주세요."
                className="min-h-32 resize-none rounded-none border-border bg-white font-bold shadow-none"
              />
            </div>

            <div className="flex justify-end">{reviewSubmitButton}</div>
          </form>
        </TabsContent>
      </Tabs>
    </section>
  );
}
