export type ReviewScope = "fair" | "booth" | "book";

export type Comment = {
  id: string;
  user_id: string;
  scope: string;
  target_label: string | null;
  content: string;
  photo_urls: string[];
  book_title: string | null;
  book_author: string | null;
  created_at: string;
  author_nickname: string | null;
  author_avatar_url: string | null;
  publisher_exhibitor_no: number | null;
  publisher_booth_number: string | null;
  publisher_name: string | null;
};

export function formatRelativeTime(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.floor(diffHour / 24)}일 전`;
}
