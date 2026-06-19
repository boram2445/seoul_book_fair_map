-- 입구 선택(A/B)을 프로필에 저장 — 기기 간 동기화용
-- profiles에 route_entrance 컬럼 추가 (nullable = 자동)

alter table public.profiles
  add column if not exists route_entrance text
    check (route_entrance in ('A', 'B'));

-- 입구 저장/수정
create function public.set_route_entrance(p_entrance text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set route_entrance = case when p_entrance in ('A', 'B') then p_entrance else null end,
         updated_at     = now()
   where id         = auth.uid()
     and auth.uid() is not null;
$$;

-- 입구 조회 (하이드레이션용)
create function public.get_route_entrance()
returns text
language sql
security definer
set search_path = ''
as $$
  select route_entrance
    from public.profiles
   where id = auth.uid()
     and auth.uid() is not null;
$$;

grant execute on function public.set_route_entrance(text) to anon, authenticated;
grant execute on function public.get_route_entrance()     to anon, authenticated;
