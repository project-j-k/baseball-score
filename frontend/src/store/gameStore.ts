import { useState, useCallback, useEffect, useRef } from 'react';
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
import { parseGameIdFromUrl, getBackendUrl } from '../hooks/socketUtils';
import { useSocket } from '../hooks/useSocket';

export type PendingMove = {
  hitType: HitType;
  batterId: string;
} | null;

export type AppScreen = 'join' | 'setup' | 'game' | 'finished';

export function buildInitialPlay(state: GameState, input: PlayInput): { newState: GameState; pending: PendingMove } {
  const pitches: PitchRecord[] = input.pitches.map(p => ({ type: p.type, result: p.result }));
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
    case 'out':   return { newState: addOut(stateWithPitches), pending: null };
    case 'walk':  return { newState: applyWalk(stateWithPitches), pending: null };
    case 'hbp':   return { newState: advanceBatterToBase(stateWithPitches, 1), pending: null };
    default:      return { newState: stateWithPitches, pending: null };
  }
}

export function useGameStore() {
  // URLにゲームIDがあれば観戦モードとして参加
  const urlGameId = parseGameIdFromUrl(window.location.href);
  const [screen, setScreen] = useState<AppScreen>(urlGameId ? 'join' : 'join');
  const [game, setGame] = useState<GameState | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove>(null);
  const [isHost, setIsHost] = useState(false);

  const socket = useSocket();
  // 最新のgameをrefでも保持（pushState用）
  const gameRef = useRef<GameState | null>(null);
  gameRef.current = game;

  // URLのゲームIDで自動参加
  useEffect(() => {
    if (urlGameId && socket.status === 'connected') {
      socket.joinRoom(urlGameId, (remoteState) => {
        setGame(remoteState);
        setScreen('game');
      });
    }
  }, [urlGameId, socket.status]);

  // 状態変化をバックエンドにpush（ホストのみ）
  const pushIfHost = useCallback((state: GameState) => {
    if (isHost) {
      socket.pushState(state.id, state);
    }
  }, [isHost, socket]);

  const createNewGame = useCallback(() => {
    setScreen('setup');
    setIsHost(true);
  }, []);

  const joinExisting = useCallback((gameId: string) => {
    socket.joinRoom(gameId, (remoteState) => {
      setGame(remoteState);
      setScreen('game');
    });
    // URLを更新（履歴に残さない）
    const url = new URL(window.location.href);
    url.searchParams.set('g', gameId);
    window.history.replaceState(null, '', url.toString());
  }, [socket]);

  const startGame = useCallback((homeTeam: Team, visitorTeam: Team, config: GameConfig) => {
    const newGame = createInitialGameState(homeTeam, visitorTeam, config);
    setGame(newGame);
    setScreen('game');
    // URLにゲームIDをセット
    const url = new URL(window.location.href);
    url.searchParams.set('g', newGame.id);
    window.history.replaceState(null, '', url.toString());
    // バックエンドにゲームを登録
    socket.pushState(newGame.id, newGame);
  }, [socket]);

  const update = useCallback((updater: (prev: GameState) => GameState) => {
    setGame(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      pushIfHost(next);
      if (next.status === 'finished') setScreen('finished');
      return next;
    });
  }, [pushIfHost]);

  const recordPlay = useCallback((input: PlayInput) => {
    update(prev => {
      const { newState, pending } = buildInitialPlay(prev, input);
      if (pending) {
        setPendingMove(pending);
        return newState;
      }
      return { ...newState, updatedAt: Date.now() };
    });
  }, [update]);

  const confirmRunnerMoves = useCallback((moves: RunnerMoveDecision[]) => {
    update(prev => checkColdGame({ ...applyRunnerMoves(prev, moves), updatedAt: Date.now() }));
    setPendingMove(null);
  }, [update]);

  const cancelRunnerMove = useCallback(() => setPendingMove(null), []);

  const handleChangePitcher = useCallback((newPitcherId: string) => {
    update(prev => changePitcher(prev, newPitcherId));
  }, [update]);

  const endGame = useCallback(() => {
    update(prev => ({ ...prev, status: 'finished', endReason: 'normal' as const }));
  }, [update]);

  return {
    screen, game, pendingMove, isHost,
    connectionStatus: socket.status,
    connectedUsers: socket.connectedUsers,
    createNewGame, joinExisting, startGame,
    recordPlay, confirmRunnerMoves, cancelRunnerMove,
    handleChangePitcher, endGame,
  };
}
