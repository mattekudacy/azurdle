"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./game-board.module.css";
import AutocompleteInput from "./autocomplete-input";
import NextPuzzleCountdown from "./next-puzzle-countdown";
import ResultSquares from "./result-squares";
import { CloseIcon, HistoryIcon } from "./icons";
import { getLocalProgress, saveLocalProgress, type LocalProgress } from "@/lib/local-progress";
import { normalizeGuess } from "@/lib/guess";
import type { AttributeComparison } from "@/lib/attribute-comparison";
import AttributeGrid from "./attribute-grid";

const MAX_GUESSES = 5;

// navigator.clipboard requires a secure context (HTTPS). On HTTP or older
// browsers, fall back to a temporary textarea + execCommand.
function fallbackCopy(text: string, onDone: () => void) {
  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "fixed";
  el.style.top = "-9999px";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.focus();
  el.select();
  try {
    document.execCommand("copy");
    onDone();
  } finally {
    document.body.removeChild(el);
  }
}

function buildShareText(puzzleNumber: number, revealedDuringPlay: number, solved: boolean): string {
  const squares = Array.from({ length: 5 }, (_, i) => {
    if (solved && i === revealedDuringPlay - 1) return "🟩";
    if (i < revealedDuringPlay) return "🟦";
    return "⬜";
  });
  return `Azurdle #${puzzleNumber} ${squares.join("")}`;
}

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
  attributeComparison?: AttributeComparison;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function GameBoard() {
  const [puzzle, setPuzzle] = useState<TodayPuzzle | null>(null);
  const [progress, setProgress] = useState<LocalProgress | null>(null);
  const [guessInput, setGuessInput] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  // Index of the clue that just arrived because of a miss — drives a
  // one-time highlight on that clue only, distinct from the fade-in every
  // clue gets on mount. Cleared after the highlight animation finishes.
  const [missRevealIndex, setMissRevealIndex] = useState<number | null>(null);
  const inputRowRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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

  function handleShare() {
    if (!puzzle || !progress) return;
    const rdp = progress.revealedDuringPlay ?? progress.clues.length;
    const text = buildShareText(puzzle.number, rdp, progress.solved);

    function onCopied() {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(onCopied).catch(() => fallbackCopy(text, onCopied));
    } else {
      fallbackCopy(text, onCopied);
    }
  }

  // Sync elapsed time from progress on load, then tick while in play
  useEffect(() => {
    if (!progress) return;
    if (progress.gameOver) {
      setElapsed(progress.elapsedSeconds ?? 0);
      return;
    }
    if (!progress.startedAt) return; // no guesses yet — timer hasn't started

    const tick = () => {
      const secs = Math.floor((Date.now() - new Date(progress.startedAt!).getTime()) / 1000);
      setElapsed(secs);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [progress]);

  // Dev-only: ?reset clears today's local progress + the HttpOnly anon cookie
  // so you can replay the same puzzle without touching DevTools. No-op in prod.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("reset")) return;
    // Remove the param immediately so a reload doesn't re-reset
    const url = new URL(window.location.href);
    url.searchParams.delete("reset");
    window.history.replaceState({}, "", url.toString());
    // Wipe localStorage
    localStorage.removeItem("azurdle.v1");
    // Clear the HttpOnly cookie via the server route
    fetch("/api/dev-reset", { method: "POST" }).finally(() => {
      setRetryCount((n) => n + 1);
    });
  }, []);

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
    if (progress.guesses.some((prior) => normalizeGuess(prior.name) === normalizeGuess(guess))) {
      setStatusMessage("You've already tried that one. Pick another service.");
      shakeInputRow();
      return;
    }

    setSubmitting(true);
    setStatusMessage("");

    try {
      const startedAt = progress.startedAt ?? new Date().toISOString();
      const currentElapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);

      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: puzzle.date,
          guess,
          elapsedSeconds: currentElapsed,
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

      const elapsedSeconds = data.gameOver ? currentElapsed : undefined;

      const updated: LocalProgress = {
        ...progress,
        guesses: [...progress.guesses, { name: guess, comparison: data.attributeComparison }],
        clues: data.allClues ?? (data.nextClue ? [...progress.clues, data.nextClue] : progress.clues),
        revealedDuringPlay: cluesRevealedDuringPlay,
        solved: data.correct,
        gameOver: data.gameOver,
        answer: data.answer,
        completedAt: data.gameOver ? new Date().toISOString() : null,
        startedAt,
        elapsedSeconds: data.gameOver ? currentElapsed : undefined,
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
        if (data.nextClue) {
          const newClueIndex = cluesRevealedDuringPlay - 1;
          setMissRevealIndex(newClueIndex);
          // Matches the missHighlight animation's duration in
          // game-board.module.css — clears the flag once it's done so a
          // later miss can retrigger the same highlight on a new clue.
          setTimeout(() => setMissRevealIndex(null), 900);
          // The scroll area, not the page, holds the clue list now — bring
          // the newly-revealed clue into view there instead of scrolling
          // the window (which wouldn't move now that the guess bar is
          // pinned and the clues scroll internally).
          requestAnimationFrame(() => {
            scrollAreaRef.current
              ?.querySelector(`[data-clue-index="${newClueIndex}"]`)
              ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          });
        }
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
        {(progress.startedAt || progress.gameOver) && (
          <span className={styles.timer}>{formatTime(elapsed)}</span>
        )}
      </p>

      <div className={styles.columns}>
        <div className={styles.leftCol}>
          <div ref={scrollAreaRef} className={styles.clueScroll}>
            <ol className={styles.clueList} aria-live="polite">
              {progress.clues.map((clue, i) => {
                const isBonusContext = progress.gameOver && i >= revealedDuringPlay;
                const isMissReveal = i === missRevealIndex;
                return (
                  <li
                    key={i}
                    data-clue-index={i}
                    className={`${styles.clue} ${isBonusContext ? styles.clueBonus : ""} ${
                      isMissReveal ? styles.clueMissReveal : ""
                    }`}
                  >
                    <span className={`${styles.clueNumber} ${isBonusContext ? styles.clueNumberBonus : ""}`}>
                      {i + 1}
                    </span>
                    {clue}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className={styles.guessBar}>
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
                    priorGuesses={progress.guesses.map((g) => g.name)}
                    disabled={submitting}
                    className={styles.input}
                    openUpward
                  />
                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      !guessInput.trim() ||
                      progress.guesses.some((prior) => normalizeGuess(prior.name) === normalizeGuess(guessInput))
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
                <button
                  type="button"
                  onClick={handleShare}
                  className={`${styles.shareButton} ${copied ? styles.shareButtonCopied : ""}`}
                >
                  {copied ? "Copied!" : "Share"}
                </button>
              </>
            )}

            {progress.gameOver && <NextPuzzleCountdown />}

            {!progress.gameOver && (
              <p role="status" aria-live="polite" className={styles.statusMessage}>
                {statusMessage}
              </p>
            )}
          </div>
        </div>

        <div className={styles.rightCol}>
          {progress.guesses.length > 0 || progress.gameOver ? (
            <section className={styles.cloudLog}>
              <div className={styles.cloudLogLabel}>
                <HistoryIcon />
                <span>Cloud Log</span>
                {!progress.gameOver && <span className={styles.liveFeed}>LIVE FEED</span>}
              </div>
              <ul className={styles.guessList}>
                {progress.guesses.map((g, i) =>
                  g.comparison ? (
                    <li key={i} className={styles.guessItemWithGrid}>
                      <div className={styles.guessItemPill}>
                        {!(progress.solved && i === progress.guesses.length - 1) && (
                          <CloseIcon className={styles.guessItemIcon} />
                        )}
                        {g.name}
                      </div>
                      <AttributeGrid comparison={g.comparison} />
                    </li>
                  ) : (
                    <li key={i} className={styles.guessItem}>
                      {!(progress.solved && i === progress.guesses.length - 1) && (
                        <CloseIcon className={styles.guessItemIcon} />
                      )}
                      {g.name}
                    </li>
                  ),
                )}
              </ul>
            </section>
          ) : (
            <p className={styles.logEmpty}>Your guesses will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
