import { useState, useCallback } from 'react';
import type { GameState, GameConfig, Team, HitType } from '../types/baseball';
import type { PlayInput } from '../components/game/PlayInputPanel';
import {
  createInitialGameState,
  addOut,
  applyWalk,
  applyHomerun,
  advanceBatterToBase,
  checkColdGame,
} from './gameLogic';
import { applyRunnerMoves, type RunnerMoveDecision } from './runnerMoveLogic';
import { recordPitches, changePitcher, type PitchRecord } from './pitcherLogic';

export type PendingMove = {
  hitType: HitType;
  batterId: string;
} | null;

export function buildInitialPlay(state: GameState, input: PlayInput): { newState: GameState; pending: PendingMove } {
  // 投球記録を先に反映
  const pitches: PitchRecord[] = input.pitches.map(p => ({
    type: p.type,
    result: p.result,
  }));
  const stateWithPitches = recordPitches(state, pitches);

  switch (input.resultType) {
    case 'hit': {
      if (!input.hitType) return { newState: stateWithPitches, pending: null };
      if (input.hitType === 'homerun') {
        return { newState: checkColdGame(applyHomerun(stateWithPitches)), pending: null };
      }
      return {
        newState: stateWithPitches,
        pending: { hitType: input.hitType, batterId: stateWithPitches.currentBatterId },
      };
    }
    case 'out':
      return { newState: addOut(stateWithPitches), pending: null };
    case 'walk':
      return { newState: applyWalk(stateWithPitches), pending: null };
    case 'hbp':
      return { newState: advanceBatterToBase(stateWithPitches, 1), pending: null };
    default:
      return { newState: stateWithPitches, pending: null };
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
        return newState;
      }
      return { ...newState, updatedAt: Date.now() };
    });
  }, []);

  const confirmRunnerMoves = useCallback((moves: RunnerMoveDecision[]) => {
    setGame(prev => {
      if (!prev) return prev;
      return checkColdGame({ ...applyRunnerMoves(prev, moves), updatedAt: Date.now() });
    });
    setPendingMove(null);
  }, []);

  const cancelRunnerMove = useCallback(() => {
    setPendingMove(null);
  }, []);

  const handleChangePitcher = useCallback((newPitcherId: string) => {
    setGame(prev => prev ? changePitcher(prev, newPitcherId) : prev);
  }, []);

  const endGame = useCallback(() => {
    setGame(prev => prev ? { ...prev, status: 'finished', endReason: 'normal' } : prev);
  }, []);

  return {
    game, pendingMove, connectedUsers,
    startGame, recordPlay, confirmRunnerMoves, cancelRunnerMove,
    handleChangePitcher, endGame,
  };
}
