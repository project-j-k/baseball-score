import { useState, useCallback } from 'react';
import type { GameState, GameConfig, Team, HitType } from '../types/baseball';
import type { PlayInput } from '../components/game/PlayInputPanel';
import {
  createInitialGameState,
  applyBall,
  applyStrike,
  applyFoul,
  addOut,
  applyWalk,
  applyHomerun,
  advanceBatterToBase,
  checkColdGame,
} from './gameLogic';
import { applyRunnerMoves, type RunnerMoveDecision } from './runnerMoveLogic';

// 安打後に走者移動ダイアログが必要か判定
export type PendingMove = {
  hitType: HitType;
  batterId: string;
} | null;

export function buildInitialPlay(state: GameState, input: PlayInput): { newState: GameState; pending: PendingMove } {
  switch (input.resultType) {
    case 'hit': {
      if (!input.hitType) return { newState: state, pending: null };
      if (input.hitType === 'homerun') {
        return { newState: checkColdGame(applyHomerun(state)), pending: null };
      }
      // 走者がいる、または打者が2塁以上に進む場合はダイアログを出す
      // シンプルに常にダイアログを表示する（走者なし・単打でも打者の進塁を確認）
      return {
        newState: state,
        pending: { hitType: input.hitType, batterId: state.currentBatterId },
      };
    }
    case 'out':
      return { newState: addOut(state), pending: null };
    case 'walk':
      return { newState: applyWalk(state), pending: null };
    case 'hbp':
      return { newState: advanceBatterToBase(state, 1), pending: null };
    case 'stolen_base': {
      // 盗塁：走者選択は別途実装（Phase 3後半）
      return { newState: state, pending: null };
    }
    case 'wild_pitch':
    case 'passed_ball': {
      // 全走者+1塁（簡易実装）
      return { newState: state, pending: null };
    }
    default:
      return { newState: state, pending: null };
  }
}

export function useGameStore() {
  const [game, setGame] = useState<GameState | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove>(null);
  const [connectedUsers] = useState(1);

  const startGame = useCallback((homeTeam: Team, visitorTeam: Team, config: GameConfig) => {
    setGame(createInitialGameState(homeTeam, visitorTeam, config));
  }, []);

  const recordPlay = useCallback((input: PlayInput) => {
    setGame(prev => {
      if (!prev) return prev;
      const { newState, pending } = buildInitialPlay(prev, input);
      if (pending) {
        setPendingMove(pending);
        return newState; // ダイアログ待ち（状態は変えない）
      }
      return { ...newState, updatedAt: Date.now() };
    });
  }, []);

  const confirmRunnerMoves = useCallback((moves: RunnerMoveDecision[]) => {
    setGame(prev => {
      if (!prev) return prev;
      const next = applyRunnerMoves(prev, moves);
      return checkColdGame({ ...next, updatedAt: Date.now() });
    });
    setPendingMove(null);
  }, []);

  const cancelRunnerMove = useCallback(() => {
    setPendingMove(null);
  }, []);

  const endGame = useCallback(() => {
    setGame(prev => prev ? { ...prev, status: 'finished', endReason: 'normal' } : prev);
  }, []);

  return { game, pendingMove, connectedUsers, startGame, recordPlay, confirmRunnerMoves, cancelRunnerMove, endGame };
}
