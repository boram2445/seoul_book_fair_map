"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LogIn, Search, Send } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

import { boothForMap, exhibitors, getDisplayName } from "@/components/fair-map/map-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import type { ReviewScope } from "../_lib/review-data";
import { ReviewPhotoField, type ReviewPhotoFieldHandle } from "./review-photo-field";

export const COMMENTS_EVENT = "sibf-comments-change";

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
  scope?: ReviewScope;
  defaultPublisherNo?: number;
  variant?: "full" | "publisher";
};

export function ReviewComposeForm({
  scope = "fair",
  defaultPublisherNo,
  variant = "full",
}: ReviewComposeFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);

  // booth
  const [boothQuery, setBoothQuery] = useState("");
  const [selectedBoothValue, setSelectedBoothValue] = useState(
    defaultPublisherNo ? `${defaultPublisherNo}` : targetOptions[0]?.value ?? ""
  );
  const selectedBooth = targetOptions.find((opt) => opt.value === selectedBoothValue);
  const filteredTargets = useMemo(() => {
    const q = boothQuery.trim().toLowerCase();
    if (!q) return targetOptions;
    return targetOptions.filter((opt) => opt.searchText.includes(q));
  }, [boothQuery]);

  // form state (uncontrolled — only read on submit)
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const bookTitleRef = useRef<HTMLInputElement>(null);
  const bookAuthorRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const photoRef = useRef<ReviewPhotoFieldHandle>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  }

  async function uploadPhotos(files: File[]): Promise<string[]> {
    if (!user || files.length === 0) return [];
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("comment-photos").upload(path, file);
      if (error) {
        console.warn("[comments] photo upload failed:", error.message);
        continue;
      }
      const { data } = supabase.storage.from("comment-photos").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  const activeScope: ReviewScope = variant === "publisher" ? "booth" : scope;

  async function handleSubmit() {
    const content = contentRef.current?.value ?? "";
    if (!user || !content.trim()) return;
    if (content.trim().length > 1000) {
      toast.error("후기는 1000자 이하로 작성해주세요.");
      return;
    }
    const bookTitle = bookTitleRef.current?.value ?? "";
    const bookAuthor = bookAuthorRef.current?.value ?? "";
    setIsSubmitting(true);
    try {
      const files = photoRef.current?.getFiles() ?? [];
      const photoUrls = await uploadPhotos(files);
      const { error } = await supabase.rpc("add_comment", {
        p_content: content.trim(),
        p_scope: activeScope,
        p_exhibitor_no: activeScope === "booth" ? Number(selectedBoothValue) : null,
        p_photo_urls: photoUrls,
        p_book_title: activeScope === "book" ? (bookTitle.trim() || null) : null,
        p_book_author: activeScope === "book" ? (bookAuthor.trim() || null) : null,
      });
      if (error) {
        console.warn("[comments] add_comment failed:", error.message);
        toast.error("후기 등록에 실패했습니다.");
        return;
      }
      if (contentRef.current) contentRef.current.value = "";
      if (bookTitleRef.current) bookTitleRef.current.value = "";
      if (bookAuthorRef.current) bookAuthorRef.current.value = "";
      photoRef.current?.reset();
      window.dispatchEvent(new Event(COMMENTS_EVENT));
    } finally {
      setIsSubmitting(false);
    }
  }

  const submitButton = user ? (
    <Button
      type="button"
      disabled={isSubmitting}
      onClick={handleSubmit}
      className="rounded-none border border-border bg-brand-ink font-black text-white"
    >
      <Send className="h-4 w-4" />
      {isSubmitting ? "등록 중…" : "등록"}
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

  return (
    <section className="border border-border bg-white p-4">
      <form className="grid gap-4">
        {/* 부스 검색 — booth scope */}
        {activeScope === "booth" && variant !== "publisher" && (
          <div className="grid gap-2">
            <Label htmlFor="booth-review-search" className="text-xs font-black text-brand-rust">
              부스 검색
            </Label>
            <div className="flex items-center gap-2 border border-border bg-white px-3">
              <Search className="h-4 w-4 shrink-0" />
              <Input
                id="booth-review-search"
                value={boothQuery}
                onChange={(e) => setBoothQuery(e.target.value)}
                placeholder="부스 번호나 참여사 이름 검색"
                className="h-11 border-0 px-0 font-bold shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="max-h-52 overflow-y-auto border border-border bg-white">
              {filteredTargets.length ? (
                filteredTargets.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedBoothValue(opt.value)}
                    className={cn(
                      "grid w-full cursor-pointer grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 border-b border-border/20 px-3 py-2 text-left text-sm last:border-b-0",
                      selectedBoothValue === opt.value ? "bg-brand-ink text-white" : "hover:bg-brand-green"
                    )}
                  >
                    <span
                      className={cn(
                        "border px-2 py-1 text-center text-xs font-black",
                        selectedBoothValue === opt.value ? "border-white/40" : "border-border"
                      )}
                    >
                      {opt.booth}
                    </span>
                    <span className="min-w-0 truncate font-black">{opt.name}</span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-4 text-sm font-bold text-brand-muted">검색 결과가 없습니다.</p>
              )}
            </div>
            {selectedBooth && (
              <p className="text-xs font-black text-brand-rust">선택됨: {selectedBooth.label}</p>
            )}
          </div>
        )}

        {/* 책 제목·저자 — book scope */}
        {activeScope === "book" && (
          <>
            <div className="grid gap-2">
              <Label htmlFor="book-title" className="text-xs font-black text-brand-rust">
                책 제목
              </Label>
              <Input
                id="book-title"
                ref={bookTitleRef}
                placeholder="책 제목을 입력하세요"
                className="rounded-none border-border font-bold shadow-none"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="book-author" className="text-xs font-black text-brand-rust">
                저자
              </Label>
              <Input
                id="book-author"
                ref={bookAuthorRef}
                placeholder="저자명"
                className="rounded-none border-border font-bold shadow-none"
              />
            </div>
          </>
        )}

        {/* 본문 */}
        <div className="grid gap-2">
          <Label htmlFor="review-content" className="text-xs font-black text-brand-rust">
            {activeScope === "book" ? "추천 이유" : "후기"}
          </Label>
          <Textarea
            id="review-content"
            ref={contentRef}
            placeholder={
              activeScope === "fair"
                ? "서울국제도서전 전체 경험을 남겨주세요."
                : activeScope === "book"
                  ? "이 책을 추천하는 이유를 남겨주세요."
                  : "방문한 부스에서 좋았던 점이나 참고할 점을 남겨주세요."
            }
            className="min-h-32 resize-none rounded-none border-border bg-brand-surface font-bold shadow-none"
          />
        </div>

        <div className="flex items-end justify-between gap-2">
          <ReviewPhotoField ref={photoRef} />
          {submitButton}
        </div>
      </form>
    </section>
  );
}
