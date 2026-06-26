import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type { GameState, ClientToServerEvents, ServerToClientEvents } from './types';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// インメモリで試合状態を管理
const games = new Map<string, GameState>();
const gameRooms = new Map<string, Set<string>>();

io.on('connection', socket => {
  console.log(`接続: ${socket.id}`);

  socket.on('createGame', ({ homeTeam, visitorTeam, config }) => {
    const gameId = Math.random().toString(36).slice(2, 10);
    const state: GameState = {
      id: gameId,
      config: config as GameState['config'],
      homeTeam: homeTeam as GameState['homeTeam'],
      visitorTeam: visitorTeam as GameState['visitorTeam'],
      currentInning: 1,
      currentHalf: 'top',
      count: { balls: 0, strikes: 0, outs: 0 },
      runners: [],
      currentBatterId: (visitorTeam.battingOrder ?? [])[0] ?? '',
      currentPitcherId: (homeTeam.players ?? [])[0]?.id ?? '',
      innings: [],
      score: { home: 0, visitor: 0 },
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    games.set(gameId, state);
    gameRooms.set(gameId, new Set([socket.id]));
    socket.join(gameId);
    socket.emit('gameState', state);
    console.log(`試合作成: ${gameId}`);
  });

  socket.on('joinGame', gameId => {
    const state = games.get(gameId);
    if (!state) {
      socket.emit('error', `試合 ${gameId} が見つからないわ`);
      return;
    }
    socket.join(gameId);
    gameRooms.get(gameId)?.add(socket.id);
    socket.emit('gameState', state);
    const count = gameRooms.get(gameId)?.size ?? 1;
    io.to(gameId).emit('userCount', count);
  });

  socket.on('recordPlay', (gameId, play) => {
    const state = games.get(gameId);
    if (!state) return;
    // フロントエンドでロジック適用済みの状態を受け取る設計（後でサーバー側に移行可能）
    // ここでは play イベントをログのみ取る（状態はフロントが pushState で送る）
    socket.to(gameId).emit('playAdded', { ...play, id: Math.random().toString(36).slice(2), timestamp: Date.now() } as any);
  });

  socket.on('disconnect', () => {
    gameRooms.forEach((members, gameId) => {
      if (members.has(socket.id)) {
        members.delete(socket.id);
        io.to(gameId).emit('userCount', members.size);
      }
    });
    console.log(`切断: ${socket.id}`);
  });
});

// 試合状態をクライアントから受け取って全員に配信するエンドポイント
app.post('/api/games/:gameId/state', express.json(), (req, res) => {
  const { gameId } = req.params;
  const state: GameState = req.body;
  games.set(gameId, state);
  io.to(gameId).emit('gameState', state);
  res.json({ ok: true });
});

app.get('/api/games/:gameId', (req, res) => {
  const state = games.get(req.params.gameId);
  if (!state) return res.status(404).json({ error: 'not found' });
  res.json(state);
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => console.log(`サーバー起動: http://localhost:${PORT}`));
