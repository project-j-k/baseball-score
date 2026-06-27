import { describe, it, expect } from 'vitest';
import {
  aggregateBattingStats,
  aggregatePitchingStats,
  mergeCareerStats,
  type AtBatLog,
  type PitchingLog,
} from '../careerStats';

// ========== テスト用データ ==========

const atBats: AtBatLog[] = [
  { batterId: 'p1', pitcherId: 'p9', result: 'hit',  hitType: 'single',  rbis: 0, pitchCount: 3 },
  { batterId: 'p1', pitcherId: 'p9', result: 'hit',  hitType: 'double',  rbis: 1, pitchCount: 4 },
  { batterId: 'p1', pitcherId: 'p9', result: 'out',  outType: 'strikeout_swing', rbis: 0, pitchCount: 3 },
  { batterId: 'p1', pitcherId: 'p9', result: 'walk', rbis: 0, pitchCount: 4 },
  { batterId: 'p2', pitcherId: 'p9', result: 'hit',  hitType: 'homerun', rbis: 2, pitchCount: 2 },
  { batterId: 'p2', pitcherId: 'p9', result: 'out',  outType: 'groundout', rbis: 0, pitchCount: 3 },
];

const pitchingLogs: PitchingLog[] = [
  { pitcherId: 'p9', pitchCount: 10, strikeouts: 1, walks: 1, hitsAllowed: 3, earnedRuns: 2, outsRecorded: 6 },
];

// ========== 打撃成績 ==========

describe('aggregateBattingStats', () => {
  it('安打数が正しく集計される', () => {
    const stats = aggregateBattingStats('p1', atBats);
    expect(stats.hits).toBe(2);
  });

  it('打数は四球を除く', () => {
    const stats = aggregateBattingStats('p1', atBats);
    // 単打・二塁打・三振の3打席 = 打数3
    expect(stats.atBats).toBe(3);
  });

  it('打率が正しく計算される', () => {
    const stats = aggregateBattingStats('p1', atBats);
    // 2安打 / 3打数 = .667
    expect(stats.battingAverage).toBeCloseTo(0.667, 2);
  });

  it('2塁打・3塁打・本塁打が分類される', () => {
    const stats = aggregateBattingStats('p1', atBats);
    expect(stats.singles).toBe(1);
    expect(stats.doubles).toBe(1);
    expect(stats.triples).toBe(0);
    expect(stats.homeRuns).toBe(0);
  });

  it('打点が集計される', () => {
    const stats = aggregateBattingStats('p1', atBats);
    expect(stats.rbis).toBe(1);
  });

  it('四球が集計される', () => {
    const stats = aggregateBattingStats('p1', atBats);
    expect(stats.walks).toBe(1);
  });

  it('三振が集計される', () => {
    const stats = aggregateBattingStats('p1', atBats);
    expect(stats.strikeouts).toBe(1);
  });

  it('別選手のHRが集計される', () => {
    const stats = aggregateBattingStats('p2', atBats);
    expect(stats.homeRuns).toBe(1);
    expect(stats.rbis).toBe(2);
    expect(stats.atBats).toBe(2);
    expect(stats.hits).toBe(1);
  });

  it('打席0の選手は0を返す', () => {
    const stats = aggregateBattingStats('unknown', atBats);
    expect(stats.atBats).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.battingAverage).toBe(0);
  });
});

// ========== 投手成績 ==========

describe('aggregatePitchingStats', () => {
  it('投球数が集計される', () => {
    const stats = aggregatePitchingStats('p9', pitchingLogs);
    expect(stats.pitchCount).toBe(10);
  });

  it('投球回が計算される（3アウト=1回）', () => {
    const stats = aggregatePitchingStats('p9', pitchingLogs);
    // 6アウト = 2回
    expect(stats.inningsPitched).toBeCloseTo(2.0, 1);
  });

  it('防御率が計算される（自責点×9÷投球回）', () => {
    const stats = aggregatePitchingStats('p9', pitchingLogs);
    // 2自責点 × 9 ÷ 2回 = 9.00
    expect(stats.era).toBeCloseTo(9.0, 1);
  });

  it('三振・四球・被安打が集計される', () => {
    const stats = aggregatePitchingStats('p9', pitchingLogs);
    expect(stats.strikeouts).toBe(1);
    expect(stats.walks).toBe(1);
    expect(stats.hitsAllowed).toBe(3);
  });
});

// ========== 複数試合の統合 ==========

describe('mergeCareerStats', () => {
  it('複数試合の打撃成績が合算される', () => {
    const game1: AtBatLog[] = [
      { batterId: 'p1', pitcherId: 'p9', result: 'hit', hitType: 'single', rbis: 0, pitchCount: 3 },
    ];
    const game2: AtBatLog[] = [
      { batterId: 'p1', pitcherId: 'p9', result: 'hit', hitType: 'homerun', rbis: 1, pitchCount: 2 },
      { batterId: 'p1', pitcherId: 'p9', result: 'out', outType: 'groundout', rbis: 0, pitchCount: 3 },
    ];
    const merged = mergeCareerStats('p1', [game1, game2]);
    expect(merged.atBats).toBe(3);
    expect(merged.hits).toBe(2);
    expect(merged.homeRuns).toBe(1);
    expect(merged.games).toBe(2);
  });
});
