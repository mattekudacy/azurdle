"use client";

import { useRef } from "react";
import styles from "./how-to-play.module.css";
import { HelpIcon, CloseIcon } from "./icons";

const LADDER = [
  {
    title: "Broad Problem",
    body: "The first clue describes the kind of workload or business problem the service helps solve.",
  },
  {
    title: "Key Constraint",
    body: "A second detail narrows the field without giving away the exact product name.",
  },
  {
    title: "Architecture Shape",
    body: "The clue shifts into how the service behaves inside an Azure architecture.",
  },
  {
    title: "Service Vocabulary",
    body: "Expect a phrase, capability, or term that points toward a small set of close candidates.",
  },
  {
    title: "Giveaway",
    body: "The final clue should make the answer unmistakable if you know the service.",
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
        <span>Help</span>
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
          Guess the daily Azure service in 5 tries or fewer. Start from the first clue, enter a real
          Azure service, and use each miss to narrow the field.
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
          <p className={styles.rulesTitle}>Rules</p>
          <ul className={styles.rulesList}>
            <li>You get 5 guesses for the daily puzzle.</li>
            <li>Each wrong guess reveals the next clue.</li>
            <li>Autocomplete suggests valid Azure services you can submit.</li>
            <li>The guess log compares your prior guesses against the answer.</li>
            <li>A new puzzle opens every day at midnight UTC.</li>
          </ul>
        </div>
      </dialog>
    </>
  );
}
