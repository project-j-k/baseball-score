import { describe, it, expect, beforeEach } from 'vitest';
import type { GameState, Team, GameConfig } from '../../types/baseball';
import {
  createInitialGameState,
  applyBall,
  applyStrike,
  applyFoul,
  addOut,
  checkColdGame,
  checkWalkOff,
  applyHomerun,
  advanceBatterToBase,
} from '../gameLogic';

// ========== テスト用ファクトリ ==========

function makePlayer(id: string, number: number) {
  return { id, number, name: `選手${number}` };
}

function makeTeam(side: 'home' | 'visitor'): Team {
  const players = Array.from({ length: 9 }, (_, i) => makePlayer(`${side}-${i + 1}`, i + 1));
  return {
    id: side,
    name: side === 'home' ? 'ホーム' : 'ビジター',
    side,
    players,
    battingOrder: players.map(p => p.id),
    currentBatterIndex: 0,
  };
}

function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    maxInnings: 7,
    coldGameEnabled: true,
    coldGameDifference: 10,
    coldGameInning: 5,
    mercyEnabled: true,
    ...overrides,
  };
}

let state: GameState;

beforeEach(() => {
  state = createInitialGameState(makeTeam('home'), makeTeam('visitor'), makeConfig());
});

// ========== カウント ==========

describe('ボールカウント', () => {
  it('ボール3回で四球になり打者が1塁に進む', () => {
    let s = state;
    s = applyBall(s); // 1
    expect(s.count.balls).toBe(1);
    s = applyBall(s); // 2
    expect(s.count.balls).toBe(2);
    s = applyBall(s); // 3
    expect(s.count.balls).toBe(3);
    s = applyBall(s); // 四球
    expect(s.runners).toHaveLength(1);
    expect(s.runners[0].base).toBe(1);
    expect(s.count.balls).toBe(0);
  });

  it('ストライク2回で三振になりアウトが増える', () => {
    let s = state;
    s = applyStrike(s); // 1
    expect(s.count.strikes).toBe(1);
    s = applyStrike(s); // 2
    expect(s.count.strikes).toBe(2);
    s = applyStrike(s); // 三振
    expect(s.count.outs).toBe(1);
    expect(s.count.strikes).toBe(0);
  });

  it('2ストライク時のファウルはカウントが変わらない', () => {
    let s = applyStrike(applyStrike(state));
    s = applyFoul(s);
    expect(s.count.strikes).toBe(2);
  });

  it('1ストライク時のファウルはストライクが増える', () => {
    let s = applyStrike(state);
    s = applyFoul(s);
    expect(s.count.strikes).toBe(2);
  });
});

// ========== アウト・イニング ==========

describe('アウトとイニング', () => {
  it('3アウトでイニングが終わる', () => {
    let s = addOut(addOut(state));
    expect(s.count.outs).toBe(2);
    s = addOut(s);
    expect(s.currentHalf).toBe('bottom');
    expect(s.count.outs).toBe(0);
    expect(s.runners).toHaveLength(0);
  });

  it('表3アウト→裏へ、裏3アウト→次のイニングへ', () => {
    let s = addOut(addOut(addOut(state))); // 1回表終了
    expect(s.currentHalf).toBe('bottom');
    expect(s.currentInning).toBe(1);
    s = addOut(addOut(addOut(s))); // 1回裏終了
    expect(s.currentHalf).toBe('top');
    expect(s.currentInning).toBe(2);
  });

  it('7回制で7回裏3アウト→試合終了', () => {
    let s = state;
    // 7回裏まで進める
    for (let inning = 1; inning <= 7; inning++) {
      s = addOut(addOut(addOut(s))); // 表終了
      if (inning === 7) {
        // 7回裏3アウトで終了
        s = addOut(addOut(addOut(s)));
        break;
      }
      s = addOut(addOut(addOut(s))); // 裏終了
    }
    expect(s.status).toBe('finished');
  });
});

// ========== 走者 ==========

describe('走者', () => {
  it('1塁に打者を進めると走者が増える', () => {
    const s = advanceBatterToBase(state, 1);
    expect(s.runners).toHaveLength(1);
    expect(s.runners[0].base).toBe(1);
  });

  it('ホームランで全走者と打者が生還する', () => {
    let s = advanceBatterToBase(state, 1); // 1塁
    s = advanceBatterToBase(s, 2);         // 1塁・2塁
    expect(s.runners).toHaveLength(2);
    s = applyHomerun(s);
    expect(s.runners).toHaveLength(0);
    expect(s.score.visitor).toBe(3); // 打者+1塁+2塁
  });

  it('ホームランで走者なしなら1点のみ', () => {
    const s = applyHomerun(state);
    expect(s.score.visitor).toBe(1);
    expect(s.runners).toHaveLength(0);
  });
});

// ========== 押し出し四球 ==========

