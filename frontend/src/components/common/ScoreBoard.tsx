import type { GameState } from '../../types/baseball';
import styles from './ScoreBoard.module.css';

interface Props {
  game: GameState;
}

export function ScoreBoard({ game }: Props) {
  const { homeTeam, visitorTeam, score, currentInning, currentHalf, config } = game;

  const inningCells = Array.from({ length: config.maxInnings }, (_, i) => i + 1);

  const getInningScore = (side: 'home' | 'visitor', inning: number) => {
    const half = game.innings.find(h => h.inning === inning && h.half === (side === 'visitor' ? 'top' : 'bottom'));
    if (!half) return '';
    if (!half.completed && inning === currentInning) return '-';
    return String(half.runs);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.table}>
        {/* ヘッダー行 */}
        <div className={styles.row}>
          <div className={styles.teamCell}></div>
          {inningCells.map(i => (
            <div key={i} className={`${styles.cell} ${i === currentInning ? styles.current : ''}`}>{i}</div>
          ))}
          <div className={styles.total}>R</div>
          <div className={styles.total}>H</div>
          <div className={styles.total}>E</div>
        </div>

        {/* ビジター */}
        <div className={styles.row}>
          <div className={styles.teamCell}>
            <span className={styles.teamName}>{visitorTeam.name || '相手チーム'}</span>
            {currentHalf === 'top' && <span className={styles.batMark}>▶</span>}
          </div>
          {inningCells.map(i => (
            <div key={i} className={`${styles.cell} ${i === currentInning && currentHalf === 'top' ? styles.current : ''}`}>
              {getInningScore('visitor', i)}
            </div>
          ))}
          <div className={styles.total}>{score.visitor}</div>
          <div className={styles.total}>{game.innings.filter(h => h.half === 'top').reduce((s, h) => s + h.hits, 0)}</div>
          <div className={styles.total}>{game.innings.filter(h => h.half === 'top').reduce((s, h) => s + h.errors, 0)}</div>
        </div>

        {/* ホーム */}
        <div className={styles.row}>
          <div className={styles.teamCell}>
            <span className={styles.teamName}>{homeTeam.name || 'ホームチーム'}</span>
            {currentHalf === 'bottom' && <span className={styles.batMark}>▶</span>}
          </div>
          {inningCells.map(i => (
            <div key={i} className={`${styles.cell} ${i === currentInning && currentHalf === 'bottom' ? styles.current : ''}`}>
              {getInningScore('home', i)}
            </div>
          ))}
          <div className={styles.total}>{score.home}</div>
          <div className={styles.total}>{game.innings.filter(h => h.half === 'bottom').reduce((s, h) => s + h.hits, 0)}</div>
          <div className={styles.total}>{game.innings.filter(h => h.half === 'bottom').reduce((s, h) => s + h.errors, 0)}</div>
        </div>
      </div>
    </div>
  );
}
