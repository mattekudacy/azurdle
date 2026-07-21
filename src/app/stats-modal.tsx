"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./stats-modal.module.css";
import { CloseIcon } from "./icons";
import { getLocalProgress } from "@/lib/local-progress";

type AllTimeEntry = {
  userId: string;
  displayName: string;
  totalSolved: number;
  avgClues: number;
};

type MyStats = {
  totalSolved: number;
  currentStreak: number;
  bestStreak: number;
  avgClues: number;
  solveDistribution: Record<number, number>;
};

type StatsData = {
  allTimeLeaderboard: AllTimeEntry[];
  myStats: MyStats | null;
};

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; data: StatsData };

type Props = {
  open: boolean;
  onClose: () => void;
  myUserId?: string | null;
};

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function StatsModal({ open, onClose, myUserId }: Props) {
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

        // Merge local solve distribution for guests
        if (!data.myStats) {
          const local = getLocalProgress(todayDate());
          if (local?.gameOver && local.solved) {
            const clue = local.revealedDuringPlay ?? local.clues.length;
            data.myStats = {
              totalSolved: 1,
              currentStreak: 1,
              bestStreak: 1,
              avgClues: clue,
              solveDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, [clue]: 1 },
            };
          }
        }

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
  const my = data?.myStats ?? null;
  const maxCount = my ? Math.max(1, ...Object.values(my.solveDistribution)) : 1;

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="stats-modal-title"
      onClick={handleDialogClick}
    >
      <div className={styles.header}>
        <h2 id="stats-modal-title" className={styles.title}>Your Stats</h2>
        <button type="button" aria-label="Close" className={styles.close} onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      {(state.status === "idle" || state.status === "loading") && (
        <p className={styles.message}>Loading…</p>
      )}
      {state.status === "error" && (
        <p className={styles.message}>Couldn&apos;t load stats.</p>
      )}

      {state.status === "ok" && (
        <>
          {my ? (
            <>
              {/* Personal numbers */}
              <div className={styles.grid}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{my.totalSolved}</span>
                  <span className={styles.statLabel}>Solved</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{my.currentStreak}</span>
                  <span className={styles.statLabel}>Streak</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{my.bestStreak}</span>
                  <span className={styles.statLabel}>Best Streak</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{my.avgClues}</span>
                  <span className={styles.statLabel}>Avg Clues</span>
                </div>
              </div>

              {/* Personal solve distribution */}
              <div className={styles.distribution}>
                <p className={styles.distributionTitle}>Your Solve Distribution</p>
                {[1, 2, 3, 4, 5].map((clue) => {
                  const count = my.solveDistribution[clue] ?? 0;
                  const widthPct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={clue} className={styles.barRow}>
                      <span className={styles.barLabel}>Clue {clue}</span>
                      <div className={styles.barTrack} role="img" aria-label={`Clue ${clue}: ${count}`}>
                        <div
                          className={styles.barFill}
                          style={{ width: count === 0 ? "4px" : `${widthPct}%` }}
                        />
                      </div>
                      <span className={styles.barCount}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className={styles.message}>Sign in to track your personal stats.</p>
          )}

          {/* All-time leaderboard */}
          {data!.allTimeLeaderboard.length > 0 && (
            <div className={styles.leaderboard}>
              <p className={styles.distributionTitle}>All-Time Leaderboard</p>
              <div className={styles.leaderboardHeader}>
                <span>Player</span>
                <span>Solved</span>
                <span>Avg Clue</span>
              </div>
              <ul className={styles.leaderboardList}>
                {data!.allTimeLeaderboard.map((entry, i) => {
                  const isMe = myUserId && entry.userId === myUserId;
                  return (
                    <li
                      key={entry.userId}
                      className={`${styles.leaderboardRow} ${isMe ? styles.leaderboardRowMe : ""}`}
                    >
                      <span className={styles.leaderboardRank}>{i + 1}</span>
                      <span className={styles.leaderboardName}>{entry.displayName}</span>
                      <span className={styles.leaderboardClue}>{entry.totalSolved}</span>
                      <span className={styles.leaderboardTime}>{entry.avgClues}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </dialog>
  );
}
