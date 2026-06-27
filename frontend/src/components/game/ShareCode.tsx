import { useState } from 'react';
import { buildGameUrl } from '../../hooks/socketUtils';
import styles from './ShareCode.module.css';

interface Props {
  gameId: string;
  connectedUsers: number;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export function ShareCode({ gameId, connectedUsers, connectionStatus }: Props) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const shareUrl = buildGameUrl(gameId, window.location.href);

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl).catch(() => {
      // フォールバック
      navigator.clipboard.writeText(gameId);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColor = {
    connected: 'var(--accent-green-lt)',
    connecting: 'var(--accent-orange)',
    disconnected: 'var(--navy-400)',
    error: 'var(--accent-red)',
  }[connectionStatus];

  const statusLabel = {
    connected: `${connectedUsers}人接続中`,
    connecting: '接続中…',
    disconnected: 'オフライン',
    error: '接続エラー',
  }[connectionStatus];

  return (
    <div className={styles.wrap}>
      <button className={styles.statusBtn} onClick={() => setExpanded(e => !e)}>
        <span className={styles.dot} style={{ background: statusColor }} />
        <span className={styles.statusText}>{statusLabel}</span>
        <span className={styles.arrow}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className={styles.panel}>
          <div className={styles.codeRow}>
            <div className={styles.codeBox}>
              <span className={styles.codeLabel}>観戦コード</span>
              <span className={styles.code}>{gameId}</span>
            </div>
            <button className="btn btn-sm btn-navy" onClick={copy}>
              {copied ? '✓ コピー済み' : 'URLコピー'}
            </button>
          </div>
          <p className={styles.hint}>
            このコードを父兄・スタッフに共有するとリアルタイムで試合を見られるわ
          </p>
        </div>
      )}
    </div>
  );
}
