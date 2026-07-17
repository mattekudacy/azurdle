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
        <Image
          src="/logo/azurdle-icon.png"
          alt=""
          width={22}
          height={14}
          priority
          className={styles.topbarIcon}
        />
        <span className={styles.topbarTitle}>Azurdle</span>
        <span className={styles.topbarBadge}>Cloudshell: Live</span>
      </div>
      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.wordmark}>
            <Image
              src="/logo/azurdle-icon.png"
              alt=""
              width={24}
              height={16}
              priority
              className={styles.wordmarkIcon}
            />
            <span className={styles.wordmarkTitle}>Azurdle</span>
            <span className={styles.wordmarkSub}>Guess today&apos;s Azure service in 5 clues</span>
          </div>
          <div className={styles.headerRight}>
            <ComingSoonNav />
            <HowToPlay />
            <AuthButton />
          </div>
        </div>
        <GameBoard />
      </main>
    </div>
  );
}
