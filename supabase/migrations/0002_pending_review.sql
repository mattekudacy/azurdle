-- Adds a `pending_review` status so puzzle generation can write straight to
-- Supabase (never to a git-committed JSON file — puzzle content must never
-- touch git in a repo that may go public; see CLAUDE.md).
--
-- date/number are unaffected: generation still assigns a real target date
-- (today+14) and the next sequential number up front, exactly as before —
-- only now the row starts as 'pending_review' instead of a git file. This
-- keeps approval a single-field edit (pending_review -> queued) in the
-- Supabase table editor, not something requiring the reviewer to compute a
-- date/number by hand.
alter table puzzles drop constraint puzzles_status_check;
alter table puzzles add constraint puzzles_status_check
  check (status in ('pending_review','queued','live','retired','reserve'));

alter table puzzles alter column status set default 'pending_review';

-- Lets check-queue.ts warn when the review backlog is aging, not just when
-- the queued buffer is thin.
alter table puzzles add column created_at timestamptz not null default now();
