import { useState } from 'react';
import type { GameState, HitType, Player } from '../../types/baseball';
import {
  buildDefaultRunnerMoves,
  getRunnerOptions,
  type RunnerMoveDecision,
  type RunnerDestination,
} from '../../store/runnerMoveLogic';
import styles from './RunnerMoveDialog.module.css';

interface Props {
  game: GameState;
  hitType: HitType;
  batterId: string;
  onConfirm: (moves: RunnerMoveDecision[]) => void;
  onCancel: () => void;
}

const BASE_LABEL: Record<string, string> = {
  '1': '１塁',
  '2': '２塁',
  '3': '３塁',
  home: '生還（得点）',
  out: 'アウト',
  batter: '打者',
};

const HIT_LABEL: Record<HitType, string> = {
  single: '単打',
  infield_single: '内野安打',
  double: '二塁打',
  triple: '三塁打',
  homerun: 'ホームラン',
};

function getPlayerName(game: GameState, playerId: string): string {
  const all = [...game.homeTeam.players, ...game.visitorTeam.players];
  const p = all.find(pl => pl.id === playerId);
  return p ? `#${p.number} ${p.name}` : playerId;
}

export function RunnerMoveDialog({ game, hitType, batterId, onConfirm, onCancel }: Props) {
  const defaultMoves = buildDefaultRunnerMoves(game.runners, hitType, batterId);
  const [moves, setMoves] = useState<RunnerMoveDecision[]>(defaultMoves);

  // ホームランは確認不要（全員生還）
  if (hitType === 'homerun') {
    return (
      <div className={styles.overlay}>
        <div className={styles.dialog}>
          <div className={styles.title}>⚾ ホームラン！</div>
          <p className={styles.sub}>打者＋全走者が生還するわ</p>
          <div className={styles.runnerList}>
            {moves.map(m => (
              <div key={m.playerId} className={styles.runnerRow}>
                <span className={styles.runnerName}>{getPlayerName(game, m.playerId)}</span>
                <span className={`${styles.dest} ${styles.home}`}>生還</span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-full btn-lg" onClick={() => onConfirm(moves)}>
            確定
          </button>
        </div>
      </div>
    );
  }

  const updateMove = (playerId: string, toBase: RunnerDestination) => {
    setMoves(prev => prev.map(m => m.playerId === playerId ? { ...m, toBase } : m));
  };

  const destStyle = (dest: RunnerDestination): string => {
    if (dest === 'home') return styles.home;
    if (dest === 'out') return styles.outDest;
    return styles.base;
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <div className={styles.title}>{HIT_LABEL[hitType]}</div>
          <p className={styles.sub}>各走者の進塁先を選んでね</p>
        </div>

        <div className={styles.runnerList}>
          {moves.map(m => {
            const fromBase = m.fromBase;
            const options: RunnerDestination[] =
              fromBase === 'batter'
                ? ([1, 2, 3, 'home', 'out'] as RunnerDestination[])
                : getRunnerOptions(fromBase as 1 | 2 | 3);

            return (
              <div key={m.playerId} className={styles.runnerSection}>
                <div className={styles.runnerName}>
                  <span className={styles.fromBadge}>
                    {fromBase === 'batter' ? '打者' : `${fromBase}塁`}
                  </span>
                  {getPlayerName(game, m.playerId)}
                </div>
                <div className={styles.optionRow}>
                  {options.map(opt => (
                    <button
                      key={String(opt)}
                      className={`${styles.optionBtn} ${m.toBase === opt ? styles.selected : ''} ${destStyle(opt)}`}
                      onClick={() => updateMove(m.playerId, opt)}
                    >
                      {BASE_LABEL[String(opt)]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.footer}>
          <button className="btn btn-ghost" onClick={onCancel}>キャンセル</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onConfirm(moves)}>
            確定
          </button>
        </div>
      </div>
    </div>
  );
}
