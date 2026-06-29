import type { GameState, Team, GameConfig, Runner, Half } from '../types/baseball';

// ========== ファクトリ ==========

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createInitialGameState(
  homeTeam: Team,
  visitorTeam: Team,
  config: GameConfig
): GameState {
  return {
    id: generateId(),
    config,
    homeTeam,
    visitorTeam,
    currentInning: 1,
    currentHalf: 'top',
    count: { balls: 0, strikes: 0, outs: 0 },
    runners: [],
    currentBatterId: visitorTeam.battingOrder[0] ?? '',
    currentPitcherId: homeTeam.players[0]?.id ?? '',
    innings: [],
    score: { home: 0, visitor: 0 },
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ========== 打順を進める ==========

export function nextBatterIndex(team: Team): number {
  return (team.currentBatterIndex + 1) % team.battingOrder.length;
}

export function advanceBatter(state: GameState): GameState {
  const isTop = state.currentHalf === 'top';
  const battingTeam = isTop ? state.visitorTeam : state.homeTeam;
  const nextIdx = nextBatterIndex(battingTeam);
  const nextBatterId = battingTeam.battingOrder[nextIdx];

  if (isTop) {
    return {
      ...state,
      currentBatterId: nextBatterId,
      visitorTeam: { ...battingTeam, currentBatterIndex: nextIdx },
    };
  }
  return {
    ...state,
    currentBatterId: nextBatterId,
    homeTeam: { ...battingTeam, currentBatterIndex: nextIdx },
  };
}

// ========== カウントリセット ==========

export function resetCount(state: GameState): GameState {
  return { ...state, count: { ...state.count, balls: 0, strikes: 0 } };
}

// ========== アウト追加 ==========

export function addOut(state: GameState): GameState {
  const newOuts = state.count.outs + 1;
  if (newOuts >= 3) {
    return endHalf(state);
  }
  const next = advanceBatter(state);
  return { ...next, count: { balls: 0, strikes: 0, outs: newOuts } };
}

// ========== イニング終了 ==========

export function endHalf(state: GameState): GameState {
  const isTop = state.currentHalf === 'top';
  const nextHalf: Half = isTop ? 'bottom' : 'top';
  const nextInning = isTop ? state.currentInning : state.currentInning + 1;

  // 終了したハーフのスコアを記録
  const runsThisHalf = isTop ? state.score.visitor : state.score.home;
  const completedHalf = {
    inning: state.currentInning,
    half: state.currentHalf,
    plays: [],
    runs: 0,
    hits: 0,
    errors: 0,
    completed: true,
  };
  // このイニングのこのハーフの得点（累計スコアから前イニングまでの合計を引く）
  const prevInningRuns = state.innings
    .filter(h => h.half === state.currentHalf && h.completed)
    .reduce((sum, h) => sum + h.runs, 0);
  completedHalf.runs = runsThisHalf - prevInningRuns;

  const newInnings = [
    ...state.innings.filter(h => !(h.inning === state.currentInning && h.half === state.currentHalf)),
    completedHalf,
  ];

  // 最終イニング後の表の処理（コールド・サヨナラは別途判定）
  if (!isTop && nextInning > state.config.maxInnings) {
    return { ...state, innings: newInnings, status: 'finished', endReason: 'normal' };
  }

  const nextBattingTeam = nextHalf === 'top' ? state.visitorTeam : state.homeTeam;
  const nextPitchingTeam = nextHalf === 'top' ? state.homeTeam : state.visitorTeam;

  return {
    ...state,
    innings: newInnings,
    currentInning: nextInning,
    currentHalf: nextHalf,
    count: { balls: 0, strikes: 0, outs: 0 },
    runners: [],
    currentBatterId: nextBattingTeam.battingOrder[nextBattingTeam.currentBatterIndex],
    currentPitcherId: nextPitchingTeam.players[0]?.id ?? '',
    updatedAt: Date.now(),
  };
}

// ========== コールドゲーム判定 ==========

export function checkColdGame(state: GameState): GameState {
  const { config, score, currentInning } = state;
  if (!config.coldGameEnabled) return state;
  // イニング終了直後（次イニングに変わった後）に判定
  // completedInning = currentInning - 1 (bottomが終わったら)
  const diff = Math.abs(score.home - score.visitor);
  if (diff >= config.coldGameDifference && currentInning > config.coldGameInning) {
    return { ...state, status: 'finished', endReason: 'cold_game' };
  }
  return state;
}

// ========== サヨナラ判定 ==========

export function checkWalkOff(state: GameState): GameState {
  // 最終回の裏で、ホームが勝ち越した瞬間
  if (
    state.currentHalf === 'bottom' &&
    state.currentInning >= state.config.maxInnings &&
    state.score.home > state.score.visitor
  ) {
    return { ...state, status: 'finished', endReason: 'walk_off' };
  }
  return state;
}

// ========== 四球（打者が1塁へ、押し出し考慮） ==========

export function applyWalk(state: GameState): GameState {
  return advanceBatterToBase(state, 1);
}

// ========== 打者を塁に進める（押し出し・走者詰まりは呼び出し元で処理） ==========

export function advanceBatterToBase(state: GameState, base: 1 | 2 | 3): GameState {
  const batter: Runner = { playerId: state.currentBatterId, base };
  const { runners, runsScored } = compressRunners([...state.runners, batter]);
  const next = advanceBatter(state);
  const side = state.currentHalf === 'top' ? 'visitor' : 'home';
  const newScore = runsScored > 0
    ? { ...state.score, [side]: state.score[side] + runsScored }
    : state.score;
  let result = { ...next, runners, score: newScore, count: { balls: 0, strikes: 0, outs: next.count.outs } };
  if (runsScored > 0) result = checkWalkOff(result) as typeof result;
  return result;
}

// 走者が重複した場合、より先の塁に進める（押し出し）
function compressRunners(runners: Runner[]): { runners: Runner[]; runsScored: number } {
  const sorted = [...runners].sort((a, b) => b.base - a.base);
  const result: Runner[] = [];
  let runsScored = 0;
  for (const r of sorted) {
    const occupied = result.find(x => x.base === r.base);
    if (occupied) {
      if (occupied.base < 3) {
        occupied.base = (occupied.base + 1) as 1 | 2 | 3;
        // 押し出した先でまた重複するか再帰的に解消
        const again = compressRunners(result);
        result.length = 0;
        result.push(...again.runners);
        runsScored += again.runsScored;
      } else {
        // 3塁走者が本塁へ押し出し→得点
        result.splice(result.indexOf(occupied), 1);
        runsScored++;
      }
      result.push(r);
    } else {
      result.push(r);
    }
  }
  return { runners: result.filter(r => r.base >= 1 && r.base <= 3) as Runner[], runsScored };
}

// ========== ホームラン ==========

export function applyHomerun(state: GameState): GameState {
  const runsScored = state.runners.length + 1;
  const side = state.currentHalf === 'top' ? 'visitor' : 'home';
  const newScore = { ...state.score, [side]: state.score[side] + runsScored };
  const next = advanceBatter(state);
  return checkWalkOff({
    ...next,
    score: newScore,
    runners: [],
    count: { balls: 0, strikes: 0, outs: next.count.outs },
  });
}

// ========== 得点追加 ==========

export function addRun(state: GameState, count = 1): GameState {
  const side = state.currentHalf === 'top' ? 'visitor' : 'home';
  return { ...state, score: { ...state.score, [side]: state.score[side] + count } };
}

// ========== ボールカウント ==========

export function applyBall(state: GameState): GameState {
  if (state.count.balls >= 3) {
    // 四球
    return applyWalk(state);
  }
  return { ...state, count: { ...state.count, balls: state.count.balls + 1 } };
}

// ========== ストライクカウント ==========

export function applyStrike(state: GameState): GameState {
  if (state.count.strikes >= 2) {
    // 三振（0→1→2→三振）
    return addOut(state);
  }
  return { ...state, count: { ...state.count, strikes: state.count.strikes + 1 } };
}

// ========== 全走者を1つ進める（暴投・捕逸用） ==========

export function applyAllRunnersAdvance(state: GameState): GameState {
  if (state.runners.length === 0) return state;
  let s = state;
  let runsScored = 0;
  const newRunners: Runner[] = [];
  for (const r of state.runners) {
    if (r.base === 3) {
      runsScored++;
    } else {
      newRunners.push({ ...r, base: (r.base + 1) as 1 | 2 | 3 });
    }
  }
  if (runsScored > 0) {
    const side = s.currentHalf === 'top' ? 'visitor' : 'home';
    s = { ...s, score: { ...s.score, [side]: s.score[side] + runsScored } };
    s = checkWalkOff(s);
    if (s.status === 'finished') return { ...s, runners: newRunners };
  }
  return { ...s, runners: newRunners };
}

// ========== 走者1人を指定塁に進める（盗塁・暴投・捕逸用） ==========

export function applyRunnerAdvance(
  state: GameState,
  playerId: string | null,
  toBase: 1 | 2 | 3 | 'home' | null,
): GameState {
  if (!playerId || toBase === null) return state;

  if (toBase === 'home') {
    // 生還→得点加算、走者から除去
    const side = state.currentHalf === 'top' ? 'visitor' : 'home';
    const newScore = { ...state.score, [side]: state.score[side] + 1 };
    const newRunners = state.runners.filter(r => r.playerId !== playerId);
    return checkWalkOff({ ...state, score: newScore, runners: newRunners });
  }

  const newRunners = state.runners.map(r =>
    r.playerId === playerId ? { ...r, base: toBase } : r
  );
  return { ...state, runners: newRunners };
}

// ========== ファウル ==========

export function applyFoul(state: GameState): GameState {
  if (state.count.strikes < 2) {
    return { ...state, count: { ...state.count, strikes: state.count.strikes + 1 } };
  }
  return state; // 2ストライク時のファウルはカウント変わらず
}
