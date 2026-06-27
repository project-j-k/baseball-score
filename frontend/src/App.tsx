import { GameSetup } from './components/setup/GameSetup';
import { GamePage } from './pages/GamePage';
import { useGameStore } from './store/gameStore';

export default function App() {
  const {
    game, pendingMove, connectedUsers,
    startGame, recordPlay, confirmRunnerMoves, cancelRunnerMove,
    handleChangePitcher, endGame,
  } = useGameStore();

  if (!game || game.status === 'setup') {
    return <GameSetup onStart={startGame} />;
  }

  if (game.status === 'finished') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 24, padding: 24 }}>
        <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 900 }}>
          {game.endReason === 'cold_game' ? 'コールドゲーム' : game.endReason === 'walk_off' ? 'サヨナラ！' : '試合終了'}
        </div>
        <div style={{ fontSize: 'var(--font-xl)', color: 'var(--accent-gold)' }}>
          {game.visitorTeam.name || '相手'} {game.score.visitor} - {game.score.home} {game.homeTeam.name || '自チーム'}
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => window.location.reload()}>
          新しい試合を始める
        </button>
      </div>
    );
  }

  return (
    <GamePage
      game={game}
      pendingMove={pendingMove}
      onPlay={recordPlay}
      onConfirmMoves={confirmRunnerMoves}
      onCancelMove={cancelRunnerMove}
      onChangePitcher={handleChangePitcher}
      onEndGame={endGame}
      connectedUsers={connectedUsers}
    />
  );
}
