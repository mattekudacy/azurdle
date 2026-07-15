import Image from "next/image";
import styles from "./page.module.css";
import GameBoard from "./game-board";
import HowToPlay from "./how-to-play";
import ComingSoonNav from "./coming-soon-nav";

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
      </div>
      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.intro}>
            <div className={styles.wordmark}>
              <Image
                src="/logo/azurdle-icon.png"
                alt=""
                width={40}
                height={26}
                priority
                className={styles.wordmarkIcon}
              />
              <h1>Azurdle</h1>
            </div>
            <p>Guess today&apos;s Azure service in 5 clues.</p>
          </div>
          <HowToPlay />
        </div>
        <ComingSoonNav />
        <GameBoard />
      </main>
    </div>
  );
}
