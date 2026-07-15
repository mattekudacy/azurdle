import styles from "./result-squares.module.css";

const MAX_GUESSES = 5;

type ResultSquaresProps = {
  revealedDuringPlay: number;
  solved: boolean;
};

/** The Wordle/Doctordle-style result row: one square per clue slot, filled in
 * as the round progresses and lighting up amber on the winning clue. Purely
 * decorative — the same result is already announced as text nearby. */
export default function ResultSquares({ revealedDuringPlay, solved }: ResultSquaresProps) {
  return (
    <div className={styles.row} aria-hidden="true">
      {Array.from({ length: MAX_GUESSES }, (_, i) => {
        const isWinSquare = solved && i === revealedDuringPlay - 1;
        const isUsed = i < revealedDuringPlay;
        return (
          <span
            key={i}
            className={[
              styles.square,
              isWinSquare ? styles.squareWin : isUsed ? styles.squareFilled : "",
            ].join(" ")}
            style={{ animationDelay: `${i * 80}ms` }}
          />
        );
      })}
    </div>
  );
}
