alter table public.comments
  drop column if exists event_id;

alter table public.publisher_events
  drop column if exists source_url;

alter table public.publishers
  drop column if exists detail_id,
  drop column if exists phone,
  drop column if exists email,
  drop column if exists address,
  drop column if exists source_url,
  drop column if exists source_page;
