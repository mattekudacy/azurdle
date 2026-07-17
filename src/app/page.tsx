import Image from "next/image";
import styles from "./page.module.css";
import GameBoard from "./game-board";
import HowToPlay from "./how-to-play";
import ComingSoonNav from "./coming-soon-nav";
import AuthButton from "./auth-button";

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.topbarBrand}>
          <Image
            src="/logo/azurdle-icon.png"
            alt=""
            width={22}
            height={14}
            priority
            className={styles.topbarIcon}
          />
          <span className={styles.topbarTitle}>Azurdle</span>
        </div>
        <span className={styles.topbarDivider} aria-hidden="true" />
        <span className={styles.topbarBadge}>Cloudshell: Live</span>
        <div className={styles.topbarRight}>
          <ComingSoonNav />
          <HowToPlay />
          <AuthButton />
        </div>
      </div>
      <main className={styles.main}>
        <GameBoard />
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <span className={styles.footerTitle}>Azurdle</span>
          <span>Elevating Azure knowledge through daily puzzles.</span>
        </div>
        <nav className={styles.footerLinks} aria-label="Footer">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Support</a>
          <a href="#">GitHub ↗</a>
        </nav>
        <span className={styles.copyright}>© 2024 Cloud Labs Inc.</span>
      </footer>
    </div>
  );
}
