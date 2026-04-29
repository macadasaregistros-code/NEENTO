insert into public.cards (id, type, japanese_romaji, japanese_kana, spanish, category)
values
  ('00000000-0000-4000-8000-000000000001', 'word', 'mizu', 'みず', 'agua', 'supervivencia'),
  ('00000000-0000-4000-8000-000000000002', 'word', 'inu', 'いぬ', 'perro', 'animales'),
  ('00000000-0000-4000-8000-000000000003', 'word', 'neko', 'ねこ', 'gato', 'animales'),
  ('00000000-0000-4000-8000-000000000004', 'word', 'arigatou', 'ありがとう', 'gracias', 'saludos'),
  ('00000000-0000-4000-8000-000000000005', 'word', 'sumimasen', 'すみません', 'disculpa / perdón', 'supervivencia'),
  ('00000000-0000-4000-8000-000000000006', 'word', 'konnichiwa', 'こんにちは', 'hola / buenas tardes', 'saludos'),
  ('00000000-0000-4000-8000-000000000007', 'word', 'ohayou', 'おはよう', 'buenos días', 'saludos'),
  ('00000000-0000-4000-8000-000000000008', 'phrase', 'watashi wa David desu', 'わたしはDavidです', 'soy David', 'presentación'),
  ('00000000-0000-4000-8000-000000000009', 'phrase', 'Colombia kara kimashita', 'Colombiaからきました', 'vengo de Colombia', 'presentación'),
  ('00000000-0000-4000-8000-000000000010', 'phrase', 'kore wa nan desu ka', 'これはなんですか', '¿qué es esto?', 'preguntas comunes')
on conflict (id) do update set
  type = excluded.type,
  japanese_romaji = excluded.japanese_romaji,
  japanese_kana = excluded.japanese_kana,
  spanish = excluded.spanish,
  category = excluded.category;
