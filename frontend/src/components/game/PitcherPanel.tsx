import { useState } from 'react';
import type { GameState } from '../../types/baseball';
import { getPitcherStats } from '../../store/pitcherLogic';
import styles from './PitcherPanel.module.css';

interface Props {
  game: GameState;
  onChangePitcher: (newPitcherId: string) => void;
}

const PITCH_TYPE_LABEL: Record<string, string> = {
  straight: '直',
  curve: 'カ',
  slider: 'ス',
  fork: 'フ',
  changeup: 'チ',
  other: '他',
};

export function PitcherPanel({ game, onChangePitcher }: Props) {
  const [showChangeDlg, setShowChangeDlg] = useState(false);
  const [selectedId, setSelectedId] = useState('');

  const fieldingTeam = game.currentHalf === 'top' ? game.homeTeam : game.visitorTeam;
  const pitcher = fieldingTeam.players.find(p => p.id === game.currentPitcherId);
  const stats = getPitcherStats(game, game.currentPitcherId);

  const handleChange = () => {
    if (selectedId && selectedId !== game.currentPitcherId) {
      onChangePitcher(selectedId);
    }
    setShowChangeDlg(false);
    setSelectedId('');
  };

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.left}>
          <span className={styles.label}>投手</span>
          <span className={styles.name}>#{pitcher?.number} {pitcher?.name ?? '—'}</span>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>投球数</span>
            <span className={styles.statVal}>{stats.pitchCount}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>S率</span>
            <span className={styles.statVal}>
              {stats.pitchCount > 0 ? `${Math.round(stats.strikeRate * 100)}%` : '—'}
            </span>
          </div>
          {Object.entries(stats.pitchCountByType).map(([type, count]) => (
            <div key={type} className={styles.stat}>
              <span className={styles.statLabel}>{PITCH_TYPE_LABEL[type] ?? type}</span>
              <span className={styles.statVal}>{count}</span>
            </div>
          ))}
        </div>
        <button className="btn btn-sm btn-ghost" onClick={() => setShowChangeDlg(true)}>
          交代
        </button>
      </div>

      {showChangeDlg && (
        <div className={styles.overlay}>
          <div className={styles.dialog}>
            <div className={styles.dlgTitle}>投手交代</div>
            <div className={styles.playerList}>
              {fieldingTeam.players
                .filter(p => p.id !== game.currentPitcherId)
                .map(p => {
                  const s = getPitcherStats(game, p.id);
                  return (
                    <button
                      key={p.id}
                      className={`${styles.playerBtn} ${selectedId === p.id ? styles.selected : ''}`}
                      onClick={() => setSelectedId(p.id)}
                    >
                      <span>#{p.number} {p.name}</span>
                      {s.pitchCount > 0 && (
                        <span className={styles.prevStats}>
                          今日 {s.pitchCount}球
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
            <div className={styles.dlgFooter}>
              <button className="btn btn-ghost" onClick={() => { setShowChangeDlg(false); setSelectedId(''); }}>
                キャンセル
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={!selectedId}
                onClick={handleChange}
              >
                交代する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
