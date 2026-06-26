import { useState } from 'react';
import type { HitType, OutType, PitchType, Runner } from '../../types/baseball';
import styles from './PlayInputPanel.module.css';

export type PlayInputMode = 'pitch' | 'result' | 'runner';

export interface PlayInput {
  pitches: { type: PitchType; result: 'ball' | 'strike' | 'foul' }[];
  resultType: 'hit' | 'out' | 'walk' | 'hbp' | 'stolen_base' | 'wild_pitch' | 'passed_ball' | null;
  hitType?: HitType;
  outType?: OutType;
}

interface Props {
  onCommit: (input: PlayInput) => void;
  runners: Runner[];
}

const PITCH_TYPES: { key: PitchType; label: string }[] = [
  { key: 'straight', label: '直球' },
  { key: 'curve',    label: 'カーブ' },
  { key: 'slider',   label: 'スライダー' },
  { key: 'fork',     label: 'フォーク' },
  { key: 'changeup', label: 'チェンジアップ' },
  { key: 'other',    label: 'その他' },
];

const HIT_TYPES: { key: HitType; label: string; emoji: string }[] = [
  { key: 'single',        label: '単打',   emoji: '①' },
  { key: 'double',        label: '二塁打', emoji: '②' },
  { key: 'triple',        label: '三塁打', emoji: '③' },
  { key: 'homerun',       label: 'ホームラン', emoji: '⚾' },
  { key: 'infield_single',label: '内野安打', emoji: '①' },
];

const OUT_TYPES: { key: OutType; label: string }[] = [
  { key: 'strikeout_swing', label: '三振（空振り）' },
  { key: 'strikeout_look',  label: '三振（見逃し）' },
  { key: 'groundout',       label: 'ゴロアウト' },
  { key: 'flyout',          label: 'フライアウト' },
  { key: 'lineout',         label: 'ライナー' },
  { key: 'popup',           label: 'ポップフライ' },
  { key: 'sacrifice_bunt',  label: '送りバント' },
  { key: 'sacrifice_fly',   label: '犠牲フライ' },
  { key: 'double_play',     label: '併殺打' },
  { key: 'fielders_choice', label: 'フィルダースチョイス' },
];

export function PlayInputPanel({ onCommit, runners }: Props) {
  const [mode, setMode] = useState<PlayInputMode>('pitch');
  const [pitches, setPitches] = useState<PlayInput['pitches']>([]);
  const [selectedPitchType, setSelectedPitchType] = useState<PitchType>('straight');
  const [resultType, setResultType] = useState<PlayInput['resultType']>(null);
  const [hitType, setHitType] = useState<HitType | undefined>();
  const [outType, setOutType] = useState<OutType | undefined>();

  const addPitch = (result: 'ball' | 'strike' | 'foul') => {
    setPitches(prev => [...prev, { type: selectedPitchType, result }]);
  };

  const handleCommit = () => {
    if (!resultType) return;
    onCommit({ pitches, resultType, hitType, outType });
    // リセット
    setPitches([]);
    setResultType(null);
    setHitType(undefined);
    setOutType(undefined);
    setMode('pitch');
  };

  return (
    <div className={styles.panel}>
      {/* タブ */}
      <div className={styles.tabs}>
        {(['pitch', 'result', 'runner'] as const).map(tab => (
          <button
            key={tab}
            className={`${styles.tab} ${mode === tab ? styles.active : ''}`}
            onClick={() => setMode(tab)}
          >
            {tab === 'pitch' ? `投球 (${pitches.length})` : tab === 'result' ? '結果' : '走者'}
          </button>
        ))}
      </div>

      {/* 投球入力 */}
      {mode === 'pitch' && (
        <div className={styles.section}>
          <div className={styles.pitchTypeGrid}>
            {PITCH_TYPES.map(p => (
              <button
                key={p.key}
                className={`btn btn-navy ${styles.pitchTypeBtn} ${selectedPitchType === p.key ? styles.selectedType : ''}`}
                onClick={() => setSelectedPitchType(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className={styles.pitchResultRow}>
            <button className="btn btn-navy btn-lg" style={{ flex: 1 }} onClick={() => addPitch('ball')}>ボール</button>
            <button className="btn btn-full" style={{ flex: 1, background: 'var(--accent-gold)', color: 'var(--navy-900)' }} onClick={() => addPitch('strike')}>ストライク</button>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => addPitch('foul')}>ファウル</button>
          </div>
          {pitches.length > 0 && (
            <div className={styles.pitchLog}>
              {pitches.map((p, i) => (
                <span key={i} className={`${styles.pitchBadge} ${styles[p.result]}`}>
                  {p.result === 'ball' ? 'B' : p.result === 'strike' ? 'S' : 'F'}
                </span>
              ))}
              <button className="btn btn-sm btn-ghost" onClick={() => setPitches(prev => prev.slice(0, -1))}>← 戻す</button>
            </div>
          )}
        </div>
      )}

      {/* 結果入力 */}
      {mode === 'result' && (
        <div className={styles.section}>
          <div className={styles.resultTabs}>
            {(['hit', 'out', 'walk', 'hbp', 'wild_pitch', 'passed_ball', 'stolen_base'] as const).map(r => (
              <button
                key={r}
                className={`btn btn-sm ${resultType === r ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setResultType(r)}
              >
                {r === 'hit' ? '安打' : r === 'out' ? 'アウト' : r === 'walk' ? '四球' : r === 'hbp' ? '死球' : r === 'wild_pitch' ? '暴投' : r === 'passed_ball' ? '捕逸' : '盗塁'}
              </button>
            ))}
          </div>

          {resultType === 'hit' && (
            <div className={styles.subGrid}>
              {HIT_TYPES.map(h => (
                <button
                  key={h.key}
                  className={`btn btn-navy ${hitType === h.key ? styles.selectedType : ''}`}
                  onClick={() => setHitType(h.key)}
                >
                  {h.emoji} {h.label}
                </button>
              ))}
            </div>
          )}

          {resultType === 'out' && (
            <div className={styles.subGrid}>
              {OUT_TYPES.map(o => (
                <button
                  key={o.key}
                  className={`btn btn-navy ${outType === o.key ? styles.selectedType : ''}`}
                  onClick={() => setOutType(o.key)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}

          <button
            className="btn btn-primary btn-full btn-lg"
            style={{ marginTop: 12 }}
            disabled={!resultType || (resultType === 'hit' && !hitType) || (resultType === 'out' && !outType)}
            onClick={handleCommit}
          >
            記録する
          </button>
        </div>
      )}

      {/* 走者タブ（Phase 3で実装） */}
      {mode === 'runner' && (
        <div className={styles.section}>
          <p style={{ color: 'var(--navy-200)', fontSize: 'var(--font-sm)' }}>
            走者移動の入力は安打・出塁後に自動で表示されるわ
          </p>
          {runners.length === 0 && (
            <p style={{ color: 'var(--navy-300)', fontSize: 'var(--font-sm)', marginTop: 8 }}>現在、走者なし</p>
          )}
        </div>
      )}
    </div>
  );
}
