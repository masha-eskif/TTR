import type { CardColor, PlayerState } from '../../game/types';
import { ALL_CARD_COLORS } from '../../game/constants';
import { cardColorName } from '../../i18n/ru';

interface Props {
  player: PlayerState;
  title?: string;
}

export function PlayerHand({ player, title }: Props) {
  return (
    <div className="panel">
      {title && <h3 className="panel__title">{title}</h3>}
      <div className="hand-grid">
        {ALL_CARD_COLORS.map((c) => (
          <div
            key={c}
            className={`hand-chip card-chip--${c}${player.hand[c] === 0 ? ' hand-chip--disabled' : ''}`}
            title={cardColorName(c)}
          >
            <span>{labelFor(c)}</span>
            <span className="hand-chip__count">×{player.hand[c]}</span>
          </div>
        ))}
      </div>
      <div className="panel__row mt-sm">
        <span className="muted">Вагонов</span>
        <b>{player.trainsLeft}</b>
      </div>
      <div className="panel__row">
        <span className="muted">Вокзалов</span>
        <b>{player.stationsLeft}</b>
      </div>
    </div>
  );
}

function labelFor(c: CardColor): string {
  if (c === 'locomotive') return '🚂';
  return cardColorName(c).slice(0, 3);
}
