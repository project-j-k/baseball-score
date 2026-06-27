import type { GameState, PitchType } from '../types/baseball';

export interface PitchRecord {
  type: PitchType;
  result: 'ball' | 'strike' | 'foul' | 'hit' | 'out';
}

export interface PitcherGameStats {
  pitcherId: string;
  pitchCount: number;
  pitchCountByType: Partial<Record<PitchType, number>>;
  strikeCount: number;
  ballCount: number;
  foulCount: number;
  strikeRate: number;
}

// pitchHistory: gameState拡張フィールド（型にはanyで格納）
type PitchHistory = Record<string, PitchRecord[]>; // pitcherId → pitches

function getPitchHistory(state: GameState): PitchHistory {
  return (state as any)._pitchHistory ?? {};
}

// ========== 投球記録 ==========

export function recordPitches(state: GameState, pitches: PitchRecord[]): GameState {
  if (pitches.length === 0) return state;
  const history = getPitchHistory(state);
  const existing = history[state.currentPitcherId] ?? [];
  return {
    ...state,
    _pitchHistory: {
      ...history,
      [state.currentPitcherId]: [...existing, ...pitches],
    },
    updatedAt: Date.now(),
  } as GameState;
}

// ========== 投手交代 ==========

export function changePitcher(state: GameState, newPitcherId: string): GameState {
  return { ...state, currentPitcherId: newPitcherId, updatedAt: Date.now() };
}

// ========== 統計取得 ==========

export function getPitcherStats(state: GameState, pitcherId: string): PitcherGameStats {
  const history = getPitchHistory(state);
  const pitches = history[pitcherId] ?? [];

  const pitchCountByType: Partial<Record<PitchType, number>> = {};
  let strikeCount = 0;
  let ballCount = 0;
  let foulCount = 0;

  for (const p of pitches) {
    pitchCountByType[p.type] = (pitchCountByType[p.type] ?? 0) + 1;
    if (p.result === 'strike') strikeCount++;
    else if (p.result === 'ball') ballCount++;
    else if (p.result === 'foul') foulCount++;
  }

  const pitchCount = pitches.length;
  const strikeRate = pitchCount > 0 ? (strikeCount + foulCount) / pitchCount : 0;

  return { pitcherId, pitchCount, pitchCountByType, strikeCount, ballCount, foulCount, strikeRate };
}

// ========== 全投手の投球数を返す（表示用） ==========

export function getAllPitcherStats(state: GameState): PitcherGameStats[] {
  const history = getPitchHistory(state);
  return Object.keys(history).map(id => getPitcherStats(state, id));
}
