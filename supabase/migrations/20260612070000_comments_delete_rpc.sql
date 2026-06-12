-- 댓글 삭제 RPC + list_comments user_id 추가 + Storage 삭제 정책

-- ----------------------------------------------------------------
-- 1. list_comments 재생성 (user_id 컬럼 추가 — 반환 타입 변경)
-- ----------------------------------------------------------------
drop function if exists public.list_comments(int);

create function public.list_comments(p_exhibitor_no int default null)
returns table(
  id                     uuid,
  user_id                uuid,
  scope                  text,
  target_label           text,
  content                text,
  photo_urls             text[],
  created_at             timestamptz,
  author_nickname        text,
  author_avatar_url      text,
  publisher_exhibitor_no int,
  publisher_booth_number text,
  publisher_name         text
)
language sql
security definer
set search_path = ''
as $$
  select
    c.id,
    c.user_id,
    c.scope,
    c.target_label,
    c.content,
    c.photo_urls,
    c.created_at,
    pr.nickname           as author_nickname,
    pr.avatar_url         as author_avatar_url,
    pub.exhibitor_no      as publisher_exhibitor_no,
    pub.booth_number      as publisher_booth_number,
    pub.name              as publisher_name
  from public.comments c
  left join public.profiles   pr  on pr.id  = c.user_id
  left join public.publishers pub on pub.id = c.publisher_id
  where c.status = 'published'
    and (p_exhibitor_no is null or pub.exhibitor_no = p_exhibitor_no)
  order by c.created_at desc
  limit 100;
$$;

grant execute on function public.list_comments(int) to anon, authenticated;

-- ----------------------------------------------------------------
-- 2. delete_comment — 본인 글만 삭제, photo_urls 반환(클라 Storage 정리용)
-- ----------------------------------------------------------------
create function public.delete_comment(p_comment_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_photo_urls text[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.comments
  where id = p_comment_id
    and user_id = auth.uid()
  returning photo_urls into v_photo_urls;

  return coalesce(v_photo_urls, '{}'::text[]);
end;
$$;

grant execute on function public.delete_comment(uuid) to authenticated;

-- ----------------------------------------------------------------
-- 3. Storage — comment-photos 소유자 삭제 정책
-- ----------------------------------------------------------------
create policy "comment-photos: owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'comment-photos'
  and (storage.foldername(name))[1] = (auth.uid())::text
);
