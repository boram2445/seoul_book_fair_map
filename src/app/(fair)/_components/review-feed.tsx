"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { type Comment, type ReviewScope, formatRelativeTime } from "../_lib/review-data";
import { COMMENTS_EVENT } from "./review-compose-form";

type ReviewFeedProps = {
  exhibitorNo?: number;
  scope?: ReviewScope;
  /** 부스 상세 페이지처럼 이미 컨텍스트가 명확한 경우 scope 태그를 숨긴다 */
  hideTag?: boolean;
};

function getTagClass(scope: string) {
  return cn(
    "border border-border px-2 py-1 text-xs font-black",
    scope === "fair"
      ? "bg-brand-yellow text-brand-rust"
      : scope === "book"
        ? "bg-brand-coral text-white"
        : "bg-brand-green text-brand-green-ink"
  );
}

function publisherHref(comment: Comment): string | undefined {
  if (comment.scope !== "booth" || !comment.publisher_exhibitor_no) return undefined;
  return `/publishers/${comment.publisher_exhibitor_no}`;
}

function extractStoragePath(url: string): string | null {
  const marker = "/comment-photos/";
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

export function ReviewFeed({ exhibitorNo, scope, hideTag = false }: ReviewFeedProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const supabase = createClient();

  const fetchComments = useCallback(() => {
    supabase
      .rpc("list_comments", {
        p_exhibitor_no: exhibitorNo ?? null,
        p_scope: scope ?? null,
      })
      .then(({ data, error }) => {
        if (error) {
          console.warn("[comments] list_comments failed:", error.message);
          return;
        }
        setComments((data as Comment[]) ?? []);
      });
  }, [exhibitorNo, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchComments();
    window.addEventListener(COMMENTS_EVENT, fetchComments);
    return () => window.removeEventListener(COMMENTS_EVENT, fetchComments);
  }, [fetchComments]);

  async function handleDelete(commentId: string) {
    setDeletingId(commentId);
    const { data: photoUrls, error } = await supabase.rpc("delete_comment", {
      p_comment_id: commentId,
    });
    if (error) {
      console.warn("[comments] delete_comment failed:", error.message);
      toast.error("삭제에 실패했습니다.");
      setDeletingId(null);
      return;
    }

    const paths = ((photoUrls as string[]) ?? [])
      .map(extractStoragePath)
      .filter((p): p is string => p !== null);
    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage.from("comment-photos").remove(paths);
      if (storageError) {
        console.warn("[comments] storage remove failed:", storageError.message);
      }
    }

    setDeletingId(null);
    window.dispatchEvent(new Event(COMMENTS_EVENT));
  }

  if (comments.length === 0) {
    return (
      <div className="p-4">
        <p className="text-sm font-bold leading-6 text-brand-muted">아직 작성된 후기가 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-0">
        {comments.map((comment) => {
          const href = publisherHref(comment);
          const label = comment.target_label ?? "";
          const author = comment.author_nickname ?? "익명";
          const avatarUrl = comment.author_avatar_url ?? undefined;
          const isOwner = !!currentUserId && comment.user_id === currentUserId;

          return (
            <article key={comment.id} className="border-b border-border/20 p-4 last:border-b-0">
              {!hideTag && comment.scope === "booth" && (
                <div className="flex flex-wrap items-center gap-2">
                  {href ? (
                    <Link href={href} className={cn(getTagClass(comment.scope), "hover:bg-brand-yellow")}>
                      {label}
                    </Link>
                  ) : (
                    <span className={getTagClass(comment.scope)}>{label}</span>
                  )}
                </div>
              )}

              {comment.scope === "book" && (comment.book_title || comment.book_author) && (
                <div className="mt-3 flex items-start gap-2">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-brand-coral-deep" />
                  <div className="min-w-0">
                    {comment.book_title && (
                      <p className="text-sm font-black text-brand-ink">{comment.book_title}</p>
                    )}
                    {comment.book_author && (
                      <p className="text-xs font-bold text-brand-muted">{comment.book_author}</p>
                    )}
                  </div>
                </div>
              )}

              <p className="mt-3 text-sm font-bold leading-6 text-brand-subtle">{comment.content}</p>

              {comment.photo_urls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {comment.photo_urls.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setLightboxUrl(url)}
                      className="h-24 w-24 cursor-zoom-in overflow-hidden border border-border"
                      aria-label={`사진 ${i + 1} 크게 보기`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`첨부 사진 ${i + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Avatar size="sm" className="border border-border">
                    <AvatarImage src={avatarUrl} alt={`${author} 프로필`} />
                    <AvatarFallback>{author.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-black text-brand-muted">{author}</p>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-brand-muted">
                    {formatRelativeTime(comment.created_at)}
                  </span>
                  {isOwner && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === comment.id}
                        className="h-7 rounded-none px-2 text-brand-muted hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="text-xs font-black">삭제</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-none">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-black">후기를 삭제할까요?</AlertDialogTitle>
                        <AlertDialogDescription>
                          삭제된 후기와 첨부 사진은 복구할 수 없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-none font-black">취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(comment.id)}
                          className="rounded-none bg-red-600 font-black hover:bg-red-700"
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* 사진 라이트박스 */}
      {lightboxUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="사진 크게 보기"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="사진 크게 보기"
            className="max-h-[90dvh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
