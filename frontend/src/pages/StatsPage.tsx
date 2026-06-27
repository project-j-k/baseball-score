import { useState, useEffect, useRef } from 'react';
import {
  loadGameRecords, exportRecordsAsJson, importRecordsFromJson,
  aggregateBattingStats, aggregatePitchingStats,
  type GameRecord, type BattingStats, type PitchingStats,
} from '../store/careerStats';
import styles from './StatsPage.module.css';

interface Props {
  onBack: () => void;
}

function fmt(n: number, dec = 3): string {
  if (n === 0) return dec === 3 ? '.000' : '0.00';
  const s = n.toFixed(dec);
  return dec === 3 ? s.replace(/^0/, '') : s;
}

export function StatsPage({ onBack }: Props) {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'batting' | 'pitching' | 'games'>('batting');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecords(loadGameRecords());
  }, []);

  // 全打席ログを統合
  const allAtBats = records.flatMap(r => r.atBats);
  const allPitchingLogs = records.flatMap(r => r.pitchingLogs);

  // 選手IDの一覧
  const batterIds = [...new Set(allAtBats.map(l => l.batterId))];
  const pitcherIds = [...new Set(allPitchingLogs.map(l => l.pitcherId))];

  const battingStats: BattingStats[] = batterIds.map(id => {
    const gamesBatted = records.filter(r => r.atBats.some(l => l.batterId === id)).length;
    return { ...aggregateBattingStats(id, allAtBats), games: gamesBatted };
  }).sort((a, b) => b.atBats - a.atBats);

  const pitchingStats: PitchingStats[] = pitcherIds.map(id => {
    const gamesP = records.filter(r => r.pitchingLogs.some(l => l.pitcherId === id)).length;
    return { ...aggregatePitchingStats(id, allPitchingLogs), games: gamesP };
  }).sort((a, b) => b.inningsPitched - a.inningsPitched);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const merged = await importRecordsFromJson(file).catch(() => null);
    if (merged) setRecords(merged);
    e.target.value = '';
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← 戻る</button>
        <h1 className={styles.title}>生涯成績</h1>
        <div className={styles.headerActions}>
          <button className="btn btn-sm btn-navy" onClick={exportRecordsAsJson}>エクスポート</button>
          <button className="btn btn-sm btn-ghost" onClick={() => fileRef.current?.click()}>インポート</button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryNum}>{records.length}</span>
          <span className={styles.summaryLabel}>試合</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryNum}>{batterIds.length}</span>
          <span className={styles.summaryLabel}>選手</span>
        </div>
      </div>

      <div className={styles.tabs}>
        {(['batting', 'pitching', 'games'] as const).map(tab => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'batting' ? '打撃' : tab === 'pitching' ? '投手' : '試合一覧'}
          </button>
        ))}
      </div>

      {records.length === 0 ? (
        <div className={styles.empty}>
          <p>記録がまだないわ</p>
          <p className={styles.emptyHint}>試合を記録して終了すると自動保存されるわよ</p>
        </div>
      ) : (
        <>
          {activeTab === 'batting' && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>選手</th><th>試</th><th>打</th><th>安</th><th>本</th><th>点</th><th>率</th>
                  </tr>
                </thead>
                <tbody>
                  {battingStats.map(s => (
                    <tr key={s.playerId}>
                      <td className={styles.playerCell}>{s.playerId}</td>
                      <td>{s.games}</td>
                      <td>{s.atBats}</td>
                      <td>{s.hits}</td>
                      <td>{s.homeRuns}</td>
                      <td>{s.rbis}</td>
                      <td className={styles.highlight}>{fmt(s.battingAverage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'pitching' && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>選手</th><th>試</th><th>投球</th><th>回</th><th>三</th><th>自責</th><th>防御率</th>
                  </tr>
                </thead>
                <tbody>
                  {pitchingStats.map(s => (
                    <tr key={s.playerId}>
                      <td className={styles.playerCell}>{s.playerId}</td>
                      <td>{s.games}</td>
                      <td>{s.pitchCount}</td>
                      <td>{s.inningsPitched.toFixed(1)}</td>
                      <td>{s.strikeouts}</td>
                      <td>{s.earnedRuns}</td>
                      <td className={styles.highlight}>{fmt(s.era, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'games' && (
            <div className={styles.gameList}>
              {[...records].reverse().map(r => (
                <div key={r.gameId} className={styles.gameCard}>
                  <div className={styles.gameDate}>{r.date}</div>
                  <div className={styles.gameScore}>
                    <span>{r.visitorTeamName}</span>
                    <span className={styles.scoreNum}>{r.score.visitor} - {r.score.home}</span>
                    <span>{r.homeTeamName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
