"use client";

import styles from "./attribute-grid.module.css";
import type { AttributeComparison } from "@/lib/attribute-comparison";

type Props = {
  comparison: AttributeComparison;
};

type Column = {
  header: string;
  value: string;
  match: "exact" | "none" | "higher" | "lower";
  mono?: boolean;
};

type Tone = "hit" | "close" | "miss";

function tone(match: "exact" | "none" | "higher" | "lower"): Tone {
  if (match === "exact") return "hit";
  if (match === "higher" || match === "lower") return "close";
  return "miss";
}

function cellStyles(t: Tone) {
  if (t === "hit")   return { background: "var(--attr-hit)",   borderColor: "var(--attr-hit)" };
  if (t === "close") return { background: "var(--attr-close)", borderColor: "var(--attr-close)" };
  return { background: "var(--attr-miss)", borderColor: "var(--attr-miss)" };
}

function textStyles(t: Tone) {
  if (t === "hit")   return { color: "var(--attr-hit-ink)" };
  if (t === "close") return { color: "var(--attr-close-ink)" };
  return { color: "var(--attr-miss-ink)" };
}

function headerStyles(t: Tone) {
  const base = textStyles(t);
  return { ...base, opacity: t === "hit" ? 0.85 : t === "close" ? 0.75 : 0.75 };
}

function truncate(s: string, max = 14): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export default function AttributeGrid({ comparison }: Props) {
  const columns: Column[] = [
    { header: "Category",   value: comparison.category.value,     match: comparison.category.match },
    { header: "Year",       value: String(comparison.launchYear.value), match: comparison.launchYear.match, mono: true },
    { header: "Compute",    value: comparison.computeModel.value,  match: comparison.computeModel.match },
    { header: "Pricing",    value: comparison.pricingModel.value,  match: comparison.pricingModel.match },
  ];

  return (
    <div className={styles.grid} aria-label="Attribute comparison">
      {columns.map((col) => {
        const t = tone(col.match);
        return (
          <div key={col.header} className={styles.cell} style={cellStyles(t)} title={col.value}>
            <span className={styles.header} style={headerStyles(t)}>{col.header}</span>
            <div className={styles.valueRow}>
              <span className={`${styles.value} ${col.mono ? styles.valueYear : ""}`} style={textStyles(t)}>
                {truncate(col.value)}
              </span>
              {col.match === "higher" && <span className={styles.arrow} style={textStyles(t)} aria-label="answer is newer">↑</span>}
              {col.match === "lower"  && <span className={styles.arrow} style={textStyles(t)} aria-label="answer is older">↓</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
