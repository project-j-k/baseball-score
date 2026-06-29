import { describe, it, expect, beforeEach } from 'vitest';
import type { GameState, Team, GameConfig, Runner } from '../../types/baseball';
import { createInitialGameState } from '../gameLogic';
import {
  applyRunnerMoves,
  buildDefaultRunnerMoves,
  type RunnerMoveDecision,
} from '../runnerMoveLogic';

function makePlayer(id: string, number: number) {
  return { id, number, name: `選手${number}` };
}
function makeTeam(side: 'home' | 'visitor'): Team {
  const players = Array.from({ length: 9 }, (_, i) => makePlayer(`${side}-${i + 1}`, i + 1));
  return { id: side, name: side, side, players, battingOrder: players.map(p => p.id), currentBatterIndex: 0 };
}
function makeConfig(): GameConfig {
  return { maxInnings: 7, coldGameEnabled: true, coldGameDifference: 10, coldGameInning: 5, mercyEnabled: true };
}

let base: GameState;

beforeEach(() => {
  base = createInitialGameState(makeTeam('home'), makeTeam('visitor'), makeConfig());
});

// ========== 走者移動決定の適用 ==========

describe('applyRunnerMoves', () => {
  it('1塁走者がホームに生還する', () => {
    const state: GameState = { ...base, runners: [{ playerId: 'visitor-1', base: 1 }] };
    const moves: RunnerMoveDecision[] = [
      { playerId: 'visitor-1', fromBase: 1, toBase: 'home' },
    ];
    const result = applyRunnerMoves(state, moves);
    expect(result.runners).toHaveLength(0);
    expect(result.score.visitor).toBe(1);
  });

  it('走者がアウトになる', () => {
    const state: GameState = { ...base, runners: [{ playerId: 'visitor-1', base: 2 }] };
    const moves: RunnerMoveDecision[] = [
      { playerId: 'visitor-1', fromBase: 2, toBase: 'out' },
    ];
    const result = applyRunnerMoves(state, moves);
    expect(result.runners).toHaveLength(0);
    expect(result.count.outs).toBe(1);
    expect(result.score.visitor).toBe(0);
  });

  it('走者が元の塁に留まる', () => {
    const state: GameState = { ...base, runners: [{ playerId: 'visitor-1', base: 2 }] };
    const moves: RunnerMoveDecision[] = [
      { playerId: 'visitor-1', fromBase: 2, toBase: 2 },
    ];
    const result = applyRunnerMoves(state, moves);
    expect(result.runners).toHaveLength(1);
    expect(result.runners[0].base).toBe(2);
  });

  it('複数走者が異なる結果になる（2塁打で2塁走者が3塁・1塁走者が生還）', () => {
    const state: GameState = {
      ...base,
      runners: [
        { playerId: 'visitor-1', base: 1 },
        { playerId: 'visitor-2', base: 2 },
      ],
    };
    const moves: RunnerMoveDecision[] = [
      { playerId: 'visitor-1', fromBase: 1, toBase: 'home' }, // 生還
      { playerId: 'visitor-2', fromBase: 2, toBase: 3 },       // 3塁止まり
    ];
    const result = applyRunnerMoves(state, moves);
    expect(result.score.visitor).toBe(1);
    expect(result.runners).toHaveLength(1);
    expect(result.runners[0].base).toBe(3);
  });

  it('走者アウトで3アウト目ならイニングが終わる', () => {
    const state: GameState = {
      ...base,
      count: { balls: 0, strikes: 0, outs: 2 },
      runners: [{ playerId: 'visitor-1', base: 3 }],
    };
    const moves: RunnerMoveDecision[] = [
      { playerId: 'visitor-1', fromBase: 3, toBase: 'out' },
    ];
    const result = applyRunnerMoves(state, moves);
    expect(result.currentHalf).toBe('bottom');
    expect(result.count.outs).toBe(0);
  });

  it('サヨナラの走者生還でゲーム終了', () => {
    const state: GameState = {
      ...base,
      currentInning: 7,
      currentHalf: 'bottom',
      score: { home: 4, visitor: 4 },
      runners: [{ playerId: 'home-1', base: 3 }],
    };
    const moves: RunnerMoveDecision[] = [
      { playerId: 'home-1', fromBase: 3, toBase: 'home' },
    ];
    const result = applyRunnerMoves(state, moves);
    expect(result.status).toBe('finished');
    expect(result.endReason).toBe('walk_off');
    expect(result.score.home).toBe(5);
  });

  // ===== Task #2&#38;6: ヒット後の打者進塁・カウントリセット =====

  it('ヒット後の走者確定で打者が次打者に進む', () => {
    const state: GameState = { ...base };
    expect(state.currentBatterId).toBe('visitor-1');
    const moves: RunnerMoveDecision[] = [
      { playerId: 'visitor-1', fromBase: 'batter', toBase: 1 },
    ];
    const result = applyRunnerMoves(state, moves);
    expect(result.currentBatterId).toBe('visitor-2');
    expect(result.count.balls).toBe(0);
    expect(result.count.strikes).toBe(0);
  });

  it('ヒット後の打者が指定塁の走者として残る', () => {
    const state: GameState = { ...base };
    const moves: RunnerMoveDecision[] = [
      { playerId: 'visitor-1', fromBase: 'batter', toBase: 1 },
    ];
    const result = applyRunnerMoves(state, moves);
    expect(result.runners.some(r => r.playerId === 'visitor-1' && r.base === 1)).toBe(true);
  });

  it('2塁打で打者が2塁に進み次打者へ切り替わる', () => {
    const state: GameState = { ...base, runners: [{ playerId: 'visitor-2', base: 1 }] };
    const moves: RunnerMoveDecision[] = [
      { playerId: 'visitor-2', fromBase: 1, toBase: 3 },
      { playerId: 'visitor-1', fromBase: 'batter', toBase: 2 },
    ];
    const result = applyRunnerMoves(state, moves);
    expect(result.currentBatterId).toBe('visitor-2');
    expect(result.runners.find(r => r.playerId === 'visitor-1')?.base).toBe(2);
    expect(result.runners.find(r => r.playerId === 'visitor-2')?.base).toBe(3);
  });
});

