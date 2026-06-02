-- Private cards belong to the fixed app persona that owns the account.
-- Older private rows were backfilled to ja_es before app_persona existed,
-- which hides Jju-owned cards from ko_es views.

update public.cards as cards
set
  learning_mode = 'ko_es',
  learning_language = 'es',
  support_language = 'ko'
from public.profiles as profiles
where cards.user_id = profiles.id
  and profiles.app_persona = 'jju'::public.app_persona
  and cards.is_starter = false
  and (
    cards.learning_mode is distinct from 'ko_es'
    or cards.learning_language is distinct from 'es'
    or cards.support_language is distinct from 'ko'
  );

update public.cards as cards
set
  learning_mode = 'ja_es',
  learning_language = 'ja',
  support_language = 'es'
from public.profiles as profiles
where cards.user_id = profiles.id
  and profiles.app_persona = 'daiki'::public.app_persona
  and cards.is_starter = false
  and (
    cards.learning_mode is distinct from 'ja_es'
    or cards.learning_language is distinct from 'ja'
    or cards.support_language is distinct from 'es'
  );
