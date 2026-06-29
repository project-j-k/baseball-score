import type { GameState, Runner, HitType } from '../types/baseball';
import { endHalf, checkWalkOff, advanceBatter } from './gameLogic';

export type RunnerDestination = 1 | 2 | 3 | 'home' | 'out';

export interface RunnerMoveDecision {
  playerId: string;
  fromBase: 1 | 2 | 3 | 'batter';
  toBase: RunnerDestination;
}

// ========== 走者移動を適用してゲーム状態を更新 ==========

export function applyRunnerMoves(state: GameState, moves: RunnerMoveDecision[]): GameState {
  let s = state;
  let runsScored = 0;

  // アウトになった走者をカウント
  const outMoves = moves.filter(m => m.toBase === 'out');
  // 生還した走者をカウント
  const scoringMoves = moves.filter(m => m.toBase === 'home');
  // 残った走者
  const stayingMoves = moves.filter(m => m.toBase !== 'home' && m.toBase !== 'out') as (RunnerMoveDecision & { toBase: 1 | 2 | 3 })[];

  // アウト処理（3アウトなら即イニング終了）
  for (const _out of outMoves) {
    const newOuts = s.count.outs + 1;
    if (newOuts >= 3) {
      return endHalf(s);
    }
    s = { ...s, count: { ...s.count, outs: newOuts } };
  }

  // 生還処理
  runsScored = scoringMoves.length;
  if (runsScored > 0) {
    const side = s.currentHalf === 'top' ? 'visitor' : 'home';
    s = { ...s, score: { ...s.score, [side]: s.score[side] + runsScored } };
    // サヨナラ判定
    s = checkWalkOff(s);
    if (s.status === 'finished') return s;
  }

  // 残塁を更新
  const newRunners: Runner[] = stayingMoves.map(m => ({
    playerId: m.playerId,
    base: m.toBase,
  }));

  // 打者(fromBase:'batter')の移動が含まれる場合は次打者へ進めてカウントをリセット
  const batterMoved = moves.some(m => m.fromBase === 'batter');
  if (batterMoved) {
    const next = advanceBatter(s);
    return { ...next, runners: newRunners, count: { balls: 0, strikes: 0, outs: next.count.outs }, updatedAt: Date.now() };
  }

  return { ...s, runners: newRunners, updatedAt: Date.now() };
}

// ========== ヒット種別ごとのデフォルト進塁提案 ==========

const ADVANCE_BASES: Record<HitType, number> = {
  single: 1,
  infield_single: 1,
  double: 2,
  triple: 3,
  homerun: 4, // 全員生還
};

export function buildDefaultRunnerMoves(
  runners: Runner[],
  hitType: HitType,
  batterId: string
): RunnerMoveDecision[] {
  const advance = ADVANCE_BASES[hitType];
  const moves: RunnerMoveDecision[] = [];

  // 既存走者の進塁
  for (const runner of runners) {
    const target = runner.base + advance;
    const toBase: RunnerDestination = target >= 4 ? 'home' : (target as 1 | 2 | 3);
    moves.push({ playerId: runner.playerId, fromBase: runner.base, toBase });
  }

  // 打者の進塁
  if (hitType === 'homerun') {
    moves.push({ playerId: batterId, fromBase: 'batter', toBase: 'home' });
  } else {
    const batterBase = Math.min(advance, 3) as 1 | 2 | 3;
    moves.push({ playerId: batterId, fromBase: 'batter', toBase: batterBase });
  }

  return moves;
}

// ========== 各走者が選択可能な進塁先の選択肢 ==========

export function getRunnerOptions(fromBase: 1 | 2 | 3): RunnerDestination[] {
  const options: RunnerDestination[] = [fromBase]; // 現在地（留まる）
  for (let b = fromBase + 1; b <= 3; b++) {
    options.push(b as 1 | 2 | 3);
  }
  options.push('home');
  options.push('out');
  return options;
}
