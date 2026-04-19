import type { PlayerState } from '../../game/types';

interface Props {
  opponent: PlayerState;
}

export function OpponentPanel({ opponent }: Props) {
  const handSize = Object.values(opponent.hand).reduce((a, b) => a + b, 0);
  return (
    <div className="panel">
      <h3 className="panel__title">
        {opponent.emoji} {opponent.name}
      </h3>
      <div className="panel__row">
        <span className="muted">Карт в руке</span>
        <b>{handSize}</b>
      </div>
      <div className="panel__row">
        <span className="muted">Билетов</span>
        <b>{opponent.tickets.length}</b>
      </div>
      <div className="panel__row">
        <span className="muted">Вагонов</span>
        <b>{opponent.trainsLeft}</b>
      </div>
      <div className="panel__row">
        <span className="muted">Вокзалов</span>
        <b>{opponent.stationsLeft}</b>
      </div>
      <div className="panel__row">
        <span className="muted">Очки</span>
        <b>{opponent.score}</b>
      </div>
    </div>
  );
}
