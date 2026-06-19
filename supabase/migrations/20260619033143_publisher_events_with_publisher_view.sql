create or replace view public.publisher_events_with_publisher
with (security_invoker = true)
as
select
  e.id,
  e.publisher_id,
  p.name as publisher_name,
  p.exhibitor_no as publisher_exhibitor_no,
  p.booth_number as publisher_booth_number,
  p.original_booth_number as publisher_original_booth_number,
  e.title,
  e.content,
  e.event_date,
  e.start_at,
  e.end_at,
  e.category,
  e.display_time,
  e.instagram_url,
  e.image_url,
  e.status
from public.publisher_events e
join public.publishers p on p.id = e.publisher_id;

comment on view public.publisher_events_with_publisher is
  'Publisher event list with publisher display fields for easier admin review.';

grant select on table public.publisher_events_with_publisher to anon, authenticated;
