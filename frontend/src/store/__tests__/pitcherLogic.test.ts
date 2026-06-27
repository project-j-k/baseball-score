import { describe, it, expect, beforeEach } from 'vitest';
import type { GameState, Team, GameConfig } from '../../types/baseball';
import { createInitialGameState } from '../gameLogic';
import {
  recordPitches,
  changePitcher,
  getPitcherStats,
  type PitchRecord,
} from '../pitcherLogic';

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

let state: GameState;
const P1 = 'home-1';
const P2 = 'home-2';

beforeEach(() => {
  state = createInitialGameState(makeTeam('home'), makeTeam('visitor'), makeConfig());
  // ホームが守備（1回表はビジターが攻撃、ホームが投手）
  state = { ...state, currentPitcherId: P1 };
});

// ========== 投球記録 ==========

describe('recordPitches', () => {
  it('投球を記録するとpitchHistoryに追加される', () => {
    const pitches: PitchRecord[] = [
      { type: 'straight', result: 'strike' },
      { type: 'straight', result: 'ball' },
    ];
    const result = recordPitches(state, pitches);
    const stats = getPitcherStats(result, P1);
    expect(stats.pitchCount).toBe(2);
  });

  it('球種ごとの投球数が集計される', () => {
    const pitches: PitchRecord[] = [
      { type: 'straight', result: 'strike' },
      { type: 'straight', result: 'ball' },
      { type: 'slider', result: 'foul' },
    ];
    const result = recordPitches(state, pitches);
    const stats = getPitcherStats(result, P1);
    expect(stats.pitchCountByType.straight).toBe(2);
    expect(stats.pitchCountByType.slider).toBe(1);
  });

  it('複数打席にわたって累積される', () => {
    const p1: PitchRecord[] = [{ type: 'straight', result: 'strike' }, { type: 'straight', result: 'strike' }];
    const p2: PitchRecord[] = [{ type: 'curve', result: 'ball' }, { type: 'curve', result: 'ball' }, { type: 'straight', result: 'strike' }];
    const s1 = recordPitches(state, p1);
    const s2 = recordPitches(s1, p2);
    const stats = getPitcherStats(s2, P1);
    expect(stats.pitchCount).toBe(5);
    expect(stats.pitchCountByType.straight).toBe(3);
    expect(stats.pitchCountByType.curve).toBe(2);
  });
});

// ========== 投手交代 ==========

describe('changePitcher', () => {
  it('投手交代で現在の投手が変わる', () => {
    const result = changePitcher(state, P2);
    expect(result.currentPitcherId).toBe(P2);
  });

  it('交代後も前の投手の投球記録は保持される', () => {
    const pitches: PitchRecord[] = [{ type: 'straight', result: 'strike' }, { type: 'straight', result: 'ball' }];
    const s1 = recordPitches(state, pitches);
    const s2 = changePitcher(s1, P2);
    const stats = getPitcherStats(s2, P1);
    expect(stats.pitchCount).toBe(2);
  });

  it('交代後の新投手に投球を記録できる', () => {
    const s1 = changePitcher(state, P2);
    const pitches: PitchRecord[] = [{ type: 'fork', result: 'ball' }];
    const s2 = recordPitches(s1, pitches);
    const p1Stats = getPitcherStats(s2, P1);
    const p2Stats = getPitcherStats(s2, P2);
    expect(p1Stats.pitchCount).toBe(0);
    expect(p2Stats.pitchCount).toBe(1);
  });
});

// ========== 統計取得 ==========

describe('getPitcherStats', () => {
  it('存在しない投手IDは初期値を返す', () => {
    const stats = getPitcherStats(state, 'nonexistent');
    expect(stats.pitchCount).toBe(0);
  });

  it('ストライク率が計算できる', () => {
    const pitches: PitchRecord[] = [
      { type: 'straight', result: 'strike' },
      { type: 'straight', result: 'strike' },
      { type: 'straight', result: 'ball' },
      { type: 'straight', result: 'foul' },
    ];
    const s = recordPitches(state, pitches);
    const stats = getPitcherStats(s, P1);
    // strike + foul = 3, total = 4 → 75%
    expect(stats.strikeRate).toBeCloseTo(0.75, 2);
  });
});
