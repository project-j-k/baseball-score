import type { Count, Runner } from '../../types/baseball';
import styles from './CountDisplay.module.css';

interface Props {
  count: Count;
  runners: Runner[];
  currentBatterName: string;
  currentPitcherName: string;
  inning: number;
  half: 'top' | 'bottom';
}

export function CountDisplay({ count, runners, currentBatterName, currentPitcherName, inning, half }: Props) {
  const hasRunner = (base: 1 | 2 | 3) => runners.some(r => r.base === base);

  return (
    <div className={styles.wrap}>
      {/* イニング表示 */}
      <div className={styles.inning}>
        <span className={styles.halfArrow}>{half === 'top' ? '▲' : '▼'}</span>
        <span className={styles.inningNum}>{inning}</span>
        <span className={styles.inningLabel}>回</span>
      </div>

      {/* カウント */}
      <div className={styles.counts}>
        <div className={styles.countGroup}>
          <span className={styles.countLabel}>B</span>
          <div className={styles.dots}>
            {[0, 1, 2].map(i => (
              <div key={i} className={`${styles.dot} ${styles.ball} ${i < count.balls ? styles.on : ''}`} />
            ))}
          </div>
        </div>
        <div className={styles.countGroup}>
          <span className={styles.countLabel}>S</span>
          <div className={styles.dots}>
            {[0, 1].map(i => (
              <div key={i} className={`${styles.dot} ${styles.strike} ${i < count.strikes ? styles.on : ''}`} />
            ))}
          </div>
        </div>
        <div className={styles.countGroup}>
          <span className={styles.countLabel}>O</span>
          <div className={styles.dots}>
            {[0, 1].map(i => (
              <div key={i} className={`${styles.dot} ${styles.out} ${i < count.outs ? styles.on : ''}`} />
            ))}
          </div>
        </div>
      </div>

      {/* ダイヤモンド（走者位置） */}
      <div className={styles.diamond}>
        <div className={styles.diamondInner}>
          <div className={styles.base2row}>
            <div className={`${styles.base} ${hasRunner(2) ? styles.occupied : ''}`} />
          </div>
          <div className={styles.base13row}>
            <div className={`${styles.base} ${hasRunner(3) ? styles.occupied : ''}`} />
            <div className={styles.homeBase} />
            <div className={`${styles.base} ${hasRunner(1) ? styles.occupied : ''}`} />
          </div>
        </div>
      </div>

      {/* 打者・投手名 */}
      <div className={styles.players}>
        <div className={styles.playerRow}>
          <span className={styles.playerLabel}>打者</span>
          <span className={styles.playerName}>{currentBatterName}</span>
        </div>
        <div className={styles.playerRow}>
          <span className={styles.playerLabel}>投手</span>
          <span className={styles.playerName}>{currentPitcherName}</span>
        </div>
      </div>
    </div>
  );
}
