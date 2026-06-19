-- 찜 목록 순서 일괄 저장
-- 배열 인덱스(1-based)를 sort_order로 매핑.
-- favorites에 UPDATE 정책이 없으므로 security definer로 우회.
-- 익명·타인 행은 auth.uid() 필터로 no-op.

create function public.set_favorite_order(p_exhibitor_nos int[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.favorites f
     set sort_order = arr.ord,
         updated_at = now()
    from (
      select p.id  as publisher_id,
             t.ord as ord
        from unnest(p_exhibitor_nos) with ordinality as t(exhibitor_no, ord)
        join public.publishers p on p.exhibitor_no = t.exhibitor_no
    ) arr
   where f.user_id      = auth.uid()
     and f.publisher_id = arr.publisher_id
     and auth.uid()     is not null;
$$;

grant execute on function public.set_favorite_order(int[]) to anon, authenticated;
