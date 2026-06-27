import type { HitType, OutType } from '../types/baseball';

// ========== 型定義 ==========

export interface AtBatLog {
  batterId: string;
  pitcherId: string;
  result: 'hit' | 'out' | 'walk' | 'hbp' | 'stolen_base' | 'wild_pitch' | 'passed_ball' | null;
  hitType?: HitType;
  outType?: OutType;
  rbis: number;
  pitchCount: number;
  stolenBase?: boolean;
  caughtStealing?: boolean;
}

export interface PitchingLog {
  pitcherId: string;
  pitchCount: number;
  strikeouts: number;
  walks: number;
  hitsAllowed: number;
  earnedRuns: number;
  outsRecorded: number; // 3アウト = 1投球回
}

export interface BattingStats {
  playerId: string;
  games: number;
  atBats: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbis: number;
  walks: number;
  hitByPitch: number;
  strikeouts: number;
  stolenBases: number;
  caughtStealing: number;
  battingAverage: number;
  sluggingPct: number;
  onBasePct: number;
}

export interface PitchingStats {
  playerId: string;
  games: number;
  pitchCount: number;
  outsRecorded: number;
  inningsPitched: number;
  earnedRuns: number;
  strikeouts: number;
  walks: number;
  hitsAllowed: number;
  era: number;
}

export interface GameRecord {
  gameId: string;
  date: string;
  homeTeamName: string;
  visitorTeamName: string;
  score: { home: number; visitor: number };
  atBats: AtBatLog[];
  pitchingLogs: PitchingLog[];
}

// ========== 打撃成績集計 ==========

export function aggregateBattingStats(playerId: string, logs: AtBatLog[]): BattingStats {
  const mine = logs.filter(l => l.batterId === playerId);

  let atBats = 0, hits = 0, singles = 0, doubles = 0, triples = 0, homeRuns = 0;
  let rbis = 0, walks = 0, hbp = 0, strikeouts = 0, sb = 0, cs = 0;

  for (const l of mine) {
    if (l.result === 'walk') { walks++; continue; }
    if (l.result === 'hbp')  { hbp++;   continue; }
    if (l.result === 'stolen_base') { if (l.stolenBase) sb++; if (l.caughtStealing) cs++; continue; }
    if (l.result === 'wild_pitch' || l.result === 'passed_ball') continue;

    atBats++;
    rbis += l.rbis;

    if (l.result === 'hit') {
      hits++;
      if (l.hitType === 'single' || l.hitType === 'infield_single') singles++;
      else if (l.hitType === 'double') doubles++;
      else if (l.hitType === 'triple') triples++;
      else if (l.hitType === 'homerun') homeRuns++;
    } else if (l.result === 'out') {
      if (l.outType === 'strikeout_swing' || l.outType === 'strikeout_look') strikeouts++;
    }
  }

  const battingAverage = atBats > 0 ? hits / atBats : 0;
  const totalBases = singles + doubles * 2 + triples * 3 + homeRuns * 4;
  const sluggingPct = atBats > 0 ? totalBases / atBats : 0;
  const plateAppearances = atBats + walks + hbp;
  const onBasePct = plateAppearances > 0 ? (hits + walks + hbp) / plateAppearances : 0;

  return {
    playerId, games: 0,
    atBats, hits, singles, doubles, triples, homeRuns,
    rbis, walks, hitByPitch: hbp, strikeouts, stolenBases: sb, caughtStealing: cs,
    battingAverage, sluggingPct, onBasePct,
  };
}

// ========== 投手成績集計 ==========

export function aggregatePitchingStats(playerId: string, logs: PitchingLog[]): PitchingStats {
  const mine = logs.filter(l => l.pitcherId === playerId);

  let pitchCount = 0, outsRecorded = 0, earnedRuns = 0, strikeouts = 0, walks = 0, hitsAllowed = 0;

  for (const l of mine) {
    pitchCount    += l.pitchCount;
    outsRecorded  += l.outsRecorded;
    earnedRuns    += l.earnedRuns;
    strikeouts    += l.strikeouts;
    walks         += l.walks;
    hitsAllowed   += l.hitsAllowed;
  }

  const inningsPitched = outsRecorded / 3;
  const era = inningsPitched > 0 ? (earnedRuns * 9) / inningsPitched : 0;

  return {
    playerId, games: mine.length,
    pitchCount, outsRecorded, inningsPitched,
    earnedRuns, strikeouts, walks, hitsAllowed, era,
  };
}

// ========== 複数試合の統合 ==========

export function mergeCareerStats(playerId: string, gameAtBats: AtBatLog[][]): BattingStats {
  const allLogs = gameAtBats.flat();
  const stats = aggregateBattingStats(playerId, allLogs);
  const gamesPlayed = gameAtBats.filter(g => g.some(l => l.batterId === playerId)).length;
  return { ...stats, games: gamesPlayed };
}

// ========== LocalStorage永続化 ==========

const STORAGE_KEY = 'baseball_score_records';

export function loadGameRecords(): GameRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GameRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveGameRecord(record: GameRecord): void {
  const records = loadGameRecords();
  // 同じgameIdは上書き
  const idx = records.findIndex(r => r.gameId === record.gameId);
  if (idx >= 0) records[idx] = record;
  else records.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function exportRecordsAsJson(): void {
  const records = loadGameRecords();
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `baseball_records_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importRecordsFromJson(file: File): Promise<GameRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target?.result as string) as GameRecord[];
        // 既存と統合（重複はgameIdで除外）
        const existing = loadGameRecords();
        const merged = [...existing];
        for (const r of data) {
          if (!merged.find(x => x.gameId === r.gameId)) merged.push(r);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        resolve(merged);
      } catch {
        reject(new Error('JSONの読み込みに失敗したわ'));
      }
    };
    reader.readAsText(file);
  });
}
