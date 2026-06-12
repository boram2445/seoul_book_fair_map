-- 방문 메모 RPC 2종 (exhibitor_no 기반, auth.uid() null이면 no-op)
-- favorites.visit_memo 컬럼은 20260612000000_extend_fair_tabs_schema.sql 에서 이미 추가됨

-- 메모 저장/수정 (upsert)
-- upsert 이유: 찜 push가 fire-and-forget이라 favorite 행이 없을 수 있어 메모 유실 방지
create function public.set_visit_memo(p_exhibitor_no int, p_memo text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.favorites (user_id, publisher_id, visit_memo)
  select auth.uid(), p.id, nullif(trim(p_memo), '')
    from public.publishers p
   where p.exhibitor_no = p_exhibitor_no
     and auth.uid() is not null
  on conflict (user_id, publisher_id)
  do update set
    visit_memo = nullif(trim(p_memo), ''),
    updated_at = now();
$$;

-- 내 메모 목록 조회 (hydration용, visit_memo 있는 행만)
create function public.list_my_favorite_memos()
returns table(exhibitor_no int, visit_memo text)
language sql
security definer
set search_path = ''
as $$
  select p.exhibitor_no, f.visit_memo
    from public.favorites f
    join public.publishers p on p.id = f.publisher_id
   where f.user_id = auth.uid()
     and auth.uid() is not null
     and f.visit_memo is not null
     and p.exhibitor_no is not null;
$$;

grant execute on function public.set_visit_memo(int, text) to anon, authenticated;
grant execute on function public.list_my_favorite_memos() to anon, authenticated;
