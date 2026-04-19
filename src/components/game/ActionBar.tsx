import { useGameStore } from '../../hooks/useGameStore';
import { STRINGS } from '../../i18n/ru';
import { Button } from '../common/Button';

interface Props {
  onOpenTrade: () => void;
}

export function ActionBar({ onOpenTrade }: Props) {
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  const endCurrentGame = useGameStore((s) => s.endCurrentGame);
  if (!state) return null;

  const canDrawTickets = state.phase === 'idle';
  const canTrade =
    state.houseRules.allowCardTrading && state.phase === 'idle';

  return (
    <div className="panel">
      <h3 className="panel__title">Действия</h3>
      <div className="action-bar">
        <Button
          variant="primary"
          onClick={() => dispatch({ type: 'DRAW_TICKETS' })}
          disabled={!canDrawTickets}
          size="sm"
        >
          {STRINGS.game.drawTickets}
        </Button>
        {canTrade && (
          <Button variant="secondary" onClick={onOpenTrade} size="sm">
            {STRINGS.game.tradeCards}
          </Button>
        )}
        <Button
          variant="danger"
          onClick={() => {
            if (!confirm('Завершить партию? Она будет удалена.')) return;
            endCurrentGame();
          }}
          size="sm"
        >
          {STRINGS.game.concede}
        </Button>
      </div>
      <p className="faint mt-sm" style={{ fontSize: 12 }}>
        Клик по маршруту — заклеймить.{' '}
        Клик по городу — поставить вокзал.{' '}
        Клик по карте рынка / колоде — взять карту.
      </p>
    </div>
  );
}
