create extension if not exists pgcrypto;

do $$
begin
  create type public.profile_role as enum ('owner', 'worker');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role_global public.profile_role not null default 'worker',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.farm_members (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.profile_role not null default 'worker',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, user_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_farm_members_updated_at on public.farm_members;

create trigger set_farm_members_updated_at
before update on public.farm_members
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set
    full_name = excluded.full_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.ensure_current_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id, full_name)
  values (auth.uid(), '')
  on conflict (id) do nothing;

  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  return current_profile;
end;
$$;

create or replace function public.is_farm_member(target_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.farm_members
    where farm_id = target_farm_id
      and user_id = auth.uid()
      and is_active = true
  );
$$;

create or replace function public.current_farm_role(target_farm_id uuid)
returns public.profile_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.farm_members
  where farm_id = target_farm_id
    and user_id = auth.uid()
    and is_active = true
  limit 1;
$$;

alter table public.profiles enable row level security;
alter table public.farm_members enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "farm_members_select_members" on public.farm_members;
drop policy if exists "farm_members_insert_owner" on public.farm_members;
drop policy if exists "farm_members_update_owner" on public.farm_members;
drop policy if exists "farm_members_delete_owner" on public.farm_members;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "farm_members_select_members"
on public.farm_members
for select
to authenticated
using (public.is_farm_member(farm_id));

create policy "farm_members_insert_owner"
on public.farm_members
for insert
to authenticated
with check (public.current_farm_role(farm_id) = 'owner');

create policy "farm_members_update_owner"
on public.farm_members
for update
to authenticated
using (public.current_farm_role(farm_id) = 'owner')
with check (public.current_farm_role(farm_id) = 'owner');

create policy "farm_members_delete_owner"
on public.farm_members
for delete
to authenticated
using (public.current_farm_role(farm_id) = 'owner');
