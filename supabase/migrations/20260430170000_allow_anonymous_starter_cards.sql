drop policy if exists "cards_select_starter_or_own" on public.cards;

create policy "cards_select_starter_or_own"
on public.cards
for select
to anon, authenticated
using (
  is_starter = true
  or user_id = auth.uid()
);
