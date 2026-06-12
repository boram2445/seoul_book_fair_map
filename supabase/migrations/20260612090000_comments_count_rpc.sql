-- scope별 후기 개수 반환 RPC
-- p_exhibitor_no: 부스 상세용 필터. null이면 전체 scope별 count 반환.

create function public.count_comments(
  p_exhibitor_no int default null
)
returns table(
  scope text,
  cnt   bigint
)
language sql
security definer
set search_path = ''
as $$
  select
    c.scope,
    count(*) as cnt
  from public.comments c
  left join public.publishers pub on pub.id = c.publisher_id
  where c.status = 'published'
    and (p_exhibitor_no is null or pub.exhibitor_no = p_exhibitor_no)
  group by c.scope;
$$;

grant execute on function public.count_comments(int) to anon, authenticated;
