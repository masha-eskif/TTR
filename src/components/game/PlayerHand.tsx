import type { PlayerState } from '../../game/types';
import { ALL_CARD_COLORS } from '../../game/constants';
import { cardColorName } from '../../i18n/ru';
import { TrainCardArt } from './TrainCardArt';

interface Props {
  player: PlayerState;
  title?: string;
}

export function PlayerHand({ player, title }: Props) {
  return (
    <div className="panel">
      {title && <h3 className="panel__title">{title}</h3>}
      <div className="hand-grid">
        {ALL_CARD_COLORS.map((c) => {
          const count = player.hand[c];
          const disabled = count === 0;
          return (
            <div
              key={c}
              className={`hand-card${disabled ? ' hand-card--disabled' : ''}`}
              title={`${cardColorName(c)} × ${count}`}
            >
              <TrainCardArt color={c} width={70} height={98} />
              <span className="hand-card__count">×{count}</span>
            </div>
          );
        })}
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
