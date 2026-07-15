-- Fixes a real bug found in production: migration 0004 dropped puzzles'
-- original primary key (date) to allow reserve rows (null date/number), but
-- never added a replacement. The table has had NO primary key since —
-- reserve rows have nothing uniquely identifying them, which broke
-- serveReservePuzzleForDate()'s promotion UPDATE (it matched on
-- date/number, both null for a reserve row, and `.eq("date", null)` sends
-- the literal string "null" to Postgres, which rejects it for a date
-- column: "invalid input syntax for type date").
--
-- Adds a real id primary key to every row (queued/live/reserve/retired
-- alike), independent of date/number. This is now the only column the app
-- should use to target a specific row for update/delete.
alter table puzzles add column id uuid not null default gen_random_uuid();
alter table puzzles add constraint puzzles_pkey primary key (id);
