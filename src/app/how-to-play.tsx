"use client";

import { useRef } from "react";
import styles from "./how-to-play.module.css";
import { HelpIcon, CloseIcon } from "./icons";

const LADDER = [
  {
    title: "The Problem",
    body: "The challenge starts with the broad business problem this service was designed to solve.",
  },
  {
    title: "The Constraint",
    body: "A detail that narrows the field, cutting the list of candidates roughly in half.",
  },
  {
    title: "The Architecture",
    body: "How it behaves in a real system, narrowing things down to a category or a couple of sibling services.",
  },
  {
    title: "The Term of Art",
    body: "Vocabulary that only this service (and maybe one close confuser) uses.",
  },
  {
    title: "The Giveaway",
    body: "An AWS equivalent, an abbreviation, or a fact that points directly at one answer.",
  },
];

export default function HowToPlay() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        aria-label="How to play"
        className={styles.trigger}
        onClick={() => dialogRef.current?.showModal()}
      >
        <HelpIcon />
      </button>
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="how-to-play-title">
        <div className={styles.header}>
          <h2 id="how-to-play-title" className={styles.title}>
            How to Play
          </h2>
          <button
            type="button"
            aria-label="Close"
            className={styles.close}
            onClick={() => dialogRef.current?.close()}
          >
            <CloseIcon />
          </button>
        </div>
        <p className={styles.intro}>
          Identify the daily Azure service by working through a 5-step clue ladder. Every day is a
          new puzzle box.
        </p>
        <ol className={styles.ladder}>
          {LADDER.map((step, i) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.stepNumber}>{i + 1}</span>
              <div>
                <p className={styles.stepTitle}>{step.title}</p>
                <p className={styles.stepBody}>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className={styles.rules}>
          <p className={styles.rulesTitle}>Rules of the box</p>
          <ul className={styles.rulesList}>
            <li>Each wrong guess reveals the next clue.</li>
            <li>You have 5 guesses total. Fewer clues used means a better result.</li>
            <li>A new puzzle box opens every day at midnight UTC.</li>
          </ul>
        </div>
      </dialog>
    </>
  );
}
