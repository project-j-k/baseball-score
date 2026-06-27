import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState } from '../types/baseball';
import { getBackendUrl } from './socketUtils';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseSocketReturn {
  status: ConnectionStatus;
  connectedUsers: number;
  pushState: (gameId: string, state: GameState) => void;
  joinRoom: (gameId: string, onState: (s: GameState) => void) => void;
  leaveRoom: (gameId: string) => void;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [connectedUsers, setConnectedUsers] = useState(1);
  const onStateRef = useRef<((s: GameState) => void) | null>(null);

  useEffect(() => {
    const socket = io(getBackendUrl(), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('error'));

    socket.on('gameState', (state: GameState) => {
      onStateRef.current?.(state);
    });

    socket.on('userCount', (count: number) => {
      setConnectedUsers(count);
    });

    setStatus('connecting');

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback((gameId: string, onState: (s: GameState) => void) => {
    onStateRef.current = onState;
    socketRef.current?.emit('joinGame', gameId);
  }, []);

  const leaveRoom = useCallback((_gameId: string) => {
    onStateRef.current = null;
  }, []);

  const pushState = useCallback((gameId: string, state: GameState) => {
    // 状態をHTTP PUTでバックエンドに送信 → 全クライアントに配信
    const url = `${getBackendUrl()}/api/games/${gameId}/state`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }).catch(() => {
      // バックエンドが落ちていても試合は続けられる
    });
  }, []);

  return { status, connectedUsers, pushState, joinRoom, leaveRoom };
}
