create extension if not exists pgcrypto;

create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table public.publishers (
  id uuid primary key default gen_random_uuid(),
  detail_id text not null unique,
  booth_number text not null,
  name text not null,
  categories text[] not null default '{}',
  phone text,
  homepage text,
  instagram text,
  email text,
  address text,
  introduction text,
  source_url text,
  source_page integer,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.publisher_events (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references public.publishers(id) on delete cascade,
  title text not null,
  content text not null,
  event_date date,
  starts_at time,
  ends_at time,
  category text,
  source_url text,
  instagram_url text,
  image_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  publisher_id uuid not null references public.publishers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, publisher_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  publisher_id uuid not null references public.publishers(id) on delete cascade,
  event_id uuid references public.publisher_events(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index publishers_booth_number_idx on public.publishers (booth_number);
create index publishers_name_idx on public.publishers (name);
create index publisher_events_publisher_id_idx on public.publisher_events (publisher_id);
create index publisher_events_status_date_idx on public.publisher_events (status, event_date);
create index favorites_user_id_idx on public.favorites (user_id);
create index favorites_publisher_id_idx on public.favorites (publisher_id);
create index comments_publisher_id_idx on public.comments (publisher_id);
create index comments_event_id_idx on public.comments (event_id);
create index comments_user_id_idx on public.comments (user_id);
create index comments_status_created_at_idx on public.comments (status, created_at desc);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger publishers_set_updated_at
before update on public.publishers
for each row execute function private.set_updated_at();

create trigger publisher_events_set_updated_at
before update on public.publisher_events
for each row execute function private.set_updated_at();

create trigger comments_set_updated_at
before update on public.comments
for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.publishers enable row level security;
alter table public.publisher_events enable row level security;
alter table public.favorites enable row level security;
alter table public.comments enable row level security;

create policy "Anyone can view public profiles"
on public.profiles for select
to anon, authenticated
using (true);

create policy "Users can create their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Admins can update profiles"
on public.profiles for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Anyone can view publishers"
on public.publishers for select
to anon, authenticated
using (true);

create policy "Admins can insert publishers"
on public.publishers for insert
to authenticated
with check ((select private.is_admin()));

create policy "Admins can update publishers"
on public.publishers for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Admins can delete publishers"
on public.publishers for delete
to authenticated
using ((select private.is_admin()));

create policy "Anyone can view published events"
on public.publisher_events for select
to anon, authenticated
using (status = 'published' or (select private.is_admin()));

create policy "Admins can insert events"
on public.publisher_events for insert
to authenticated
with check ((select private.is_admin()));

create policy "Admins can update events"
on public.publisher_events for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Admins can delete events"
on public.publisher_events for delete
to authenticated
using ((select private.is_admin()));

create policy "Users can view their own favorites"
on public.favorites for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own favorites"
on public.favorites for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own favorites"
on public.favorites for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Anyone can view visible comments"
on public.comments for select
to anon, authenticated
using (
  status = 'published'
  or (select auth.uid()) = user_id
  or (select private.is_admin())
);

create policy "Users can create pending comments"
on public.comments for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'pending'
);

create policy "Users can update their own pending comments"
on public.comments for update
to authenticated
using (
  (select auth.uid()) = user_id
  and status = 'pending'
)
with check (
  (select auth.uid()) = user_id
  and status in ('pending', 'deleted')
);

create policy "Admins can update comments"
on public.comments for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Admins can delete comments"
on public.comments for delete
to authenticated
using ((select private.is_admin()));

grant usage on schema public to anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant insert (id, nickname, avatar_url) on table public.profiles to authenticated;
grant update (nickname, avatar_url) on table public.profiles to authenticated;
grant update (nickname, avatar_url, role) on table public.profiles to service_role;
grant select on table public.publishers to anon, authenticated;
grant select on table public.publisher_events to anon, authenticated;
grant insert, update, delete on table public.publishers to authenticated;
grant insert, update, delete on table public.publisher_events to authenticated;
grant select, insert, delete on table public.favorites to authenticated;
grant select on table public.comments to anon, authenticated;
grant insert, update, delete on table public.comments to authenticated;