// ========== デフォルト進塁提案 ==========

describe('buildDefaultRunnerMoves', () => {
  it('シングルヒット: 各走者に+1塁を提案', () => {
    const runners: Runner[] = [
      { playerId: 'a', base: 1 },
      { playerId: 'b', base: 2 },
    ];
    const moves = buildDefaultRunnerMoves(runners, 'single', 'visitor-batter');
    expect(moves.find(m => m.playerId === 'a')?.toBase).toBe(2);
    expect(moves.find(m => m.playerId === 'b')?.toBase).toBe(3);
    // 打者は1塁へ
    const batterMove = moves.find(m => m.playerId === 'visitor-batter');
    expect(batterMove?.toBase).toBe(1);
  });

  it('ツーベースヒット: 各走者に+2塁を提案（3塁走者は生還）', () => {
    const runners: Runner[] = [
      { playerId: 'a', base: 1 },
      { playerId: 'b', base: 2 },
      { playerId: 'c', base: 3 },
    ];
    const moves = buildDefaultRunnerMoves(runners, 'double', 'batter');
    expect(moves.find(m => m.playerId === 'a')?.toBase).toBe(3);
    expect(moves.find(m => m.playerId === 'b')?.toBase).toBe('home');
    expect(moves.find(m => m.playerId === 'c')?.toBase).toBe('home');
    expect(moves.find(m => m.playerId === 'batter')?.toBase).toBe(2);
  });

  it('スリーベースヒット: 全走者生還を提案', () => {
    const runners: Runner[] = [
      { playerId: 'a', base: 1 },
      { playerId: 'b', base: 2 },
    ];
    const moves = buildDefaultRunnerMoves(runners, 'triple', 'batter');
    expect(moves.find(m => m.playerId === 'a')?.toBase).toBe('home');
    expect(moves.find(m => m.playerId === 'b')?.toBase).toBe('home');
    expect(moves.find(m => m.playerId === 'batter')?.toBase).toBe(3);
  });
});
