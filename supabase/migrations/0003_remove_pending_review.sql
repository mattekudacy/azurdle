-- Removes the human review step. passesCalibration() (difficulty checks +
-- a model-graded fact/structure check) is now the entire review gate;
-- generate-puzzles.ts inserts straight into 'queued'. See CLAUDE.md.
--
-- Any row still sitting in 'pending_review' from the old flow is promoted
-- to 'queued' — it already passed the original calibration checks when
-- generated, it just never had a human flip its status.
update puzzles set status = 'queued' where status = 'pending_review';

alter table puzzles drop constraint puzzles_status_check;
alter table puzzles add constraint puzzles_status_check
  check (status in ('queued','live','retired','reserve'));

alter table puzzles alter column status set default 'queued';
