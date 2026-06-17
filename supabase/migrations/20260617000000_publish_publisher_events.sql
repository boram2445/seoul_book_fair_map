-- Publish all draft publisher_events
update public.publisher_events
set status = 'published'
where status = 'draft';
