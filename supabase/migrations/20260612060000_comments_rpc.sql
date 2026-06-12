-- 후기 RPC 2종 + Storage 버킷
-- favorites_rpc 규약: security definer + search_path='' + auth.uid() 가드 + grant

-- ----------------------------------------------------------------
-- 1. list_comments — published 후기 조회 (전체 or 부스별)
-- ----------------------------------------------------------------
create function public.list_comments(p_exhibitor_no int default null)
returns table(
  id                    uuid,
  scope                 text,
  target_label          text,
  content               text,
  photo_urls            text[],
  created_at            timestamptz,
  author_nickname       text,
  author_avatar_url     text,
  publisher_exhibitor_no int,
  publisher_booth_number text,
  publisher_name        text
)
language sql
security definer
set search_path = ''
as $$
  select
    c.id,
    c.scope,
    c.target_label,
    c.content,
    c.photo_urls,
    c.created_at,
    pr.nickname          as author_nickname,
    pr.avatar_url        as author_avatar_url,
    pub.exhibitor_no     as publisher_exhibitor_no,
    pub.booth_number     as publisher_booth_number,
    pub.name             as publisher_name
  from public.comments c
  left join public.profiles  pr  on pr.id  = c.user_id
  left join public.publishers pub on pub.id = c.publisher_id
  where c.status = 'published'
    and (p_exhibitor_no is null or pub.exhibitor_no = p_exhibitor_no)
  order by c.created_at desc
  limit 100;
$$;

grant execute on function public.list_comments(int) to anon, authenticated;

-- ----------------------------------------------------------------
-- 2. add_comment — 후기 작성 (즉시 published, exhibitor_no 기반)
-- ----------------------------------------------------------------
create function public.add_comment(
  p_content       text,
  p_scope         text,
  p_exhibitor_no  int     default null,
  p_photo_urls    text[]  default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_publisher_id  uuid;
  v_target_label  text;
  v_comment_id    uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_scope = 'booth' then
    select id,
           pub.booth_number || ' ' || pub.name
      into v_publisher_id, v_target_label
      from public.publishers pub
     where pub.exhibitor_no = p_exhibitor_no;

    if v_publisher_id is null then
      raise exception 'Publisher not found: exhibitor_no=%', p_exhibitor_no;
    end if;
  else
    -- fair scope
    v_publisher_id := null;
    v_target_label := '서울국제도서전 전체';
  end if;

  insert into public.comments (
    user_id, publisher_id, content, scope, target_label, photo_urls, status
  ) values (
    auth.uid(), v_publisher_id, p_content, p_scope, v_target_label, p_photo_urls, 'published'
  )
  returning id into v_comment_id;

  return v_comment_id;
end;
$$;

grant execute on function public.add_comment(text, text, int, text[]) to authenticated;

-- ----------------------------------------------------------------
-- 3. Storage 버킷 + 정책 (comment-photos, public read)
-- ----------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('comment-photos', 'comment-photos', true)
on conflict (id) do nothing;

-- public select (버킷이 public=true이므로 사실상 자동이지만 명시)
create policy "comment-photos: public read"
on storage.objects for select
using (bucket_id = 'comment-photos');

-- authenticated 업로드: 자신의 uid 폴더에만
create policy "comment-photos: owner insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'comment-photos'
  and (storage.foldername(name))[1] = (auth.uid())::text
);
