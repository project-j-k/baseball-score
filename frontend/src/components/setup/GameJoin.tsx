import { useState } from 'react';
import styles from './GameJoin.module.css';

interface Props {
  onCreateNew: () => void;
  onJoin: (gameId: string) => void;
  onShowStats: () => void;
  initialGameId?: string | null;
}

export function GameJoin({ onCreateNew, onJoin, onShowStats, initialGameId }: Props) {
  const [code, setCode] = useState(initialGameId ?? '');
  const [error, setError] = useState('');

  const handleJoin = () => {
    const trimmed = code.trim();
    if (trimmed.length < 4) {
      setError('観戦コードが短いわ（4文字以上）');
      return;
    }
    setError('');
    onJoin(trimmed);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <div className={styles.ball}>⚾</div>
        <h1 className={styles.title}>野球スコア</h1>
        <p className={styles.sub}>試合をリアルタイムで記録・共有するわ</p>
      </div>

      <div className={styles.card}>
        <button className="btn btn-primary btn-full btn-lg" onClick={onCreateNew}>
          ＋ 新しい試合を作成
        </button>

        <div className={styles.divider}>
          <span>または</span>
        </div>

        <div className={styles.joinSection}>
          <label className="label">観戦コードで参加</label>
          <input
            type="text"
            placeholder="コードを入力（例: abc12345）"
            value={code}
            onChange={e => setCode(e.target.value.toLowerCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            autoCapitalize="none"
            autoCorrect="off"
          />
          {error && <p className={styles.error}>{error}</p>}
          <button
            className="btn btn-navy btn-full"
            style={{ marginTop: 8 }}
            onClick={handleJoin}
          >
            参加する
          </button>
        </div>
      </div>

      <p className={styles.note}>
        個人情報は端末外に送信されないわ。選手名もダミー名が使えるわよ。
      </p>

      <button
        className="btn btn-ghost btn-sm"
        style={{ marginTop: 8 }}
        onClick={onShowStats}
      >
        生涯成績を見る
      </button>
    </div>
  );
}
