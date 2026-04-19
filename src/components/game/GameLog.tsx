import { useGameStore } from '../../hooks/useGameStore';
import type { GameLogEntry, PlayerId } from '../../game/types';

const KIND_RU: Record<string, (e: GameLogEntry) => string> = {
  game_created: () => 'партия создана',
  drew_from_deck: () => 'взял карту из колоды',
  drew_from_market: (e) => `взял карту с рынка (${(e.data as any)?.card ?? '?'})`,
  drew_market_loco: () => 'взял локомотив с рынка (ход использован)',
  drew_tickets: (e) => `взял билеты (${(e.data as any)?.count ?? 3})`,
  kept_tickets: (e) => {
    const d = (e.data as any) ?? {};
    return `оставил ${d.keptCount}, отложил ${d.declinedCount}`;
  },
  claimed_route: (e) => {
    const d = (e.data as any) ?? {};
    return `заклеймил маршрут ${d.routeId} (длина ${d.length}, ${d.color})`;
  },
  tunnel_attempt: (e) => {
    const d = (e.data as any) ?? {};
    return `попытка тоннеля: доплата ${d.extraCost} карт`;
  },
  tunnel_paid: () => 'доплатил и заклеймил тоннель',
  tunnel_canceled: () => 'отказался от тоннеля',
  tunnel_no_extras: () => 'тоннель заклеймлен без доплаты',
  built_station: (e) => `поставил вокзал в ${(e.data as any)?.cityId ?? '?'}`,
  traded_cards: () => 'обмен картами',
  forced_end_turn: () => 'принудительно завершил ход',
  conceded: () => 'сдался',
  final_round_triggered: () => '⚑ последний круг!',
  game_over: () => '🏁 игра окончена',
};

export function GameLog() {
  const state = useGameStore((s) => s.state);
  if (!state) return null;

  const entries = state.log.slice(-40).reverse();

  return (
    <div className="panel">
      <h3 className="panel__title">История</h3>
      <div className="game-log">
        {entries.map((e, i) => (
          <div key={i} className="game-log__entry">
            <span className="game-log__player">
              {state.players[e.player as PlayerId]?.emoji ?? ''}
            </span>{' '}
            {KIND_RU[e.kind] ? KIND_RU[e.kind](e) : e.kind}
          </div>
        ))}
      </div>
    </div>
  );
}
