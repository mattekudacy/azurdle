where # Product

## Register

product

## Platform

web

## Users

Cloud/dev-savvy players — Azure engineers, cert-studiers, cloud architects, and anyone comfortable with Azure terminology. They come daily, on a quick break, to test whether they can recognize a real service from an oblique clue before the giveaway. They're not learning Azure here; they already know it and enjoy proving it.

## Product Purpose

A daily, shared-puzzle guessing game (Doctordle/Wordle-style) where a hidden Azure service is revealed through 5 progressively easier clues. Players get 5 guesses; each miss or skip reveals the next clue. Success looks like: someone plays every day, solves in as few clues as possible, and comes back tomorrow for a new one — casually, without needing a streak or a leaderboard to keep them coming back.

## Positioning

The only daily puzzle built specifically for people who actually know Azure — clues are calibrated so genuine expertise gives a real (not guaranteed) edge on clue 1.

## Brand Personality

Playful, warm, curious. Bright and celebratory in its feedback (a satisfying, colorful "yes!" on a correct guess) without being loud or gimmicky the rest of the time — the puzzle itself, not the chrome around it, carries the personality.

## Anti-references

No strong anti-reference named. Default guardrails apply: avoid the generic AI-SaaS look (gradient hero metrics, identical card grids, cream/sand neutral defaults) and avoid a literal "corporate Azure portal" look (Microsoft-blue boxes, cloud-computing stock-photo aesthetic) even though it isn't the named anti-reference — the game's own identity should carry it instead.

## Design Principles

- Expertise is the reward, not the tutorial. Never over-explain Azure terms; trust the audience.
- One satisfying moment per guess. The result (right/wrong/next clue) is the emotional beat of the whole interface — invest craft there before anything decorative.
- Low-stakes, not competitive theater. No streak pressure, no leaderboard anxiety — the tone stays curious and unhurried even when the mechanic (limited guesses) is inherently a countdown.
- The clue ladder is the plot. Each revealed clue is a small narrative beat (broad → specific); the UI should make that progression legible and rewarding to read back.

## Accessibility & Inclusion

Fully playable by keyboard; clue reveals announced via `aria-live` (already a stated requirement in this project's CLAUDE.md). No explicit WCAG level requested — default to WCAG 2.1 AA contrast and interaction targets.
