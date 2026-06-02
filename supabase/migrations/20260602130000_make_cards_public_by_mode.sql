-- Cards are global vocabulary by learning mode. Progress remains per user.
-- Existing custom cards are assigned to the mode implied by the fixed owner,
-- then detached from that owner so both app users see the same vocabulary.

update public.cards as cards
set
  learning_mode = case profiles.app_persona
    when 'jju'::public.app_persona then 'ko_es'
    else 'ja_es'
  end,
  learning_language = case profiles.app_persona
    when 'jju'::public.app_persona then 'es'
    else 'ja'
  end,
  support_language = case profiles.app_persona
    when 'jju'::public.app_persona then 'ko'
    else 'es'
  end
from public.profiles as profiles
where cards.user_id = profiles.id
  and cards.is_starter = false
  and profiles.app_persona in ('daiki'::public.app_persona, 'jju'::public.app_persona);

update public.cards
set
  learning_language = case learning_mode
    when 'ko_es' then 'es'
    else 'ja'
  end,
  support_language = case learning_mode
    when 'ko_es' then 'ko'
    else 'es'
  end,
  user_id = null
where is_starter = false;

create or replace function public.normalize_public_card_owner()
returns trigger
language plpgsql
as $$
begin
  if new.is_starter = false then
    new.user_id = null;
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_public_card_owner on public.cards;

create trigger normalize_public_card_owner
before insert or update on public.cards
for each row
execute function public.normalize_public_card_owner();

drop policy if exists "cards_select_starter_or_own" on public.cards;
drop policy if exists "cards_select_starter_or_app_users" on public.cards;
drop policy if exists "cards_select_public" on public.cards;

create policy "cards_select_public"
on public.cards
for select
to anon, authenticated
using (true);

drop policy if exists "cards_insert_own" on public.cards;
drop policy if exists "cards_update_own" on public.cards;
drop policy if exists "cards_delete_own" on public.cards;
drop policy if exists "cards_insert_public_app_cards" on public.cards;
drop policy if exists "cards_update_public_app_cards" on public.cards;

create policy "cards_insert_public_app_cards"
on public.cards
for insert
to authenticated
with check (
  public.current_app_persona() is not null
  and user_id is null
  and is_starter = false
  and learning_mode in ('ja_es', 'ko_es')
);

create policy "cards_update_public_app_cards"
on public.cards
for update
to authenticated
using (
  public.current_app_persona() is not null
  and is_starter = false
)
with check (
  public.current_app_persona() is not null
  and user_id is null
  and is_starter = false
  and learning_mode in ('ja_es', 'ko_es')
);

drop policy if exists "card_progress_insert_own" on public.card_progress;

create policy "card_progress_insert_own"
on public.card_progress
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.current_app_persona() is not null
  and exists (
    select 1
    from public.cards
    where cards.id = card_progress.card_id
  )
);
