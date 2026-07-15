-- Fixes a real bug: reserve puzzles have no calendar slot (src/lib/puzzle-schema.ts
-- has always treated date/number as optional when status='reserve'), but the
-- original schema declared `date` NOT NULL PRIMARY KEY and `number` NOT NULL
-- UNIQUE — so any actual insert of a reserve puzzle crashed with a not-null
-- violation. This went unnoticed because every prior reserve-generation attempt
-- failed calibration before ever reaching the insert step.
--
-- date/number become nullable; a partial unique index still enforces "one row
-- per real date/number" for rows that DO have them (queued/live/retired).
alter table puzzles drop constraint puzzles_pkey;
alter table puzzles drop constraint puzzles_number_key;

alter table puzzles alter column date drop not null;
alter table puzzles alter column number drop not null;

create unique index puzzles_date_key on puzzles (date) where date is not null;
create unique index puzzles_number_key on puzzles (number) where number is not null;
