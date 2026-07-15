# Azurdle

A daily "Doctordle-style" guessing game for Azure services. See `CLAUDE.md` for the
full design spec, security rules, database schema, and content pipeline.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + GitHub Models values
npm run dev
```

## Commands

```bash
npm run dev               # next dev
npm run build             # production build
npm run test              # vitest — guess normalization, clue gating
npm run lint               # eslint
npm run generate:puzzle   # generate puzzle for today+14, writes to Supabase as queued (no human gate)
npm run validate:content  # schema + duplicate-window checks against Supabase puzzle rows
npm run calibrate         # standalone re-check: difficulty + fact/structure calibration
npm run check:queue       # warn if queued buffer < 7 days or reserves < 5
```

Apply `supabase/migrations/` (in order) to a fresh Supabase project before running
`generate:puzzle`.

## How puzzles get approved

There is no human review step. `npm run generate:puzzle` writes a puzzle straight
into the `puzzles` table as `status = 'queued'` — it's immediately live once its
date arrives. The entire review gate is `passesCalibration()`
(`scripts/lib/calibration.ts`): three model-graded checks (clue-1 difficulty,
clue-1-3 shortlistability, and a fact/structure check covering what a human
reviewer used to verify). A puzzle that fails any of them is discarded and
regenerated, up to 3 attempts, before the run gives up for the day (the 14-day
buffer absorbs the miss).
