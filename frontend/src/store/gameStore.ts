import { useState, useCallback } from 'react';
import type { GameState, GameConfig, Team, PlayEvent, Runner } from '../types/baseball';
import type { PlayInput } from '../components/game/PlayInputPanel';

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function createInitialGameState(homeTeam: Team, visitorTeam: Team, config: GameConfig): GameState {
  return {
    id: generateId(),
    config,
    homeTeam,
    visitorTeam,
    currentInning: 1,
    currentHalf: 'top',
    count: { balls: 0, strikes: 0, outs: 0 },
    runners: [],
    currentBatterId: visitorTeam.battingOrder[0],
    currentPitcherId: homeTeam.players[0]?.id ?? '',
    innings: [],
    score: { home: 0, visitor: 0 },
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// カウントを進める（打席結果を除く投球ごとの処理）
function advanceCount(
  state: GameState,
  ballOrStrike: 'ball' | 'strike' | 'foul'
): Partial<GameState> {
  const { count } = state;
  if (ballOrStrike === 'ball') {
    if (count.balls >= 3) {
      // 四球
      return applyWalk(state);
    }
    return { count: { ...count, balls: count.balls + 1 } };
  }
  if (ballOrStrike === 'strike') {
    if (count.strikes >= 1) {
      // 三振
      return applyStrikeout(state);
    }
    return { count: { ...count, strikes: count.strikes + 1 } };
  }
  // foul: 2ストライク未満なら増える
  if (count.strikes < 2) {
    return { count: { ...count, strikes: count.strikes + 1 } };
  }
  return {};
}

function applyWalk(state: GameState): Partial<GameState> {
  return advanceBatterToBase(state, 1, false);
}

function applyStrikeout(state: GameState): Partial<GameState> {
  return addOut(state);
}

function addOut(state: GameState): Partial<GameState> {
  const newOuts = state.count.outs + 1;
  if (newOuts >= 3) {
    return endHalf(state);
  }
  return {
    count: { balls: 0, strikes: 0, outs: newOuts },
    currentBatterId: nextBatter(state),
  };
}

function endHalf(state: GameState): Partial<GameState> {
  const nextHalf = state.currentHalf === 'top' ? 'bottom' : 'top';
  const nextInning = state.currentHalf === 'bottom' ? state.currentInning + 1 : state.currentInning;

  // サヨナラ・コールド判定はここで行う（簡易版）
  if (nextInning > state.config.maxInnings) {
    return { status: 'finished', endReason: 'normal' };
  }

  const battingTeam = nextHalf === 'top' ? state.visitorTeam : state.homeTeam;
  const fieldingTeam = nextHalf === 'top' ? state.homeTeam : state.visitorTeam;

  return {
    currentInning: nextInning,
    currentHalf: nextHalf,
    count: { balls: 0, strikes: 0, outs: 0 },
    runners: [],
    currentBatterId: battingTeam.battingOrder[battingTeam.currentBatterIndex],
    currentPitcherId: fieldingTeam.players[0]?.id ?? '',
  };
}

function nextBatter(state: GameState): string {
  const battingTeam = state.currentHalf === 'top' ? state.visitorTeam : state.homeTeam;
  const nextIdx = (battingTeam.currentBatterIndex + 1) % battingTeam.battingOrder.length;
  return battingTeam.battingOrder[nextIdx];
}

// 打者を指定塁に進める（満塁押し出しは未対応→Phase 3で実装）
function advanceBatterToBase(state: GameState, base: 1 | 2 | 3, isHit: boolean): Partial<GameState> {
  const batter: Runner = { playerId: state.currentBatterId, base };
  const newRunners: Runner[] = [...state.runners, batter].filter(r => r.base <= 3) as Runner[];
  return {
    count: { balls: 0, strikes: 0, outs: state.count.outs },
    runners: newRunners,
    currentBatterId: nextBatter(state),
  };
}

export function applyPlayInput(state: GameState, input: PlayInput): GameState {
  let patch: Partial<GameState> = {};

  switch (input.resultType) {
    case 'hit': {
      const baseMap: Record<string, 1 | 2 | 3> = {
        single: 1, infield_single: 1, double: 2, triple: 3
      };
      if (input.hitType === 'homerun') {
        // 全走者生還
        const runsScored = state.runners.length + 1;
        const side = state.currentHalf === 'top' ? 'visitor' : 'home';
        patch = {
          score: { ...state.score, [side]: state.score[side] + runsScored },
          runners: [],
          count: { balls: 0, strikes: 0, outs: state.count.outs },
          currentBatterId: nextBatter(state),
        };
      } else if (input.hitType) {
        patch = advanceBatterToBase(state, baseMap[input.hitType] ?? 1, true);
      }
      break;
    }
    case 'out':
      patch = addOut(state);
      break;
    case 'walk':
      patch = applyWalk(state);
      break;
    case 'hbp':
      patch = advanceBatterToBase(state, 1, false);
      break;
    default:
      break;
  }

  return { ...state, ...patch, updatedAt: Date.now() } as GameState;
}

export function useGameStore() {
  const [game, setGame] = useState<GameState | null>(null);
  const [connectedUsers] = useState(1);

  const startGame = useCallback((homeTeam: Team, visitorTeam: Team, config: GameConfig) => {
    setGame(createInitialGameState(homeTeam, visitorTeam, config));
  }, []);

  const recordPlay = useCallback((input: PlayInput) => {
    setGame(prev => {
      if (!prev) return prev;
      return applyPlayInput(prev, input);
    });
  }, []);

  const endGame = useCallback(() => {
    setGame(prev => prev ? { ...prev, status: 'finished', endReason: 'normal' } : prev);
  }, []);

  return { game, connectedUsers, startGame, recordPlay, endGame };
}
