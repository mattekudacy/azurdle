"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./stats-modal.module.css";
import { CloseIcon } from "./icons";
import { getLocalProgress } from "@/lib/local-progress";

type LeaderboardEntry = {
  userId: string;
  displayName: string;
  cluesRevealed: number;
  elapsedSeconds: number | null;
  totalSolved: number;
};

type StatsData = {
  date: string;
  totalPlayed: number;
  totalSolved: number;
  solveRate: number;
  solveDistribution: Record<number, number>;
  leaderboard: LeaderboardEntry[];
  myCluesRevealed: number | null;
  mySolved: boolean | null;
  todayElapsedSeconds?: number;
};

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; data: StatsData };

type Props = {
  open: boolean;
  onClose: () => void;
};

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function StatsModal({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) { if (!el.open) el.showModal(); }
    else { if (el.open) el.close(); }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handler = () => onClose();
    el.addEventListener("close", handler);
    return () => el.removeEventListener("close", handler);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setState({ status: "loading" });
    fetch("/api/stats")
      .then(async (res) => {
        if (!res.ok) { setState({ status: "error" }); return; }
        const data: StatsData = await res.json();

        // Merge local result for anon users
        if (data.myCluesRevealed === null) {
          const local = getLocalProgress(todayDate());
          if (local?.gameOver) {
            data.myCluesRevealed = local.revealedDuringPlay ?? local.clues.length;
            data.mySolved = local.solved;
          }
        }

        // Today's elapsed time from localStorage
        const local = getLocalProgress(todayDate());
        data.todayElapsedSeconds = local?.gameOver ? local.elapsedSeconds : undefined;

        setState({ status: "ok", data });
      })
      .catch(() => setState({ status: "error" }));
  }, [open]);

  function handleDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      onClose();
    }
  }

  const data = state.status === "ok" ? state.data : null;
  const maxCount = data ? Math.max(1, ...Object.values(data.solveDistribution)) : 1;

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="stats-modal-title"
      onClick={handleDialogClick}
    >
      <div className={styles.header}>
        <h2 id="stats-modal-title" className={styles.title}>Today&apos;s Stats</h2>
        <button type="button" aria-label="Close" className={styles.close} onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      {state.status === "idle" || state.status === "loading" ? (
        <p className={styles.message}>Loading…</p>
      ) : state.status === "error" ? (
        <p className={styles.message}>Couldn&apos;t load stats.</p>
      ) : (
        <>
          {/* Summary numbers */}
          <div className={styles.grid}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{data!.totalPlayed}</span>
              <span className={styles.statLabel}>Players</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{data!.solveRate}%</span>
              <span className={styles.statLabel}>Solved</span>
            </div>
            {data!.todayElapsedSeconds !== undefined && (
              <div className={styles.stat}>
                <span className={styles.statValue}>{formatTime(data!.todayElapsedSeconds)}</span>
                <span className={styles.statLabel}>Your Time</span>
              </div>
            )}
          </div>

          {/* Solve distribution */}
          <div className={styles.distribution}>
            <p className={styles.distributionTitle}>Solve Distribution</p>
            {[1, 2, 3, 4, 5].map((clue) => {
              const count = data!.solveDistribution[clue] ?? 0;
              const widthPct = Math.round((count / maxCount) * 100);
              const isMe = data!.myCluesRevealed === clue && data!.mySolved;
              return (
                <div key={clue} className={styles.barRow}>
                  <span className={styles.barLabel}>Clue {clue}</span>
                  <div className={styles.barTrack} role="img" aria-label={`Clue ${clue}: ${count}`}>
                    <div
                      className={`${styles.barFill} ${isMe ? styles.barFillMe : ""}`}
                      style={{ width: count === 0 ? "4px" : `${widthPct}%` }}
                    />
                  </div>
                  <span className={`${styles.barCount} ${isMe ? styles.barCountMe : ""}`}>
                    {count}{isMe ? " ✓" : ""}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Leaderboard */}
          {data!.leaderboard.length > 0 && (
            <div className={styles.leaderboard}>
              <p className={styles.distributionTitle}>Solvers</p>
              <div className={styles.leaderboardHeader}>
                <span>Player</span>
                <span>Clue</span>
                <span>Time</span>
                <span>Total</span>
              </div>
              <ul className={styles.leaderboardList}>
                {data!.leaderboard.map((entry, i) => (
                  <li key={entry.userId} className={styles.leaderboardRow}>
                    <span className={styles.leaderboardRank}>{i + 1}</span>
                    <span className={styles.leaderboardName}>{entry.displayName}</span>
                    <span className={styles.leaderboardClue}>#{entry.cluesRevealed}</span>
                    <span className={styles.leaderboardTime}>
                      {entry.elapsedSeconds != null ? formatTime(entry.elapsedSeconds) : "—"}
                    </span>
                    <span className={styles.leaderboardTotal}>{entry.totalSolved}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data!.leaderboard.length === 0 && (
            <p className={styles.message}>No one has solved today&apos;s puzzle yet. Be the first!</p>
          )}

        </>
      )}
    </dialog>
  );
}
