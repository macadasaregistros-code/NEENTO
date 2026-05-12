create extension if not exists pgcrypto;

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  is_starter boolean not null default false,
  starter_group text,
  display_order int,
  type text not null check (type in ('word', 'phrase')),
  learning_mode text not null default 'ja_es' check (learning_mode in ('ja_es', 'ko_es')),
  learning_language text not null default 'ja' check (learning_language in ('ja', 'es', 'ko')),
  support_language text not null default 'es' check (support_language in ('ja', 'es', 'ko')),
  learning_text text not null,
  learning_reading text,
  support_text text not null,
  support_reading text,
  japanese_romaji text not null,
  japanese_kana text,
  speech_variants text[],
  spanish text not null,
  category text not null,
  image_url text,
  audio_url text,
  created_at timestamptz not null default now()
);

alter table public.cards
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.cards
  add column if not exists is_starter boolean not null default false;

alter table public.cards
  add column if not exists starter_group text;

alter table public.cards
  add column if not exists display_order int;

alter table public.cards
  add column if not exists japanese_kana text;

alter table public.cards
  add column if not exists speech_variants text[];

alter table public.cards
  add column if not exists learning_mode text;

alter table public.cards
  add column if not exists learning_language text;

alter table public.cards
  add column if not exists support_language text;

alter table public.cards
  add column if not exists learning_text text;

alter table public.cards
  add column if not exists learning_reading text;

alter table public.cards
  add column if not exists support_text text;

alter table public.cards
  add column if not exists support_reading text;

update public.cards
set
  learning_mode = coalesce(learning_mode, 'ja_es'),
  learning_language = coalesce(learning_language, 'ja'),
  support_language = coalesce(support_language, 'es'),
  learning_text = coalesce(learning_text, japanese_kana, japanese_romaji),
  learning_reading = coalesce(learning_reading, japanese_romaji),
  support_text = coalesce(support_text, spanish)
where learning_mode is null
  or learning_language is null
  or support_language is null
  or learning_text is null
  or support_text is null;

alter table public.cards
  alter column learning_mode set default 'ja_es',
  alter column learning_mode set not null,
  alter column learning_language set default 'ja',
  alter column learning_language set not null,
  alter column support_language set default 'es',
  alter column support_language set not null,
  alter column learning_text set not null,
  alter column support_text set not null;

update public.cards
set starter_group = 'default'
where is_starter = true
  and starter_group is null;

update public.cards
set display_order = coalesce(display_order, extract(epoch from created_at)::int)
where display_order is null;

do $$
begin
  alter table public.cards
    add constraint cards_starter_group_check
    check (starter_group is null or starter_group in ('default', 'jju'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.cards
    add constraint cards_learning_mode_check
    check (learning_mode in ('ja_es', 'ko_es'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.cards
    add constraint cards_learning_language_check
    check (learning_language in ('ja', 'es', 'ko'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.cards
    add constraint cards_support_language_check
    check (support_language in ('ja', 'es', 'ko'));
exception when duplicate_object then null;
end $$;

create table if not exists public.card_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  visual_level int not null default 0 check (visual_level between 0 and 9),
  oral_level int not null default 0 check (oral_level between 0 and 9),
  visual_due_at timestamptz not null default now(),
  oral_due_at timestamptz,
  visual_success_count int not null default 0,
  visual_fail_count int not null default 0,
  oral_success_count int not null default 0,
  oral_fail_count int not null default 0,
  visual_streak int not null default 0,
  oral_streak int not null default 0,
  level_zero_visual_reps int not null default 0,
  level_zero_oral_reps int not null default 0,
  last_visual_review_at timestamptz,
  last_oral_review_at timestamptz,
  is_difficult boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visual_level_covers_oral_level check (visual_level >= oral_level)
);

alter table public.card_progress
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

delete from public.card_progress
where user_id is null;

alter table public.card_progress
  alter column user_id set not null;

drop index if exists card_progress_user_card_idx;
drop index if exists card_progress_anonymous_card_idx;

create unique index if not exists card_progress_user_card_idx
  on public.card_progress (user_id, card_id)
  where user_id is not null;

create index if not exists cards_user_id_idx
  on public.cards (user_id);

create index if not exists cards_is_starter_idx
  on public.cards (is_starter);

create index if not exists cards_learning_mode_idx
  on public.cards (learning_mode);

create index if not exists cards_starter_group_idx
  on public.cards (starter_group);

create index if not exists cards_display_order_idx
  on public.cards (display_order);

create index if not exists card_progress_visual_due_idx
  on public.card_progress (visual_due_at);

create index if not exists card_progress_oral_due_idx
  on public.card_progress (oral_due_at);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_card_progress_updated_at on public.card_progress;

create trigger set_card_progress_updated_at
before update on public.card_progress
for each row
execute function public.set_updated_at();

alter table public.cards enable row level security;
alter table public.card_progress enable row level security;

drop policy if exists "cards_select_starter_or_own" on public.cards;
drop policy if exists "cards_insert_own" on public.cards;
drop policy if exists "cards_update_own" on public.cards;
drop policy if exists "cards_delete_own" on public.cards;

create policy "cards_select_starter_or_own"
on public.cards
for select
to anon, authenticated
using (is_starter = true or user_id = auth.uid());

create policy "cards_insert_own"
on public.cards
for insert
to authenticated
with check (user_id = auth.uid() and is_starter = false);

create policy "cards_update_own"
on public.cards
for update
to authenticated
using (user_id = auth.uid() and is_starter = false)
with check (user_id = auth.uid() and is_starter = false);

create policy "cards_delete_own"
on public.cards
for delete
to authenticated
using (user_id = auth.uid() and is_starter = false);

drop policy if exists "card_progress_select_own" on public.card_progress;
drop policy if exists "card_progress_insert_own" on public.card_progress;
drop policy if exists "card_progress_update_own" on public.card_progress;
drop policy if exists "card_progress_delete_own" on public.card_progress;

create policy "card_progress_select_own"
on public.card_progress
for select
to authenticated
using (user_id = auth.uid());

create policy "card_progress_insert_own"
on public.card_progress
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.cards
    where cards.id = card_progress.card_id
      and (cards.is_starter = true or cards.user_id = auth.uid())
  )
);

create policy "card_progress_update_own"
on public.card_progress
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "card_progress_delete_own"
on public.card_progress
for delete
to authenticated
using (user_id = auth.uid());

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

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'card-images',
  'card-images',
  true,
  5242880,
  array[
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "card_images_read_public" on storage.objects;
drop policy if exists "card_images_insert_own" on storage.objects;
drop policy if exists "card_images_update_own" on storage.objects;
drop policy if exists "card_images_delete_own" on storage.objects;

create policy "card_images_read_public"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'card-images');

create policy "card_images_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'card-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "card_images_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'card-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'card-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "card_images_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'card-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
