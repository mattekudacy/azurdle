-- server-only: RLS enabled, no policies for anon/authenticated
create table puzzles (
  date         date primary key,
  number       int unique not null,
  answer       text not null,
  aliases      text[] not null default '{}',
  clues        jsonb not null,            -- array of exactly 5 strings
  category     text not null,
  difficulty   text not null check (difficulty in ('easy','medium','hard')),
  status       text not null default 'queued' check (status in ('queued','live','retired','reserve'))
);

alter table puzzles enable row level security;
-- Intentionally no policies: anon and authenticated roles get zero access.
-- Only the service-role key (server-only) can read/write this table.

-- client-accessible under RLS: user_id = auth.uid()
create table attempts (
  user_id        uuid references auth.users not null,
  puzzle_date    date not null,
  guesses        jsonb not null default '[]',
  clues_revealed int not null default 1,
  solved         boolean not null default false,
  completed_at   timestamptz,
  primary key (user_id, puzzle_date)
);

alter table attempts enable row level security;

create policy "Users can view their own attempts"
  on attempts for select
  using (user_id = auth.uid());

create policy "Users can insert their own attempts"
  on attempts for insert
  with check (user_id = auth.uid());

create policy "Users can update their own attempts"
  on attempts for update
  using (user_id = auth.uid());
