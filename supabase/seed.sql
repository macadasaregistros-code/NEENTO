insert into public.cards (
  id,
  user_id,
  is_starter,
  type,
  japanese_romaji,
  japanese_kana,
  spanish,
  category
)
values
  ('00000000-0000-4000-8000-000000000001', null, true, 'word', 'mizu', 'みず', 'agua', 'supervivencia'),
  ('00000000-0000-4000-8000-000000000002', null, true, 'word', 'inu', 'いぬ', 'perro', 'animales'),
  ('00000000-0000-4000-8000-000000000003', null, true, 'word', 'neko', 'ねこ', 'gato', 'animales'),
  ('00000000-0000-4000-8000-000000000004', null, true, 'word', 'arigatou', 'ありがとう', 'gracias', 'saludos'),
  ('00000000-0000-4000-8000-000000000005', null, true, 'word', 'sumimasen', 'すみません', 'disculpa / perdón', 'supervivencia'),
  ('00000000-0000-4000-8000-000000000006', null, true, 'word', 'konnichiwa', 'こんにちは', 'hola / buenas tardes', 'saludos'),
  ('00000000-0000-4000-8000-000000000007', null, true, 'word', 'ohayou', 'おはよう', 'buenos días', 'saludos'),
  ('00000000-0000-4000-8000-000000000008', null, true, 'phrase', 'watashi wa David desu', 'わたしはDavidです', 'soy David', 'presentación'),
  ('00000000-0000-4000-8000-000000000009', null, true, 'phrase', 'Colombia kara kimashita', 'Colombiaからきました', 'vengo de Colombia', 'presentación'),
  ('00000000-0000-4000-8000-000000000010', null, true, 'phrase', 'kore wa nan desu ka', 'これはなんですか', '¿qué es esto?', 'preguntas comunes')
on conflict (id) do update set
  user_id = null,
  is_starter = true,
  type = excluded.type,
  japanese_romaji = excluded.japanese_romaji,
  japanese_kana = excluded.japanese_kana,
  spanish = excluded.spanish,
  category = excluded.category;
