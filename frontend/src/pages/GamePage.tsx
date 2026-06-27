import type { GameState } from '../types/baseball';
import { ScoreBoard } from '../components/common/ScoreBoard';
import { CountDisplay } from '../components/common/CountDisplay';
import { PlayInputPanel } from '../components/game/PlayInputPanel';
import { RunnerMoveDialog } from '../components/game/RunnerMoveDialog';
import { PitcherPanel } from '../components/game/PitcherPanel';
import { ShareCode } from '../components/game/ShareCode';
import type { PlayInput } from '../components/game/PlayInputPanel';
import type { PendingMove } from '../store/gameStore';
import type { RunnerMoveDecision } from '../store/runnerMoveLogic';
import type { ConnectionStatus } from '../hooks/useSocket';
import styles from './GamePage.module.css';

interface Props {
  game: GameState;
  pendingMove: PendingMove;
  isHost: boolean;
  connectionStatus: ConnectionStatus;
  connectedUsers: number;
  onPlay: (input: PlayInput) => void;
  onConfirmMoves: (moves: RunnerMoveDecision[]) => void;
  onCancelMove: () => void;
  onChangePitcher: (id: string) => void;
  onEndGame: () => void;
}

function getPlayerName(game: GameState, playerId: string): string {
  const all = [...game.homeTeam.players, ...game.visitorTeam.players];
  const p = all.find(pl => pl.id === playerId);
  return p ? `#${p.number} ${p.name}` : '?';
}

export function GamePage({
  game, pendingMove, isHost, connectionStatus, connectedUsers,
  onPlay, onConfirmMoves, onCancelMove, onChangePitcher, onEndGame,
}: Props) {
  const currentBatterName = getPlayerName(game, game.currentBatterId);
  const currentPitcherName = getPlayerName(game, game.currentPitcherId);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <ShareCode
          gameId={game.id}
          connectedUsers={connectedUsers}
          connectionStatus={connectionStatus}
        />
        {isHost && (
          <button className="btn btn-sm btn-ghost" onClick={onEndGame}>試合終了</button>
        )}
      </div>

      <div className={styles.section}>
        <ScoreBoard game={game} />
      </div>

      <div className={styles.section}>
        <CountDisplay
          count={game.count}
          runners={game.runners}
          currentBatterName={currentBatterName}
          currentPitcherName={currentPitcherName}
          inning={game.currentInning}
          half={game.currentHalf}
        />
      </div>

      {isHost && (
        <>
          <div className={styles.section}>
            <PitcherPanel game={game} onChangePitcher={onChangePitcher} />
          </div>
          <div className={styles.section}>
            <PlayInputPanel onCommit={onPlay} runners={game.runners} />
          </div>
        </>
      )}

      {!isHost && (
        <div className={styles.viewerBanner}>
          観戦モード — スコアをリアルタイムで確認中
        </div>
      )}

      {pendingMove && isHost && (
        <RunnerMoveDialog
          game={game}
          hitType={pendingMove.hitType}
          batterId={pendingMove.batterId}
          onConfirm={onConfirmMoves}
          onCancel={onCancelMove}
        />
      )}
    </div>
  );
}
