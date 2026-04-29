create extension if not exists pgcrypto;

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
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
  add column if not exists japanese_kana text;

create table if not exists public.card_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
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

create unique index if not exists card_progress_user_card_idx
  on public.card_progress (user_id, card_id)
  where user_id is not null;

create unique index if not exists card_progress_anonymous_card_idx
  on public.card_progress (card_id)
  where user_id is null;

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
