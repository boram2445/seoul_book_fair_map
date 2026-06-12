-- ensure_profile(): 로그인 시점 프로필 존재 보장 (자가치유)
-- 트리거 누락·고아 유저를 다음 로그인에서 자동 보충한다.
-- SECURITY DEFINER + search_path = '' (모든 객체 fully-qualify)

create or replace function public.ensure_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid;
  v_nickname text;
  v_avatar   text;
begin
  v_uid := (select auth.uid());

  -- 익명(미로그인) 상태면 no-op
  if v_uid is null then
    return;
  end if;

  -- auth.users 메타에서 닉네임·아바타 추출 (handle_new_user 와 동일 로직)
  select
    coalesce(raw_user_meta_data ->> 'name', raw_user_meta_data ->> 'full_name'),
    raw_user_meta_data ->> 'avatar_url'
  into v_nickname, v_avatar
  from auth.users
  where id = v_uid;

  -- 항상 Google 메타 최신값으로 갱신.
  -- 근거: 현재 앱에 닉네임/아바타 편집 UI가 없어 Google이 유일한 출처.
  -- 추후 편집 UI 생기면 coalesce(profiles.nickname, excluded.nickname) 로 전환.
  insert into public.profiles (id, nickname, avatar_url)
  values (v_uid, v_nickname, v_avatar)
  on conflict (id) do update set
    nickname   = excluded.nickname,
    avatar_url = excluded.avatar_url,
    updated_at = now();
end;
$$;

grant execute on function public.ensure_profile() to anon, authenticated;

-- 기존 고아 유저 백필 (멱등 — 재실행 안전, 이미 있는 프로필은 건드리지 않음)
insert into public.profiles (id, nickname, avatar_url)
select
  id,
  coalesce(raw_user_meta_data ->> 'name', raw_user_meta_data ->> 'full_name'),
  raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;
