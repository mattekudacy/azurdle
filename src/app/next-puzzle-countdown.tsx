"use client";

import { useEffect, useState } from "react";
import styles from "./next-puzzle-countdown.module.css";
import { msUntilNextUtcMidnight } from "@/lib/date";

function format(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/** Ticks down to the next UTC daily rollover. Only ever mounts after a
 * guess is submitted (client-side), never during SSR, so there's no
 * hydration mismatch to guard against. */
export default function NextPuzzleCountdown() {
  const [remainingMs, setRemainingMs] = useState(() => msUntilNextUtcMidnight());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(msUntilNextUtcMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.countdown}>
      <span className={styles.label}>Next puzzle in</span>
      <span className={styles.time}>{format(remainingMs)}</span>
    </div>
  );
}
