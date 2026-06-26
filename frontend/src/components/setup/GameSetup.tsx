import { useState } from 'react';
import type { GameConfig, Team, Player } from '../../types/baseball';
import styles from './GameSetup.module.css';

interface Props {
  onStart: (homeTeam: Team, visitorTeam: Team, config: GameConfig) => void;
}

const DUMMY_NAMES = [
  '選手A', '選手B', '選手C', '選手D', '選手E',
  '選手F', '選手G', '選手H', '選手I',
];

function generatePlayers(teamId: string, count = 9): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${teamId}-${i + 1}`,
    number: i + 1,
    name: DUMMY_NAMES[i] || `選手${i + 1}`,
  }));
}

function createDefaultTeam(side: 'home' | 'visitor'): Team {
  const id = side === 'home' ? 'home' : 'visitor';
  const players = generatePlayers(id);
  return {
    id,
    name: side === 'home' ? '' : '',
    side,
    players,
    battingOrder: players.map(p => p.id),
    currentBatterIndex: 0,
  };
}

const DEFAULT_CONFIG: GameConfig = {
  maxInnings: 7,
  coldGameEnabled: true,
  coldGameDifference: 10,
  coldGameInning: 5,
  mercyEnabled: true,
};

export function GameSetup({ onStart }: Props) {
  const [homeTeam, setHomeTeam] = useState<Team>(createDefaultTeam('home'));
  const [visitorTeam, setVisitorTeam] = useState<Team>(createDefaultTeam('visitor'));
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'home' | 'visitor' | 'config'>('config');

  const updateTeamName = (side: 'home' | 'visitor', name: string) => {
    if (side === 'home') setHomeTeam(t => ({ ...t, name }));
    else setVisitorTeam(t => ({ ...t, name }));
  };

  const updatePlayerNumber = (team: Team, setTeam: React.Dispatch<React.SetStateAction<Team>>, playerId: string, number: number) => {
    setTeam(t => ({
      ...t,
      players: t.players.map(p => p.id === playerId ? { ...p, number } : p),
    }));
  };

  const updatePlayerName = (team: Team, setTeam: React.Dispatch<React.SetStateAction<Team>>, playerId: string, name: string) => {
    setTeam(t => ({
      ...t,
      players: t.players.map(p => p.id === playerId ? { ...p, name: name || DUMMY_NAMES[t.players.indexOf(t.players.find(x => x.id === playerId)!)] || `選手${t.players.findIndex(x => x.id === playerId) + 1}` } : p),
    }));
  };

  const addPlayer = (setTeam: React.Dispatch<React.SetStateAction<Team>>) => {
    setTeam(t => {
      const i = t.players.length;
      const newPlayer: Player = { id: `${t.id}-${Date.now()}`, number: i + 1, name: DUMMY_NAMES[i] || `選手${i + 1}` };
      return { ...t, players: [...t.players, newPlayer], battingOrder: [...t.battingOrder, newPlayer.id] };
    });
  };

  const TeamEditor = ({ team, setTeam }: { team: Team; setTeam: React.Dispatch<React.SetStateAction<Team>> }) => (
    <div className={styles.teamEditor}>
      <div className={styles.field}>
        <label className="label">チーム名（空欄可）</label>
        <input
          type="text"
          placeholder={team.side === 'home' ? '自チーム名' : '相手チーム名'}
          value={team.name}
          onChange={e => updateTeamName(team.side, e.target.value)}
        />
      </div>
      <div className={styles.playerList}>
        <div className={styles.playerHeader}>
          <span>背番号</span>
          <span>名前（任意・ダミー名自動入力）</span>
        </div>
        {team.players.map((p, i) => (
          <div key={p.id} className={styles.playerRow}>
            <span className={styles.orderNum}>{i + 1}番</span>
            <input
              type="number"
              className={styles.numInput}
              value={p.number}
              min={0}
              max={99}
              onChange={e => updatePlayerNumber(team, setTeam, p.id, Number(e.target.value))}
            />
            <input
              type="text"
              placeholder={DUMMY_NAMES[i] || `選手${i + 1}`}
              value={p.name.startsWith('選手') ? '' : p.name}
              onChange={e => updatePlayerName(team, setTeam, p.id, e.target.value)}
            />
          </div>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => addPlayer(setTeam)}>＋ 選手追加</button>
    </div>
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>⚾ 試合設定</h1>
        <p className={styles.sub}>背番号と名前を入力して試合を開始するわ</p>
      </div>

      <div className={styles.tabs}>
        {(['config', 'visitor', 'home'] as const).map(tab => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'config' ? '試合設定' : tab === 'visitor' ? '相手チーム' : '自チーム'}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {activeTab === 'config' && (
          <div className={styles.configSection}>
            <div className={styles.field}>
              <label className="label">イニング数</label>
              <div className={styles.inningRow}>
                {[7, 9].map(n => (
                  <button
                    key={n}
                    className={`btn ${config.maxInnings === n ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1 }}
                    onClick={() => setConfig(c => ({ ...c, maxInnings: n }))}
                  >
                    {n}回制
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className="label">コールドゲーム</label>
              <div className={styles.toggleRow}>
                <button
                  className={`btn ${config.coldGameEnabled ? 'btn-success' : 'btn-ghost'}`}
                  style={{ flex: 1 }}
                  onClick={() => setConfig(c => ({ ...c, coldGameEnabled: !c.coldGameEnabled }))}
                >
                  {config.coldGameEnabled ? '有効' : '無効'}
                </button>
              </div>
              {config.coldGameEnabled && (
                <div className={styles.coldGameDetail}>
                  <div className={styles.coldRow}>
                    <label className="label" style={{ marginBottom: 0 }}>発動イニング（終了後）</label>
                    <input
                      type="number"
                      className={styles.smallInput}
                      value={config.coldGameInning}
                      min={3} max={8}
                      onChange={e => setConfig(c => ({ ...c, coldGameInning: Number(e.target.value) }))}
                    />
                    <span>回</span>
                  </div>
                  <div className={styles.coldRow}>
                    <label className="label" style={{ marginBottom: 0 }}>得点差</label>
                    <input
                      type="number"
                      className={styles.smallInput}
                      value={config.coldGameDifference}
                      min={5} max={20}
                      onChange={e => setConfig(c => ({ ...c, coldGameDifference: Number(e.target.value) }))}
                    />
                    <span>点</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'visitor' && (
          <TeamEditor team={visitorTeam} setTeam={setVisitorTeam} />
        )}

        {activeTab === 'home' && (
          <TeamEditor team={homeTeam} setTeam={setHomeTeam} />
        )}
      </div>

      <div className={styles.footer}>
        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={() => onStart(homeTeam, visitorTeam, config)}
        >
          試合開始
        </button>
      </div>
    </div>
  );
}
