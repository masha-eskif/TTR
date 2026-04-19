// Card and route colors
export type CardColor =
  | 'purple'
  | 'white'
  | 'blue'
  | 'yellow'
  | 'orange'
  | 'black'
  | 'red'
  | 'green'
  | 'locomotive';

export type RouteColor = Exclude<CardColor, 'locomotive'> | 'gray';

// Identifiers
export type PlayerId = 'p1' | 'p2';
export type PlayerColor = 'red' | 'blue';
export type CityId = string;
export type RouteId = string;
export type TicketId = string;

// Static data shapes
export interface City {
  id: CityId;
  name: string;
  x: number;
  y: number;
}

export interface RouteDef {
  id: RouteId;
  from: CityId;
  to: CityId;
  length: number;
  color: RouteColor;
  isFerry: boolean;
  isTunnel: boolean;
  locomotivesRequired: number;
  parallel?: RouteId;
}

export interface Ticket {
  id: TicketId;
  from: CityId;
  to: CityId;
  points: number;
  isLong: boolean;
}

// House rules — frozen at game creation
export interface HouseRules {
  infiniteCards: true;
  infiniteStations: boolean;
  allowCardTrading: boolean;
}

// Per-player state
export type Hand = Record<CardColor, number>;

export interface PlayerState {
  id: PlayerId;
  profileId: string;
  name: string;
  emoji: string;
  color: PlayerColor;
  hand: Hand;
  tickets: Ticket[];
  pendingTickets: Ticket[];
  trainsLeft: number;
  stationsLeft: number;
  stations: CityId[];
  score: number;
}

export interface PlayerInit {
  profileId: string;
  name: string;
  emoji: string;
  color: PlayerColor;
}

// Cards spent for a route claim or station
export interface CardSpend {
  color: CardColor;
  count: number;
}

export interface RouteClaim {
  routeId: RouteId;
  by: PlayerId;
  cardsSpent: CardSpend[];
  turn: number;
}

// Turn FSM phase
export type TurnPhase =
  | 'idle'
  | 'drawingCards'
  | 'pickingTickets'
  | 'tunnelResolution'
  | 'gameOver';

// Tunnel-in-progress state
export interface TunnelPendingState {
  routeId: RouteId;
  proposedCards: CardSpend[];
  extrasDrawn: CardColor[];
  extraCost: number;
  initiator: PlayerId;
}

// Per-turn meta about what happened during the active turn
export interface TurnMeta {
  cardsDrawnThisTurn: number;
  firstDrawWasFaceUpLoco: boolean;
  initialTicketDraw: boolean;
}

// Game log
export interface GameLogEntry {
  t: number;
  player: PlayerId;
  kind: string;
  data?: Record<string, unknown>;
}

// THE game state — single source of truth
export interface GameState {
  version: 1;
  gameId: string;
  createdAt: number;
  lastMoveAt: number;
  seed: number;
  rngCursor: number;
  houseRules: HouseRules;
  players: Record<PlayerId, PlayerState>;
  turn: PlayerId;
  phase: TurnPhase;
  turnNumber: number;
  turnMeta: TurnMeta;
  faceUpMarket: CardColor[];
  ticketDeck: TicketId[];
  longTicketDeck: TicketId[];
  discardedTickets: TicketId[];
  claims: RouteClaim[];
  routeOwner: Record<RouteId, PlayerId>;
  pendingTunnel: TunnelPendingState | null;
  finalRoundTriggeredBy: PlayerId | null;
  finalRoundPlayersRemaining: number;
  log: GameLogEntry[];
}

// Static-data context — DI'd into pure functions instead of being imported
export interface GameContext {
  routes: RouteDef[];
  routesById: Record<RouteId, RouteDef>;
  tickets: Ticket[];
  ticketsById: Record<TicketId, Ticket>;
  shortTicketIds: TicketId[];
  longTicketIds: TicketId[];
  cities: City[];
  citiesById: Record<CityId, City>;
  routesByCity: Record<CityId, RouteId[]>;
}

// Validation result
export type ValidationResult = { ok: true } | { ok: false; reason: string };

// Score breakdown for endgame screen
export interface ScoreBreakdown {
  routePoints: number;
  ticketsCompleted: Ticket[];
  ticketsMissed: Ticket[];
  ticketPointsEarned: number;
  ticketPointsLost: number;
  stationBonus: number;
  globetrotterBonus: number;
  total: number;
  borrowedRoutes: RouteId[];
}
