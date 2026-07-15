"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./game-board.module.css";
import AutocompleteInput from "./autocomplete-input";
import NextPuzzleCountdown from "./next-puzzle-countdown";
import ResultSquares from "./result-squares";
import { CloseIcon, HistoryIcon } from "./icons";
import { getLocalProgress, saveLocalProgress, type LocalProgress } from "@/lib/local-progress";
import { normalizeGuess } from "@/lib/guess";

const MAX_GUESSES = 5;

// The API returns stable, machine-readable error codes; translate them into
// brand-voice copy here rather than showing the raw string to a player.
const ERROR_MESSAGES: Record<string, string> = {
  "rate limited": "You're guessing a bit fast. Give it a second and try again.",
  "invalid request body": "That guess didn't go through. Try again?",
  "puzzle not available yet": "Tomorrow's puzzle isn't open yet. Check back after midnight UTC.",
  "puzzle not found": "Couldn't find today's puzzle. Try refreshing.",
  "puzzle already solved": "You've already got this one. Check back tomorrow.",
};

function friendlyError(code: string | undefined): string {
  if (!code) return "Something went wrong. Try again.";
  return ERROR_MESSAGES[code] ?? "Something went wrong. Try again.";
}

type TodayPuzzle = {
  date: string;
  number: number;
  category: string;
  clues: string[];
};

type GuessResponse = {
  correct: boolean;
  gameOver: boolean;
  nextClue?: string;
  answer?: string;
  allClues?: string[];
  error?: string;
};

