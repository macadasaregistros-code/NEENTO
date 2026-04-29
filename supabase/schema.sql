create extension if not exists pgcrypto;

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  is_starter boolean not null default false,
  type text not null check (type in ('word', 'phrase')),
  japanese_romaji text not null,
  japanese_kana text,
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
  add column if not exists japanese_kana text;

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
to authenticated
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
