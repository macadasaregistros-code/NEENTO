insert into public.cards (id, type, japanese_romaji, spanish, category)
values
  ('00000000-0000-4000-8000-000000000001', 'word', 'mizu', 'agua', 'supervivencia'),
  ('00000000-0000-4000-8000-000000000002', 'word', 'inu', 'perro', 'animales'),
  ('00000000-0000-4000-8000-000000000003', 'word', 'neko', 'gato', 'animales'),
  ('00000000-0000-4000-8000-000000000004', 'word', 'arigatou', 'gracias', 'saludos'),
  ('00000000-0000-4000-8000-000000000005', 'word', 'sumimasen', 'disculpa / perdón', 'supervivencia'),
  ('00000000-0000-4000-8000-000000000006', 'word', 'konnichiwa', 'hola / buenas tardes', 'saludos'),
  ('00000000-0000-4000-8000-000000000007', 'word', 'ohayou', 'buenos días', 'saludos'),
  ('00000000-0000-4000-8000-000000000008', 'phrase', 'watashi wa David desu', 'soy David', 'presentación'),
  ('00000000-0000-4000-8000-000000000009', 'phrase', 'Colombia kara kimashita', 'vengo de Colombia', 'presentación'),
  ('00000000-0000-4000-8000-000000000010', 'phrase', 'kore wa nan desu ka', '¿qué es esto?', 'preguntas comunes')
on conflict (id) do update set
  type = excluded.type,
  japanese_romaji = excluded.japanese_romaji,
  spanish = excluded.spanish,
  category = excluded.category;
