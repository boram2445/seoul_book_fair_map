-- publishers 테이블에 찜 집계 카운트 추가 (익명/로그인 공용)
alter table public.publishers
  add column favorite_count int not null default 0;

create index publishers_favorite_count_idx
  on public.publishers (favorite_count desc);

-- 익명·로그인 모두 호출 가능한 찜 카운트 +1/-1 RPC
-- SECURITY DEFINER + search_path 고정으로 보안 강화
-- greatest(0, ...) 로 0 미만 클램프
create function public.bump_favorite_count(p_exhibitor_no int, p_delta int)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.publishers
     set favorite_count = greatest(0, favorite_count + p_delta)
   where exhibitor_no = p_exhibitor_no;
$$;

grant execute on function public.bump_favorite_count(int, int) to anon, authenticated;
