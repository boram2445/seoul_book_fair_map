alter table public.publishers
  add column if not exists exhibitor_no integer,
  add column if not exists original_booth_number text,
  add column if not exists name_en text,
  add column if not exists country_ko text,
  add column if not exists country_en text,
  add column if not exists is_special boolean not null default false;

create unique index if not exists publishers_exhibitor_no_key
on public.publishers (exhibitor_no)
where exhibitor_no is not null;

create index if not exists publishers_categories_gin_idx
on public.publishers using gin (categories);

create index if not exists publishers_name_en_idx
on public.publishers (name_en);

create table if not exists public.booth_shapes (
  booth_number text primary key,
  x numeric not null,
  y numeric not null,
  width numeric not null,
  height numeric not null,
  fill text not null default 'black',
  transform text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger booth_shapes_set_updated_at
before update on public.booth_shapes
for each row execute function private.set_updated_at();

alter table public.publisher_events
  add column if not exists period_label text,
  add column if not exists display_time text,
  add column if not exists location_label text,
  add column if not exists source_name text;

create index if not exists publisher_events_category_idx
on public.publisher_events (category);

alter table public.favorites
  add column if not exists sort_order integer not null default 0,
  add column if not exists visit_memo text,
  add column if not exists updated_at timestamptz not null default now();

create trigger favorites_set_updated_at
before update on public.favorites
for each row execute function private.set_updated_at();

create index if not exists favorites_user_sort_order_idx
on public.favorites (user_id, sort_order, created_at);

alter table public.comments
  alter column publisher_id drop not null,
  add column if not exists scope text not null default 'booth',
  add column if not exists target_label text,
  add column if not exists rating smallint,
  add column if not exists photo_urls text[] not null default '{}';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_scope_check'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comments_scope_check
      check (scope in ('fair', 'booth'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_scope_target_check'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comments_scope_target_check
      check (
        (scope = 'fair' and publisher_id is null)
        or (scope = 'booth' and publisher_id is not null)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_rating_check'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comments_rating_check
      check (rating is null or rating between 1 and 5);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_photo_urls_length_check'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comments_photo_urls_length_check
      check (array_length(photo_urls, 1) is null or array_length(photo_urls, 1) <= 4);
  end if;
end $$;

create index if not exists comments_scope_created_at_idx
on public.comments (scope, created_at desc);

create index if not exists comments_publisher_scope_created_at_idx
on public.comments (publisher_id, scope, created_at desc)
where publisher_id is not null;

alter table public.booth_shapes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'booth_shapes' and policyname = 'Anyone can view booth shapes') then
    create policy "Anyone can view booth shapes" on public.booth_shapes for select to anon, authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'booth_shapes' and policyname = 'Admins can insert booth shapes') then
    create policy "Admins can insert booth shapes" on public.booth_shapes for insert to authenticated with check ((select private.is_admin()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'booth_shapes' and policyname = 'Admins can update booth shapes') then
    create policy "Admins can update booth shapes" on public.booth_shapes for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'booth_shapes' and policyname = 'Admins can delete booth shapes') then
    create policy "Admins can delete booth shapes" on public.booth_shapes for delete to authenticated using ((select private.is_admin()));
  end if;
end $$;

grant select on table public.booth_shapes to anon, authenticated;
grant insert, update, delete on table public.booth_shapes to authenticated;
