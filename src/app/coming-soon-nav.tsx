import styles from "./coming-soon-nav.module.css";
import ArchiveButton from "./archive-button";
import StatsButton from "./stats-button";

export default function ComingSoonNav() {
  return (
    <div className={styles.nav} role="group" aria-label="Navigation">
      <ArchiveButton />
      <StatsButton />
    </div>
  );
}
