-- AlgoRift secure account and progress storage.
-- Run this entire file in the Supabase SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format
    check (username ~ '^[a-z0-9_]{3,20}$')
);

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

create table if not exists public.game_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed_level integer not null default 0,
  xp integer not null default 0,
  redline_vision_unlocked boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint game_progress_xp_range
    check (xp between 0 and 1000000)
);

alter table public.game_progress
  drop constraint if exists game_progress_level_range;

alter table public.game_progress
  add constraint game_progress_level_range
  check (completed_level between 0 and 12);

alter table public.profiles enable row level security;
alter table public.game_progress enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.game_progress from anon;
revoke all on table public.profiles from authenticated;
revoke all on table public.game_progress from authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update on table public.game_progress to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can read their own progress" on public.game_progress;
create policy "Users can read their own progress"
  on public.game_progress
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own progress" on public.game_progress;
create policy "Users can insert their own progress"
  on public.game_progress
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own progress" on public.game_progress;
create policy "Users can update their own progress"
  on public.game_progress
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists game_progress_set_updated_at on public.game_progress;
create trigger game_progress_set_updated_at
  before update on public.game_progress
  for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  requested_username := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));

  if requested_username !~ '^[a-z0-9_]{3,20}$' then
    requested_username :=
      'player_' || substring(replace(new.id::text, '-', '') from 1 for 8);
  end if;

  insert into public.profiles (id, username)
  values (new.id, requested_username);

  insert into public.game_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.set_updated_at() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, username)
select
  users.id,
  'player_' || substring(replace(users.id::text, '-', '') from 1 for 8)
from auth.users as users
where not exists (
  select 1
  from public.profiles as profiles
  where profiles.id = users.id
)
on conflict do nothing;

insert into public.game_progress (user_id)
select users.id
from auth.users as users
where not exists (
  select 1
  from public.game_progress as progress
  where progress.user_id = users.id
)
on conflict do nothing;

-- Recommended dashboard settings after running this SQL:
-- 1. Authentication > Providers > Email: keep email confirmation enabled.
-- 2. Authentication > URL Configuration:
--    Site URL: https://algorift.vercel.app
--    Redirect URLs: https://algorift.vercel.app/** and http://localhost:3000/**
-- 3. Authentication > Attack Protection: enable CAPTCHA for sign-up/sign-in.
-- 4. Authentication > Rate Limits: keep conservative defaults.
-- 5. Never expose a service_role or secret key in NEXT_PUBLIC_* variables.
