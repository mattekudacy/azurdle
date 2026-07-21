"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./archive-modal.module.css";
import { CloseIcon } from "./icons";

type PuzzleEntry = {
  date: string;
  number: number;
  category: string;
  completion: { solved: boolean; clues_revealed: number } | null;
};

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; puzzles: Map<string, PuzzleEntry>; minYear: number; minMonth: number };

type Props = { open: boolean; onClose: () => void };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function utcToday(): string {
  const d = new Date();
  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    String(d.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export default function ArchiveModal({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "idle" });
  const today = utcToday();
  const todayYear = parseInt(today.slice(0, 4));
  const todayMonthIdx = parseInt(today.slice(5, 7)) - 1;

  const [curYear, setCurYear] = useState(todayYear);
  const [curMonth, setCurMonth] = useState(todayMonthIdx);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) { if (!el.open) el.showModal(); }
    else { if (el.open) el.close(); }
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const h = () => onClose();
    el.addEventListener("close", h);
    return () => el.removeEventListener("close", h);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setState({ status: "loading" });
    fetch("/api/archive")
      .then(async (r) => {
        if (!r.ok) { setState({ status: "error" }); return; }
        const { puzzles }: { puzzles: PuzzleEntry[] } = await r.json();
        const map = new Map(puzzles.map((p) => [p.date, p]));
        const dates = puzzles.map((p) => p.date).sort();
        const earliest = dates[0] ?? today;
        setState({
          status: "ok",
          puzzles: map,
          minYear: parseInt(earliest.slice(0, 4)),
          minMonth: parseInt(earliest.slice(5, 7)) - 1,
        });
      })
      .catch(() => setState({ status: "error" }));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function onBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose();
  }

  const minYear = state.status === "ok" ? state.minYear : todayYear;
  const minMonth = state.status === "ok" ? state.minMonth : todayMonthIdx;
  const canPrev = curYear > minYear || (curYear === minYear && curMonth > minMonth);
  const canNext = curYear < todayYear || (curYear === todayYear && curMonth < todayMonthIdx);

  function goPrev() {
    if (curMonth === 0) { setCurYear((y) => y - 1); setCurMonth(11); }
    else setCurMonth((m) => m - 1);
  }

  function goNext() {
    if (curMonth === 11) { setCurYear((y) => y + 1); setCurMonth(0); }
    else setCurMonth((m) => m + 1);
  }

  const totalDays = new Date(Date.UTC(curYear, curMonth + 1, 0)).getUTCDate();
  const startWeekday = new Date(Date.UTC(curYear, curMonth, 1)).getUTCDay();
  const puzzles = state.status === "ok" ? state.puzzles : null;

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby="archive-title" onClick={onBackdropClick}>
      <div className={styles.header}>
        <h2 id="archive-title" className={styles.title}>Archive</h2>
        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      {(state.status === "idle" || state.status === "loading") && (
        <p className={styles.message}>Loading…</p>
      )}

      {state.status === "error" && (
        <p className={styles.message}>Couldn&apos;t load archive.</p>
      )}

      {state.status === "ok" && (
        <>
          <div className={styles.monthNav}>
            <button type="button" className={styles.navBtn} onClick={goPrev} disabled={!canPrev} aria-label="Previous month">
              ‹
            </button>
            <span className={styles.monthLabel}>{MONTH_NAMES[curMonth]} {curYear}</span>
            <button type="button" className={styles.navBtn} onClick={goNext} disabled={!canNext} aria-label="Next month">
              ›
            </button>
          </div>

          <div className={styles.calGrid}>
            {DAY_NAMES.map((d) => (
              <span key={d} className={styles.weekday}>{d}</span>
            ))}
            {Array.from({ length: startWeekday }, (_, i) => (
              <span key={`pad${i}`} />
            ))}
            {Array.from({ length: totalDays }, (_, i) => {
              const day = i + 1;
              const date = `${curYear}-${String(curMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isPlayable = date <= today;
              const puzzle = puzzles?.get(date);

              if (!puzzle || !isPlayable) {
                return (
                  <span key={date} className={`${styles.cell} ${styles.cellInert}`}>
                    {day}
                  </span>
                );
              }

              const { completion } = puzzle;
              const mod = completion?.solved
                ? styles.cellSolved
                : completion
                  ? styles.cellFailed
                  : styles.cellUnsolved;

              return (
                <button
                  key={date}
                  type="button"
                  className={`${styles.cell} ${mod}`}
                  title={`#${puzzle.number} · ${puzzle.category}`}
                  onClick={() => {
                    onClose();
                    router.push(date === today ? "/" : `/?date=${date}`);
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className={styles.legend}>
            <span className={`${styles.dot} ${styles.dotSolved}`} />
            <span className={styles.legendLabel}>Solved</span>
            <span className={`${styles.dot} ${styles.dotFailed}`} />
            <span className={styles.legendLabel}>Missed</span>
            <span className={`${styles.dot} ${styles.dotUnsolved}`} />
            <span className={styles.legendLabel}>Unsolved</span>
          </div>
        </>
      )}
    </dialog>
  );
}
