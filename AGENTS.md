# AGENTS.md

## Project

Mobile-first Japanese vocabulary spaced repetition app.

## Core rules

- Use romaji for Japanese content and pronunciation support.
- Hiragana and katakana are allowed only in `japaneseKana` fields and Japanese visual UI.
- Do not use kanji in user-facing Japanese content yet.
- The app is focused on practical Japanese communication.
- Prioritize clean, maintainable TypeScript.
- Keep UI mobile-first.
- Host target: Vercel.
- Main stack: Next.js, TypeScript, Tailwind CSS.
- Future backend: Supabase Auth, Supabase Postgres, Supabase Storage.

## SRS rules

Each card has two levels:

- visualLevel
- oralLevel

Rules:

- Visual success: visualLevel +1, max 9.
- Visual fail: visualLevel -2, min 0. If oralLevel > visualLevel, reduce oralLevel to visualLevel.
- Oral success: oralLevel +1, max 9. If oralLevel > visualLevel, raise visualLevel to oralLevel.
- Oral fail: oralLevel -2, min 0. visualLevel remains unchanged.
- Visual recognition and oral production are related but separate skills.
- If the user can produce a word orally, they can also recognize it visually at that level.

## UI rules

- Mobile-first.
- Large cards.
- Swipe gestures.
- Soft shadows.
- Rounded corners.
- Simple navigation.
- Green feedback for success.
- Red feedback for fail.
- Keep the interface clean and not overloaded.

## Architecture

- Put SRS logic in `lib/srs.ts`.
- Put types in `types/card.ts`.
- Keep UI components reusable.
- Avoid putting business logic directly in React components.
- Use mock data first, but keep the code ready for Supabase.
- Supabase writes require an authenticated user.
- Starter cards are global with `is_starter = true`.
- User-created cards must use `user_id = auth.uid()` and `is_starter = false`.
- Keep RLS policies aligned with private user cards and per-user progress.

## Definition of done

- App runs locally.
- TypeScript passes.
- Main MVP screens work.
- SRS logic is testable and separated from UI.
- Project is deployable to Vercel.
