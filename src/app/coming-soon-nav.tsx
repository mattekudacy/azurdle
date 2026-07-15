import styles from "./coming-soon-nav.module.css";
import { ArchiveIcon, StatsIcon } from "./icons";

const ITEMS = [
  { label: "Archive", Icon: ArchiveIcon },
  { label: "Stats", Icon: StatsIcon },
];

/** Visual placeholders only — no archive/stats backend exists yet. Disabled
 * and labeled "Soon" rather than wired to fake data. */
export default function ComingSoonNav() {
  return (
    <div className={styles.nav} role="group" aria-label="Coming soon">
      {ITEMS.map(({ label, Icon }) => (
        <button key={label} type="button" disabled className={styles.item} title={`${label}, coming soon`}>
          <Icon />
          <span>{label}</span>
          <span className={styles.badge}>Soon</span>
        </button>
      ))}
    </div>
  );
}