export default function GameBoard() {
  const [puzzle, setPuzzle] = useState<TodayPuzzle | null>(null);
  const [progress, setProgress] = useState<LocalProgress | null>(null);
  const [guessInput, setGuessInput] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const inputRowRef = useRef<HTMLDivElement>(null);

  // Retriggers the shake CSS animation on a rejected guess without
  // remounting the row (which would drop focus from the input/button).
  function shakeInputRow() {
    const el = inputRowRef.current;
    if (!el) return;
    el.classList.remove(styles.inputRowShake);
    // Forces a reflow so the browser registers the class removal before
    // it's re-added, otherwise the animation silently won't restart.
    void el.offsetWidth;
    el.classList.add(styles.inputRowShake);
    el.addEventListener(
      "animationend",
      () => el.classList.remove(styles.inputRowShake),
      { once: true },
    );
  }

  useEffect(() => {
    fetch("/api/puzzle/today")
      .then((res) => {
        if (!res.ok) throw new Error("failed to load today's puzzle");
        return res.json() as Promise<TodayPuzzle>;
      })
      .then((data) => {
        setPuzzle(data);
        const local = getLocalProgress(data.date);
        setProgress(
          local ?? {
            puzzleDate: data.date,
            guesses: [],
            clues: data.clues,
            solved: false,
            gameOver: false,
            answer: undefined,
            completedAt: null,
          },
        );
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [retryCount]);

  async function submitGuess(guessValue: string) {
    const guess = guessValue.trim();
    if (!puzzle || !progress || progress.gameOver || !guess) return;
    if (progress.guesses.some((prior) => normalizeGuess(prior) === normalizeGuess(guess))) {
      setStatusMessage("You've already tried that one. Pick another service.");
      shakeInputRow();
      return;
    }

    setSubmitting(true);
    setStatusMessage("");

    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: puzzle.date,
          guess,
          priorGuesses: progress.guesses,
        }),
      });
      const data: GuessResponse = await res.json();

      if (!res.ok) {
        setStatusMessage(friendlyError(data.error));
        return;
      }

      const cluesRevealedDuringPlay = data.nextClue
        ? progress.clues.length + 1
        : progress.clues.length;

      const updated: LocalProgress = {
        ...progress,
        guesses: [...progress.guesses, guess],
        clues: data.allClues ?? (data.nextClue ? [...progress.clues, data.nextClue] : progress.clues),
        revealedDuringPlay: cluesRevealedDuringPlay,
        solved: data.correct,
        gameOver: data.gameOver,
        answer: data.answer,
        completedAt: data.gameOver ? new Date().toISOString() : null,
      };

      setProgress(updated);
      saveLocalProgress(updated);
      setGuessInput("");

      // The result banner (rendered once progress.gameOver is true) is the
      // only feedback shown for a correct guess or a loss; this status line
      // only ever displays while the round is still in progress.
      if (!data.gameOver) {
        setStatusMessage("Not quite. Here's another clue.");
        shakeInputRow();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <div className={styles.board} aria-busy="true" aria-label="Loading today's puzzle">
        <div className={`${styles.skeletonLine} ${styles.skeletonMeta}`} />
        <div className={styles.skeletonClue} />
        <div className={styles.skeletonClue} />
      </div>
    );
  }

  if (status === "error" || !puzzle || !progress) {
    return (
      <div className={styles.errorState} role="alert">
        <p>Couldn&apos;t load today&apos;s puzzle.</p>
        <button
          type="button"
          className={styles.retryButton}
          onClick={() => {
            setStatus("loading");
            setRetryCount((n) => n + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  const guessesLeft = MAX_GUESSES - progress.guesses.length;
  const revealedDuringPlay = progress.revealedDuringPlay ?? progress.clues.length;

  return (
    <div className={styles.board}>
      <p className={styles.meta}>
        Azurdle #{puzzle.number}
        {progress.gameOver && ` · ${puzzle.category}`}
      </p>

      {progress.guesses.length > 0 && (
        <section className={styles.cloudLog}>
          <div className={styles.cloudLogLabel}>
            <HistoryIcon />
            <span>Cloud Log</span>
          </div>
          <ul className={styles.guessList}>
            {progress.guesses.map((guess, i) => (
              <li key={i} className={styles.guessItem}>
                {!(progress.solved && i === progress.guesses.length - 1) && (
                  <CloseIcon className={styles.guessItemIcon} />
                )}
                {guess}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ol className={styles.clueList} aria-live="polite">
        {progress.clues.map((clue, i) => {
          const isBonusContext = progress.gameOver && i >= revealedDuringPlay;
          return (
            <li
              key={i}
              className={`${styles.clue} ${isBonusContext ? styles.clueBonus : ""}`}
            >
              <span className={`${styles.clueNumber} ${isBonusContext ? styles.clueNumberBonus : ""}`}>
                {i + 1}
              </span>
              {clue}
            </li>
          );
        })}
      </ol>

      {!progress.gameOver ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitGuess(guessInput);
          }}
          className={styles.form}
        >
          <label htmlFor="guess" className={styles.label}>
            Guess the Azure service ({guessesLeft} guess{guessesLeft === 1 ? "" : "es"} left)
          </label>
          <div ref={inputRowRef} className={styles.inputRow}>
            <AutocompleteInput
              id="guess"
              value={guessInput}
              onChange={setGuessInput}
              onSubmitValue={submitGuess}
              priorGuesses={progress.guesses}
              disabled={submitting}
              className={styles.input}
            />
            <button
              type="submit"
              disabled={
                submitting ||
                !guessInput.trim() ||
                progress.guesses.some((prior) => normalizeGuess(prior) === normalizeGuess(guessInput))
              }
              className={styles.button}
            >
              Guess
            </button>
          </div>
        </form>
      ) : (
        <>
          <ResultSquares revealedDuringPlay={revealedDuringPlay} solved={progress.solved} />
          <p
            role="status"
            aria-live="polite"
            className={`${styles.resultBanner} ${
              progress.solved ? styles.resultBannerWin : styles.resultBannerLoss
            }`}
          >
            {progress.solved
              ? `Solved on clue ${revealedDuringPlay}! The answer was ${progress.answer}.`
              : `Out of guesses. The answer was ${progress.answer}.`}
          </p>
        </>
      )}

      {progress.gameOver && <NextPuzzleCountdown />}

      {!progress.gameOver && (
        <p role="status" aria-live="polite" className={styles.statusMessage}>
          {statusMessage}
        </p>
      )}
    </div>
  );
}
