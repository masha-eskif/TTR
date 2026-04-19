import { useGameStore } from '../../hooks/useGameStore';

const COLORS: Record<string, string> = {
  connected: '#2a7a2a',
  'waiting-for-peer': '#c98a22',
  connecting: '#c98a22',
  disconnected: '#a33',
  error: '#a33',
  idle: 'var(--ink-faint)',
};

const LABELS: Record<string, string> = {
  connected: 'онлайн',
  'waiting-for-peer': 'ожидание',
  connecting: 'подключение…',
  disconnected: 'оффлайн',
  error: 'ошибка',
  idle: 'офлайн',
};

export function ConnectionBadge() {
  const mode = useGameStore((s) => s.mode);
  const status = useGameStore((s) => s.connectionStatus);
  const code = useGameStore((s) => s.roomCode);

  if (mode === 'offline') return null;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 10px',
        borderRadius: 999,
        background: 'var(--bg-card)',
        border: '1px solid var(--line-soft)',
        fontSize: 12,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: COLORS[status] ?? 'gray',
        }}
      />
      <span>{LABELS[status] ?? status}</span>
      <span className="faint">· {code}</span>
    </div>
  );
}
