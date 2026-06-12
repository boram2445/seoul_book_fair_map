-- 찜 영속화 RPC 3종 (exhibitor_no 기반, auth.uid() null이면 no-op)
-- 모두 SECURITY DEFINER + search_path 고정

-- 찜 추가
create function public.add_favorite(p_exhibitor_no int)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.favorites (user_id, publisher_id)
  select auth.uid(), p.id
    from public.publishers p
   where p.exhibitor_no = p_exhibitor_no
     and auth.uid() is not null
  on conflict do nothing;
$$;

-- 찜 해제
create function public.remove_favorite(p_exhibitor_no int)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.favorites
   where user_id = auth.uid()
     and publisher_id = (
       select id from public.publishers where exhibitor_no = p_exhibitor_no
     )
     and auth.uid() is not null;
$$;

-- 내 찜 exhibitor_no 배열 조회 (sort_order, created_at 정렬, 익명이면 빈 배열)
create function public.list_my_favorite_nos()
returns int[]
language sql
security definer
set search_path = ''
as $$
  select coalesce(
    array_agg(p.exhibitor_no order by f.sort_order, f.created_at),
    '{}'::int[]
  )
  from public.favorites f
  join public.publishers p on p.id = f.publisher_id
  where f.user_id = auth.uid()
    and auth.uid() is not null
    and p.exhibitor_no is not null;
$$;

grant execute on function public.add_favorite(int) to anon, authenticated;
grant execute on function public.remove_favorite(int) to anon, authenticated;
grant execute on function public.list_my_favorite_nos() to anon, authenticated;
