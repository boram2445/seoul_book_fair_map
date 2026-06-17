alter table public.publisher_events
  add column if not exists start_at timestamp with time zone,
  add column if not exists end_at timestamp with time zone;

create index if not exists publisher_events_start_at_idx
on public.publisher_events (status, start_at)
where start_at is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'publisher_events_start_end_at_check'
      and conrelid = 'public.publisher_events'::regclass
  ) then
    alter table public.publisher_events
      add constraint publisher_events_start_end_at_check
      check (end_at is null or start_at is null or end_at >= start_at);
  end if;
end $$;

comment on column public.publisher_events.start_at is 'Scheduled event start datetime in Asia/Seoul when known.';
comment on column public.publisher_events.end_at is 'Scheduled event end datetime in Asia/Seoul when known.';
