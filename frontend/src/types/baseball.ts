// ========== 基本型 ==========

export type Base = 1 | 2 | 3;
export type PitchType = 'straight' | 'curve' | 'slider' | 'fork' | 'changeup' | 'other';
export type HitType = 'single' | 'double' | 'triple' | 'homerun' | 'infield_single';
export type OutType =
  | 'strikeout_swing'
  | 'strikeout_look'
  | 'groundout'
  | 'flyout'
  | 'lineout'
  | 'popup'
  | 'double_play'
  | 'triple_play'
  | 'sacrifice_fly'
  | 'sacrifice_bunt'
  | 'fielders_choice';
export type RunnerResult = 'advance' | 'score' | 'out' | 'stay';
export type TeamSide = 'home' | 'visitor';
export type Half = 'top' | 'bottom';

// ========== 選手 ==========

export interface Player {
  id: string;          // チームID + 背番号
  number: number;      // 背番号
  name: string;        // ダミー名 or 実名（任意）
  position?: string;   // ポジション
}

// ========== チーム ==========

export interface Team {
  id: string;
  name: string;        // チーム名（空欄可）
  side: TeamSide;
  players: Player[];
  battingOrder: string[]; // Player.id の配列（9人）
  currentBatterIndex: number;
}

// ========== 投球 ==========

export interface Pitch {
  pitchNumber: number;
  type: PitchType;
  result: 'ball' | 'strike' | 'foul' | 'hit' | 'out';
  speed?: number;      // km/h（任意）
}

// ========== 走者状態 ==========

export interface Runner {
  playerId: string;
  base: Base;
}

// ========== プレー ==========

export interface PlayEvent {
  id: string;
  timestamp: number;
  inning: number;
  half: Half;
  outs: number;
  batterId: string;
  pitcherId: string;
  pitches: Pitch[];
  playType: 'hit' | 'out' | 'walk' | 'hbp' | 'strikeout_looking' | 'stolen_base' | 'wild_pitch' | 'passed_ball' | 'balk' | 'error' | 'interference';
  hitType?: HitType;
  outType?: OutType;
  runnersAtStart: Runner[];
  runnersAtEnd: Runner[];
  runnerMoves: RunnerMove[];
  runsScored: number;
  rbis: number;
}

export interface RunnerMove {
  playerId: string;
  fromBase: Base | 'home' | 'batter';
  toBase: Base | 'home' | 'out';
  isEarned: boolean;
}

// ========== イニング ==========

export interface InningHalf {
  inning: number;
  half: Half;
  plays: PlayEvent[];
  runs: number;
  hits: number;
  errors: number;
  completed: boolean;
}

// ========== 試合設定 ==========

export interface GameConfig {
  maxInnings: number;          // 7 or 9
  coldGameEnabled: boolean;
  coldGameDifference: number;  // 得点差（例: 10点差）
  coldGameInning: number;      // 何回から（例: 5回）
  mercyEnabled: boolean;       // コールド別名
}

// ========== カウント ==========

export interface Count {
  balls: number;
  strikes: number;
  outs: number;
}

// ========== 試合状態 ==========

export interface GameState {
  id: string;
  config: GameConfig;
  homeTeam: Team;
  visitorTeam: Team;
  currentInning: number;
  currentHalf: Half;
  count: Count;
  runners: Runner[];             // 現在の走者
  currentBatterId: string;
  currentPitcherId: string;
  innings: InningHalf[];
  score: { home: number; visitor: number };
  status: 'setup' | 'active' | 'suspended' | 'finished';
  endReason?: 'normal' | 'cold_game' | 'walk_off' | 'forfeit';
  createdAt: number;
  updatedAt: number;
}

// ========== 生涯成績 ==========

export interface CareerStats {
  playerId: string;
  teamId: string;
  // 打撃
  games: number;
  atBats: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbis: number;
  runs: number;
  walks: number;
  hitByPitch: number;
  strikeouts: number;
  stolenBases: number;
  caughtStealing: number;
  // 投手
  pitchingGames: number;
  inningsPitched: number;
  pitchCount: number;
  earnedRuns: number;
  strikeoutsAsP: number;
  walksAsP: number;
  hitsAllowed: number;
}

// ========== WebSocketイベント ==========

export interface ServerToClientEvents {
  gameState: (state: GameState) => void;
  playAdded: (play: PlayEvent) => void;
  error: (message: string) => void;
  userCount: (count: number) => void;
}

export interface ClientToServerEvents {
  joinGame: (gameId: string) => void;
  createGame: (config: { homeTeam: Partial<Team>; visitorTeam: Partial<Team>; config: GameConfig }) => void;
  recordPlay: (gameId: string, play: Omit<PlayEvent, 'id' | 'timestamp'>) => void;
  updateGameConfig: (gameId: string, config: Partial<GameConfig>) => void;
}
