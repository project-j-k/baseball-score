import { useState } from 'react';
import { GameJoin } from './components/setup/GameJoin';
import { GameSetup } from './components/setup/GameSetup';
import { GamePage } from './pages/GamePage';
import { StatsPage } from './pages/StatsPage';
import { useGameStore } from './store/gameStore';
import { parseGameIdFromUrl } from './hooks/socketUtils';
import { exportRecordsAsJson } from './store/careerStats';

export default function App() {
  const {
    screen, game, pendingMove, isHost,
    connectionStatus, connectedUsers,
    createNewGame, joinExisting, startGame,
    recordPlay, confirmRunnerMoves, cancelRunnerMove,
    handleChangePitcher, endGame,
  } = useGameStore();

  const [showStats, setShowStats] = useState(false);
  const urlGameId = parseGameIdFromUrl(window.location.href);

  if (showStats) {
    return <StatsPage onBack={() => setShowStats(false)} />;
  }

  if (screen === 'join') {
    return (
      <GameJoin
        initialGameId={urlGameId}
        onCreateNew={createNewGame}
        onJoin={joinExisting}
        onShowStats={() => setShowStats(true)}
      />
    );
  }

  if (screen === 'setup') {
    return <GameSetup onStart={startGame} />;
  }

  if (screen === 'finished' && game) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 20, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 900 }}>
          {game.endReason === 'cold_game' ? 'コールドゲーム' : game.endReason === 'walk_off' ? 'サヨナラ！' : '試合終了'}
        </div>
        <div style={{ fontSize: 'var(--font-xl)', color: 'var(--accent-gold)' }}>
          {game.visitorTeam.name || '相手'} {game.score.visitor} - {game.score.home} {game.homeTeam.name || '自チーム'}
        </div>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--navy-200)' }}>
          試合データをLocalStorageに保存したわ
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
          <button className="btn btn-primary btn-full btn-lg" onClick={() => setShowStats(true)}>
            生涯成績を確認する
          </button>
          <button className="btn btn-navy btn-full" onClick={exportRecordsAsJson}>
            JSONでエクスポート
          </button>
          <button className="btn btn-ghost btn-full" onClick={() => {
            window.history.replaceState(null, '', '/');
            window.location.reload();
          }}>
            新しい試合を始める
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'game' && game) {
    return (
      <GamePage
        game={game}
        pendingMove={pendingMove}
        isHost={isHost}
        connectionStatus={connectionStatus}
        connectedUsers={connectedUsers}
        onPlay={recordPlay}
        onConfirmMoves={confirmRunnerMoves}
        onCancelMove={cancelRunnerMove}
        onChangePitcher={handleChangePitcher}
        onEndGame={endGame}
      />
    );
  }

  return null;
}
