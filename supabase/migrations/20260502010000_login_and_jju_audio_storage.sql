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

create or replace function public.get_next_profile_role()
returns public.profile_role
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from public.profiles) then 'worker'::public.profile_role
    else 'owner'::public.profile_role
  end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_role public.profile_role;
begin
  next_role := public.get_next_profile_role();

  insert into public.profiles (id, full_name, role_global)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    next_role
  )
  on conflict (id) do update set
    full_name = case
      when public.profiles.full_name = '' then excluded.full_name
      else public.profiles.full_name
    end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (id, full_name, role_global, created_at)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'full_name', ''),
  case
    when row_number() over (order by users.created_at asc) = 1 then 'owner'::public.profile_role
    else 'worker'::public.profile_role
  end,
  users.created_at
from auth.users
where not exists (
  select 1
  from public.profiles
  where profiles.id = users.id
)
on conflict (id) do nothing;

update public.profiles
set role_global = 'owner'
where id = (
  select id
  from public.profiles
  order by created_at asc
  limit 1
)
and not exists (
  select 1
  from public.profiles
  where role_global = 'owner'
);

create or replace function public.ensure_current_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  next_role public.profile_role;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  next_role := public.get_next_profile_role();

  insert into public.profiles (id, full_name, role_global)
  values (
    auth.uid(),
    coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    next_role
  )
  on conflict (id) do nothing;

  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  return current_profile;
end;
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role_global = 'owner'
  );
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

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

create table if not exists public.jju_card_audio (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null unique references public.cards(id) on delete cascade,
  storage_path text not null,
  mime_type text not null default 'audio/webm',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_jju_card_audio_updated_at on public.jju_card_audio;

create trigger set_jju_card_audio_updated_at
before update on public.jju_card_audio
for each row
execute function public.set_updated_at();

create index if not exists jju_card_audio_card_id_idx
  on public.jju_card_audio (card_id);

alter table public.jju_card_audio enable row level security;

drop policy if exists "jju_card_audio_select_authenticated" on public.jju_card_audio;
drop policy if exists "jju_card_audio_insert_owner" on public.jju_card_audio;
drop policy if exists "jju_card_audio_update_owner" on public.jju_card_audio;
drop policy if exists "jju_card_audio_delete_owner" on public.jju_card_audio;

create policy "jju_card_audio_select_authenticated"
on public.jju_card_audio
for select
to authenticated
using (true);

create policy "jju_card_audio_insert_owner"
on public.jju_card_audio
for insert
to authenticated
with check (
  public.is_owner()
  and exists (
    select 1
    from public.cards
    where cards.id = jju_card_audio.card_id
      and cards.learning_mode = 'ko_es'
      and cards.starter_group = 'jju'
  )
);

create policy "jju_card_audio_update_owner"
on public.jju_card_audio
for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "jju_card_audio_delete_owner"
on public.jju_card_audio
for delete
to authenticated
using (public.is_owner());

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'card-audios',
  'card-audios',
  false,
  10485760,
  array[
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "card_audios_read_authenticated" on storage.objects;
drop policy if exists "card_audios_insert_owner" on storage.objects;
drop policy if exists "card_audios_update_owner" on storage.objects;
drop policy if exists "card_audios_delete_owner" on storage.objects;

create policy "card_audios_read_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'card-audios');

create policy "card_audios_insert_owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'card-audios'
  and public.is_owner()
);

create policy "card_audios_update_owner"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'card-audios'
  and public.is_owner()
)
with check (
  bucket_id = 'card-audios'
  and public.is_owner()
);

create policy "card_audios_delete_owner"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'card-audios'
  and public.is_owner()
);
