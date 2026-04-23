import type { CardColor } from '../../game/types';
import { useGameStore } from '../../hooks/useGameStore';
import { cardColorName } from '../../i18n/ru';
import { TrainCardArt } from './TrainCardArt';

export function FaceUpMarket() {
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  if (!state) return null;

  const isMyPhase =
    state.phase === 'idle' || state.phase === 'drawingCards';

  function drawSlot(slot: 0 | 1 | 2 | 3 | 4, card: CardColor) {
    if (!isMyPhase) return;
    if (state!.phase === 'drawingCards' && card === 'locomotive') return;
    dispatch({ type: 'DRAW_FROM_MARKET', slot });
  }

  function drawDeck() {
    if (!isMyPhase) return;
    dispatch({ type: 'DRAW_FROM_DECK' });
  }

  return (
    <div className="panel">
      <h3 className="panel__title">Рынок карт</h3>
      <div className="market">
        <div className="market__row">
          {state.faceUpMarket.map((c, i) => {
            const disabled =
              !isMyPhase ||
              (state.phase === 'drawingCards' && c === 'locomotive');
            return (
              <button
                key={i}
                type="button"
                className={`market-slot${disabled ? ' market-slot--disabled' : ''}`}
                onClick={() => drawSlot(i as 0 | 1 | 2 | 3 | 4, c)}
                title={cardColorName(c)}
                disabled={disabled}
              >
                <TrainCardArt color={c} />
              </button>
            );
          })}
          <button
            type="button"
            className={`market-deck${!isMyPhase ? ' market-slot--disabled' : ''}`}
            onClick={drawDeck}
            title="Взять вслепую из колоды"
            disabled={!isMyPhase}
          >
            колода
          </button>
        </div>
      </div>
    </div>
  );
}
