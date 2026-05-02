alter table public.cards
  add column if not exists speech_variants text[];
