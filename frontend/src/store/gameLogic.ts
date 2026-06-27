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

  // 最終イニング後の表の処理（コールド・サヨナラは別途判定）
  if (!isTop && nextInning > state.config.maxInnings) {
    return { ...state, status: 'finished', endReason: 'normal' };
  }

  const nextBattingTeam = nextHalf === 'top' ? state.visitorTeam : state.homeTeam;
  const nextPitchingTeam = nextHalf === 'top' ? state.homeTeam : state.visitorTeam;

  return {
    ...state,
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
  const { config, score, currentInning, currentHalf } = state;
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
  const runners = compressRunners([...state.runners, batter]);
  const next = advanceBatter(state);
  return {
    ...next,
    runners,
    count: { balls: 0, strikes: 0, outs: next.count.outs },
  };
}

// 走者が重複した場合、より先の塁に進める（押し出し）
function compressRunners(runners: Runner[]): Runner[] {
  // 重複塁を解消（後から来た走者が押し出す）
  const sorted = [...runners].sort((a, b) => b.base - a.base);
  const result: Runner[] = [];
  for (const r of sorted) {
    const occupied = result.find(x => x.base === r.base);
    if (occupied) {
      // 押し出し：先の走者を1つ進める
      const pushed = result.find(x => x.base === r.base);
      if (pushed && pushed.base < 3) {
        pushed.base = (pushed.base + 1) as 1 | 2 | 3;
      } else if (pushed && pushed.base === 3) {
        // 本塁へ押し出し（得点）
        result.splice(result.indexOf(pushed), 1);
        // TODO: 得点加算（Phase 3で詳細実装）
      }
      result.push(r);
    } else {
      result.push(r);
    }
  }
  return result.filter(r => r.base >= 1 && r.base <= 3) as Runner[];
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

// ========== ファウル ==========

export function applyFoul(state: GameState): GameState {
  if (state.count.strikes < 2) {
    return { ...state, count: { ...state.count, strikes: state.count.strikes + 1 } };
  }
  return state; // 2ストライク時のファウルはカウント変わらず
}
