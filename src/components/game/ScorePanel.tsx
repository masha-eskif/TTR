import { useGameStore } from '../../hooks/useGameStore';

export function ScorePanel() {
  const state = useGameStore((s) => s.state);
  if (!state) return null;

  const p1 = state.players.p1;
  const p2 = state.players.p2;

  return (
    <div className="panel">
      <div className="scoreline">
        <div className="scoreline__player">
          <span className="scoreline__emoji">{p1.emoji}</span>
          <div>
            <div className="scoreline__name">{p1.name}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {p1.color === 'red' ? 'красный' : 'синий'}
            </div>
          </div>
          <span className="scoreline__score">{p1.score}</span>
        </div>
        <span className="scoreline__divider">vs</span>
        <div className="scoreline__player">
          <span className="scoreline__score">{p2.score}</span>
          <div style={{ textAlign: 'right' }}>
            <div className="scoreline__name">{p2.name}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {p2.color === 'red' ? 'красный' : 'синий'}
            </div>
          </div>
          <span className="scoreline__emoji">{p2.emoji}</span>
        </div>
      </div>
    </div>
  );
}
