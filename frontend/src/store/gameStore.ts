import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState, GameConfig, Team, HitType } from '../types/baseball';
import type { PlayInput } from '../components/game/PlayInputPanel';
import {
  createInitialGameState,
  addOut,
  applyWalk,
  applyHomerun,
  advanceBatterToBase,
  applyAllRunnersAdvance,
  checkColdGame,
} from './gameLogic';
import { applyRunnerMoves, type RunnerMoveDecision } from './runnerMoveLogic';
import { recordPitches, changePitcher, type PitchRecord, getAllPitcherStats } from './pitcherLogic';
import { parseGameIdFromUrl } from '../hooks/socketUtils';
import { useSocket } from '../hooks/useSocket';
import { saveGameRecord, type AtBatLog, type GameRecord } from './careerStats';

export type PendingMove = {
  hitType: HitType;
  batterId: string;
} | {
  type: 'stolen_base';
} | null;

export type AppScreen = 'join' | 'setup' | 'game' | 'finished';

function appendAtBatLog(state: GameState, log: AtBatLog): GameState {
  const prev: AtBatLog[] = (state as any)._atBatLog ?? [];
  return { ...state, _atBatLog: [...prev, log] } as GameState;
}

export function buildInitialPlay(state: GameState, input: PlayInput): { newState: GameState; pending: PendingMove } {
  const pitches: PitchRecord[] = input.pitches.map(p => ({ type: p.type, result: p.result }));
  const stateWithPitches = recordPitches(state, pitches);

  const baseLog: Omit<AtBatLog, 'result' | 'hitType' | 'outType' | 'rbis'> = {
    batterId: state.currentBatterId,
    pitcherId: state.currentPitcherId,
    pitchCount: pitches.length,
  };

  switch (input.resultType) {
    case 'hit': {
      if (!input.hitType) return { newState: stateWithPitches, pending: null };
      const loggedState = appendAtBatLog(stateWithPitches, { ...baseLog, result: 'hit', hitType: input.hitType, rbis: 0 });
      if (input.hitType === 'homerun') {
        const afterHR = applyHomerun(loggedState);
        // HRのRBIを更新（走者+1）
        const atBatLogs: AtBatLog[] = (afterHR as any)._atBatLog ?? [];
        atBatLogs[atBatLogs.length - 1].rbis = state.runners.length + 1;
        return { newState: checkColdGame(afterHR), pending: null };
      }
      return {
        newState: loggedState,
        pending: { hitType: input.hitType, batterId: stateWithPitches.currentBatterId },
      };
    }
    case 'out': {
      const s = appendAtBatLog(stateWithPitches, { ...baseLog, result: 'out', outType: input.outType, rbis: 0 });
      return { newState: addOut(s), pending: null };
    }
    case 'walk': {
      const s = appendAtBatLog(stateWithPitches, { ...baseLog, result: 'walk', rbis: 0 });
      return { newState: applyWalk(s), pending: null };
    }
    case 'hbp': {
      const s = appendAtBatLog(stateWithPitches, { ...baseLog, result: 'hbp', rbis: 0 });
      return { newState: advanceBatterToBase(s, 1), pending: null };
    }
    case 'wild_pitch':
    case 'passed_ball': {
      // 全走者が1つ進む。打者のカウントは変わらない
      return { newState: applyAllRunnersAdvance(stateWithPitches), pending: null };
    }
    case 'stolen_base': {
      // 盗塁：走者選択ダイアログを出す（hitと同じRunnerMoveDialogを流用）
      if (state.runners.length === 0) return { newState: stateWithPitches, pending: null };
      return { newState: stateWithPitches, pending: { type: 'stolen_base' } };
    }
    default:
      return { newState: stateWithPitches, pending: null };
  }
}

function buildGameRecord(game: GameState): GameRecord {
  const allPitcherStats = getAllPitcherStats(game);
  return {
    gameId: game.id,
    date: new Date(game.createdAt).toISOString().slice(0, 10),
    homeTeamName: game.homeTeam.name || 'ホーム',
    visitorTeamName: game.visitorTeam.name || 'ビジター',
    score: game.score,
    atBats: (game as any)._atBatLog ?? [],
    pitchingLogs: allPitcherStats.map(s => ({
      pitcherId: s.pitcherId,
      pitchCount: s.pitchCount,
      strikeouts: s.strikeCount,
      walks: s.ballCount,
      hitsAllowed: 0,
      earnedRuns: 0,
      outsRecorded: 0,
    })),
  };
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
      if (next.status === 'finished' && prev.status !== 'finished') {
        setScreen('finished');
        // 試合終了時にLocalStorageへ自動保存
        saveGameRecord(buildGameRecord(next));
      }
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
