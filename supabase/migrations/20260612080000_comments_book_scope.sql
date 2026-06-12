-- '책 추천' scope 추가 + book_title/book_author 컬럼
-- add_comment / list_comments 재생성

-- ----------------------------------------------------------------
-- 1. 컬럼 추가
-- ----------------------------------------------------------------
alter table public.comments
  add column if not exists book_title  text,
  add column if not exists book_author text;

-- ----------------------------------------------------------------
-- 2. scope 제약 재작성 ('book' 추가)
-- ----------------------------------------------------------------
alter table public.comments
  drop constraint if exists comments_scope_check,
  drop constraint if exists comments_scope_target_check;

alter table public.comments
  add constraint comments_scope_check
    check (scope = any (array['fair','booth','book'])),
  add constraint comments_scope_target_check
    check (
      ((scope = 'fair')  and publisher_id is null)
      or ((scope = 'booth') and publisher_id is not null)
      or ((scope = 'book')  and publisher_id is null)
    );

-- ----------------------------------------------------------------
-- 3. list_comments 재생성 (p_scope 필터 + book_title/author 반환)
-- ----------------------------------------------------------------
drop function if exists public.list_comments(int);

create function public.list_comments(
  p_exhibitor_no int  default null,
  p_scope        text default null
)
returns table(
  id                     uuid,
  user_id                uuid,
  scope                  text,
  target_label           text,
  content                text,
  photo_urls             text[],
  book_title             text,
  book_author            text,
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
    c.book_title,
    c.book_author,
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
    and (p_scope        is null or c.scope = p_scope)
  order by c.created_at desc
  limit 100;
$$;

grant execute on function public.list_comments(int, text) to anon, authenticated;

-- ----------------------------------------------------------------
-- 4. add_comment 재생성 (p_book_title/author 추가)
-- ----------------------------------------------------------------
drop function if exists public.add_comment(text, text, int, text[]);

create function public.add_comment(
  p_content      text,
  p_scope        text,
  p_exhibitor_no int     default null,
  p_photo_urls   text[]  default '{}',
  p_book_title   text    default null,
  p_book_author  text    default null
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
    select id, pub.booth_number || ' ' || pub.name
      into v_publisher_id, v_target_label
      from public.publishers pub
     where pub.exhibitor_no = p_exhibitor_no;

    if v_publisher_id is null then
      raise exception 'Publisher not found: exhibitor_no=%', p_exhibitor_no;
    end if;
  elsif p_scope = 'book' then
    v_publisher_id := null;
    v_target_label := '책 추천';
  else
    -- fair
    v_publisher_id := null;
    v_target_label := '서울국제도서전 전체';
  end if;

  insert into public.comments (
    user_id, publisher_id, content, scope, target_label,
    photo_urls, book_title, book_author, status
  ) values (
    auth.uid(), v_publisher_id, p_content, p_scope, v_target_label,
    p_photo_urls, p_book_title, p_book_author, 'published'
  )
  returning id into v_comment_id;

  return v_comment_id;
end;
$$;

grant execute on function public.add_comment(text, text, int, text[], text, text) to authenticated;
