import type { CardColor } from './types';

export const STARTING_TRAINS = 45;
export const STARTING_STATIONS = 3;
export const ENDGAME_TRIGGER_THRESHOLD = 2; // ≤2 trains triggers final round
export const STARTING_HAND_SIZE = 4;
export const FACE_UP_MARKET_SIZE = 5;
export const FACE_UP_LOCO_RESHUFFLE = 3;
export const TUNNEL_DRAW_COUNT = 3;
export const STATION_END_BONUS = 4;
export const GLOBETROTTER_BONUS = 10;

// Cards required to build the Nth station (1st = 1, 2nd = 2, 3rd = 3 — same color)
export const STATION_BUILD_COST: Record<number, number> = { 1: 1, 2: 2, 3: 3 };

// Route length → victory points (TTR Europe)
export const ROUTE_POINTS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 10,
  6: 15,
  7: 18,
  8: 21,
};

// Ticket draw rules
export const INITIAL_LONG_TICKETS_DEALT = 1;
export const INITIAL_SHORT_TICKETS_DEALT = 3;
export const INITIAL_TICKETS_KEEP_MIN = 2;
export const MIDGAME_SHORT_TICKETS_DEALT = 3;
export const MIDGAME_TICKETS_KEEP_MIN = 1;

// Final round bookkeeping (active player's last turn + opponent's last turn)
export const FINAL_ROUND_PLAYERS_REMAINING = 2;

// Canonical TTR Europe deck distribution (110 cards: 8 colors × 12 + 14 locomotives)
export const CARD_DISTRIBUTION: Record<CardColor, number> = {
  purple: 12,
  white: 12,
  blue: 12,
  yellow: 12,
  orange: 12,
  black: 12,
  red: 12,
  green: 12,
  locomotive: 14,
};

export const ALL_CARD_COLORS: CardColor[] = [
  'purple',
  'white',
  'blue',
  'yellow',
  'orange',
  'black',
  'red',
  'green',
  'locomotive',
];

export const NON_LOCO_COLORS = ALL_CARD_COLORS.filter(
  (c) => c !== 'locomotive',
) as Exclude<CardColor, 'locomotive'>[];

export const EMPTY_HAND: Record<CardColor, number> = {
  purple: 0,
  white: 0,
  blue: 0,
  yellow: 0,
  orange: 0,
  black: 0,
  red: 0,
  green: 0,
  locomotive: 0,
};
