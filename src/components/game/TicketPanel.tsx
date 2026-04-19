import { isTicketComplete } from '../../game/graph';
import type { GameContext, GameState, PlayerId } from '../../game/types';
import { evaluateOptimalBorrow } from '../../game/graph';

interface Props {
  state: GameState;
  ctx: GameContext;
  playerId: PlayerId;
  title?: string;
}

export function TicketPanel({ state, ctx, playerId, title }: Props) {
  const player = state.players[playerId];

  // Use the optimal-borrow evaluator so that station-aided tickets read as complete.
  const borrow = evaluateOptimalBorrow(playerId, state, ctx);
  const completedIds = new Set(borrow.completed.map((t) => t.id));

  return (
    <div className="panel">
      <h3 className="panel__title">{title ?? 'Билеты'}</h3>
      {player.tickets.length === 0 && (
        <p className="muted" style={{ fontSize: 13 }}>нет билетов</p>
      )}
      <div className="ticket-list">
        {player.tickets.map((t) => {
          const done = completedIds.has(t.id);
          const fromName = ctx.citiesById[t.from]?.name ?? t.from;
          const toName = ctx.citiesById[t.to]?.name ?? t.to;
          return (
            <div
              key={t.id}
              className={`ticket${done ? ' ticket--done' : ''}${t.isLong ? ' ticket--long' : ''}`}
            >
              <div>
                <div className="ticket__route">
                  {fromName} → {toName}
                </div>
                <div className="ticket__status">
                  {done ? '✓ выполнен' : '✗ не выполнен'}
                  {t.isLong && ' · длинный'}
                </div>
              </div>
              <div className="ticket__points">{t.points}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { isTicketComplete };
