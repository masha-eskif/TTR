import type { CardColor, CardSpend, CityId, RouteId, TicketId } from './types';

export type Action =
  | { type: 'DRAW_FROM_MARKET'; slot: 0 | 1 | 2 | 3 | 4 }
  | { type: 'DRAW_FROM_DECK' }
  | { type: 'DRAW_TICKETS' }
  | { type: 'KEEP_TICKETS'; keep: TicketId[] }
  | { type: 'CLAIM_ROUTE'; routeId: RouteId; cards: CardSpend[] }
  | { type: 'TUNNEL_CONFIRM'; extraCards: CardSpend[] }
  | { type: 'TUNNEL_CANCEL' }
  | { type: 'BUILD_STATION'; cityId: CityId; cards: CardSpend[] }
  | {
      type: 'TRADE_CARDS';
      give: Partial<Record<CardColor, number>>;
      receive: Partial<Record<CardColor, number>>;
    }
  | { type: 'END_TURN_FORCED' }
  | { type: 'CONCEDE' };

export type ActionType = Action['type'];
