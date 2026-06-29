import { useState } from 'react';
import styles from './StatsPasscode.module.css';

interface Props {
  onUnlock: () => void;
  onBack: () => void;
}

// VITE_STATS_PASSCODE_HASH が未設定ならロックなし
const HASH = import.meta.env.VITE_STATS_PASSCODE_HASH as string | undefined;

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function StatsPasscode({ onUnlock, onBack }: Props) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  // ハッシュ未設定→ロックなし
  if (!HASH) {
    onUnlock();
    return null;
  }

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setChecking(true);
    const hash = await sha256hex(input.trim());
    if (hash === HASH.toLowerCase()) {
      onUnlock();
    } else {
      setError('合言葉が違うわ');
      setInput('');
    }
    setChecking(false);
  };

  return (
    <div className={styles.wrap}>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        ← 戻る
      </button>
      <div className={styles.card}>
        <div className={styles.icon}>🔒</div>
        <h2 className={styles.title}>生涯成績</h2>
        <p className={styles.sub}>合言葉を入力してね</p>
        <input
          type="password"
          className={styles.input}
          placeholder="合言葉"
          value={input}
          onChange={e => { setInput(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        {error && <p className={styles.error}>{error}</p>}
        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={handleSubmit}
          disabled={checking || !input.trim()}
        >
          {checking ? '確認中…' : '開く'}
        </button>
      </div>
    </div>
  );
}
