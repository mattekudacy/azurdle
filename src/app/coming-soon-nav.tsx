import styles from "./coming-soon-nav.module.css";
import { ArchiveIcon } from "./icons";
import StatsButton from "./stats-button";

/** Archive is still a placeholder; Stats is now live. */
export default function ComingSoonNav() {
  return (
    <div className={styles.nav} role="group" aria-label="Navigation">
      <button
        key="Archive"
        type="button"
        disabled
        className={styles.item}
        title="Archive, coming soon"
      >
        <ArchiveIcon />
        <span>Archive</span>
        <span className={styles.badge}>Soon</span>
      </button>
      <StatsButton />
    </div>
  );
}