describe('押し出し四球', () => {
  it('満塁でボール4球目→3塁走者が生還して1点入る', () => {
    let s: GameState = {
      ...state,
      runners: [
        { playerId: 'visitor-2', base: 1 },
        { playerId: 'visitor-3', base: 2 },
        { playerId: 'visitor-4', base: 3 },
      ],
    };
    s = applyBall(applyBall(applyBall(s))); // 3ボール
    s = applyBall(s); // 4球目→四球
    expect(s.score.visitor).toBe(1); // 押し出し1点
    expect(s.runners).toHaveLength(3); // 満塁継続
    expect(s.runners.find(r => r.playerId === 'visitor-4')).toBeUndefined(); // 生還済み
  });

  it('1塁のみの四球は押し出しにならない', () => {
    let s: GameState = {
      ...state,
      runners: [{ playerId: 'visitor-2', base: 1 }],
    };
    s = applyBall(applyBall(applyBall(s)));
    s = applyBall(s);
    expect(s.score.visitor).toBe(0);
    expect(s.runners).toHaveLength(2); // 1塁・2塁
  });
});

// ========== コールドゲーム ==========

describe('コールドゲーム', () => {
  it('5回終了後に10点差でコールド', () => {
    let s: GameState = {
      ...state,
      currentInning: 6,
      currentHalf: 'top',
      score: { home: 10, visitor: 0 },
    };
    s = checkColdGame(s);
    expect(s.status).toBe('finished');
    expect(s.endReason).toBe('cold_game');
  });

  it('4回終了時点では点差あってもコールドにならない', () => {
    let s: GameState = {
      ...state,
      currentInning: 5,
      currentHalf: 'top',
      score: { home: 10, visitor: 0 },
    };
    s = checkColdGame(s);
    expect(s.status).toBe('active');
  });

  it('コールド無効設定では発動しない', () => {
    let s: GameState = {
      ...createInitialGameState(makeTeam('home'), makeTeam('visitor'), makeConfig({ coldGameEnabled: false })),
      currentInning: 6,
      score: { home: 15, visitor: 0 },
    };
    s = checkColdGame(s);
    expect(s.status).toBe('active');
  });
});

// ========== イニング別スコア記録 ==========

describe('イニング別スコア記録', () => {
  it('3アウト後にinningsに当該ハーフが追加される', () => {
    const s = addOut(addOut(addOut(state))); // 1回表終了
    expect(s.innings.some(h => h.inning === 1 && h.half === 'top')).toBe(true);
  });

  it('1回表終了後のinningsエントリはruns=0・completed=true', () => {
    const s = addOut(addOut(addOut(state)));
    const half = s.innings.find(h => h.inning === 1 && h.half === 'top');
    expect(half?.runs).toBe(0);
    expect(half?.completed).toBe(true);
  });

  it('ホームランで得点が入ったイニングのrunsが正しく記録される', () => {
    let s = applyHomerun(state); // 1点
    s = addOut(addOut(addOut(s))); // 1回表終了
    const half = s.innings.find(h => h.inning === 1 && h.half === 'top');
    expect(half?.runs).toBe(1);
  });
});

// ========== 盗塁・暴投・捕逸 ==========

import { applyRunnerAdvance } from '../gameLogic';

describe('盗塁・暴投・捕逸（走者1人進塁）', () => {
  it('1塁走者が盗塁で2塁に進む', () => {
    const s = { ...state, runners: [{ playerId: 'visitor-1', base: 1 as const }] };
    const result = applyRunnerAdvance(s, 'visitor-1', 2);
    expect(result.runners.find(r => r.playerId === 'visitor-1')?.base).toBe(2);
    expect(result.currentBatterId).toBe(s.currentBatterId); // 打者は変わらない
  });

  it('3塁走者が暴投で生還して1点入る', () => {
    const s = { ...state, runners: [{ playerId: 'visitor-1', base: 3 as const }] };
    const result = applyRunnerAdvance(s, 'visitor-1', 'home');
    expect(result.runners).toHaveLength(0);
    expect(result.score.visitor).toBe(1);
  });

  it('走者なしの暴投はカウント変化なし', () => {
    const result = applyRunnerAdvance(state, null, null);
    expect(result).toEqual(state);
  });
});

// ========== サヨナラ ==========

describe('サヨナラ', () => {
  it('最終回裏でホームが勝ち越したらサヨナラ', () => {
    let s: GameState = {
      ...state,
      currentInning: 7,
      currentHalf: 'bottom',
      score: { home: 5, visitor: 4 },
    };
    s = checkWalkOff(s);
    expect(s.status).toBe('finished');
    expect(s.endReason).toBe('walk_off');
  });

  it('同点ではサヨナラにならない', () => {
    let s: GameState = {
      ...state,
      currentInning: 7,
      currentHalf: 'bottom',
      score: { home: 4, visitor: 4 },
    };
    s = checkWalkOff(s);
    expect(s.status).toBe('active');
  });

  it('6回裏ではサヨナラにならない', () => {
    let s: GameState = {
      ...state,
      currentInning: 6,
      currentHalf: 'bottom',
      score: { home: 5, visitor: 4 },
    };
    s = checkWalkOff(s);
    expect(s.status).toBe('active');
  });
});
