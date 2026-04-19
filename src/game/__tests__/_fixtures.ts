import { createInitialState } from '../setup';
import type {
  City,
  GameContext,
  GameState,
  HouseRules,
  PlayerInit,
  RouteDef,
  Ticket,
} from '../types';

export const TEST_CITIES: City[] = [
  { id: 'A', name: 'A', x: 0, y: 0 },
  { id: 'B', name: 'B', x: 100, y: 0 },
  { id: 'C', name: 'C', x: 200, y: 0 },
  { id: 'D', name: 'D', x: 200, y: 100 },
  { id: 'E', name: 'E', x: 0, y: 100 },
];

export const TEST_ROUTES: RouteDef[] = [
  // A-B parallel pair
  {
    id: 'A-B-blue',
    from: 'A',
    to: 'B',
    length: 3,
    color: 'blue',
    isFerry: false,
    isTunnel: false,
    locomotivesRequired: 0,
    parallel: 'A-B-red',
  },
  {
    id: 'A-B-red',
    from: 'A',
    to: 'B',
    length: 3,
    color: 'red',
    isFerry: false,
    isTunnel: false,
    locomotivesRequired: 0,
    parallel: 'A-B-blue',
  },
  // Gray route
  {
    id: 'B-C',
    from: 'B',
    to: 'C',
    length: 4,
    color: 'gray',
    isFerry: false,
    isTunnel: false,
    locomotivesRequired: 0,
  },
  // Ferry needs 1 locomotive
  {
    id: 'C-D',
    from: 'C',
    to: 'D',
    length: 2,
    color: 'black',
    isFerry: true,
    isTunnel: false,
    locomotivesRequired: 1,
  },
  // Tunnel
  {
    id: 'D-E',
    from: 'D',
    to: 'E',
    length: 4,
    color: 'orange',
    isFerry: false,
    isTunnel: true,
    locomotivesRequired: 0,
  },
  // Short route, points-table boundary
  {
    id: 'A-C',
    from: 'A',
    to: 'C',
    length: 1,
    color: 'green',
    isFerry: false,
    isTunnel: false,
    locomotivesRequired: 0,
  },
  // Long route (6 = 15 pts)
  {
    id: 'E-A',
    from: 'E',
    to: 'A',
    length: 6,
    color: 'purple',
    isFerry: false,
    isTunnel: false,
    locomotivesRequired: 0,
  },
];

export const TEST_TICKETS: Ticket[] = [
  { id: 'T_A_D', from: 'A', to: 'D', points: 5, isLong: false },
  { id: 'T_B_E', from: 'B', to: 'E', points: 7, isLong: false },
  { id: 'T_C_E', from: 'C', to: 'E', points: 4, isLong: false },
  { id: 'T_A_B', from: 'A', to: 'B', points: 3, isLong: false },
  { id: 'T_C_D', from: 'C', to: 'D', points: 4, isLong: false },
  { id: 'T_B_D', from: 'B', to: 'D', points: 5, isLong: false },
  { id: 'T_E_C', from: 'E', to: 'C', points: 6, isLong: false },
  { id: 'T_A_E', from: 'A', to: 'E', points: 15, isLong: true },
  { id: 'T_E_B', from: 'E', to: 'B', points: 12, isLong: true },
];

export function makeTestCtx(): GameContext {
  const routesById: Record<string, RouteDef> = {};
  for (const r of TEST_ROUTES) routesById[r.id] = r;

  const ticketsById: Record<string, Ticket> = {};
  for (const t of TEST_TICKETS) ticketsById[t.id] = t;

  const citiesById: Record<string, City> = {};
  for (const c of TEST_CITIES) citiesById[c.id] = c;

  const routesByCity: Record<string, string[]> = {};
  for (const r of TEST_ROUTES) {
    (routesByCity[r.from] ??= []).push(r.id);
    (routesByCity[r.to] ??= []).push(r.id);
  }

  return {
    routes: TEST_ROUTES,
    routesById,
    tickets: TEST_TICKETS,
    ticketsById,
    shortTicketIds: TEST_TICKETS.filter((t) => !t.isLong).map((t) => t.id),
    longTicketIds: TEST_TICKETS.filter((t) => t.isLong).map((t) => t.id),
    cities: TEST_CITIES,
    citiesById,
    routesByCity,
  };
}

export const TEST_HOUSE_RULES: HouseRules = {
  infiniteCards: true,
  infiniteStations: false,
  allowCardTrading: false,
};

export const P1_INIT: PlayerInit = {
  profileId: 'prof-p1',
  name: 'Игрок 1',
  emoji: '🦊',
  color: 'red',
};

export const P2_INIT: PlayerInit = {
  profileId: 'prof-p2',
  name: 'Игрок 2',
  emoji: '🐺',
  color: 'blue',
};

export interface TestSetupOpts {
  seed?: number;
  houseRules?: Partial<HouseRules>;
}

export function makeTestState(opts: TestSetupOpts = {}): {
  state: GameState;
  ctx: GameContext;
} {
  const ctx = makeTestCtx();
  const state = createInitialState({
    gameId: 'g-test',
    seed: opts.seed ?? 42,
    houseRules: { ...TEST_HOUSE_RULES, ...(opts.houseRules ?? {}) },
    players: { p1: P1_INIT, p2: P2_INIT },
    ctx,
    now: 1_700_000_000_000,
  });
  return { state, ctx };
}

/**
 * Skip the initial ticket-pick phase: keep all 4 dealt tickets for both players,
 * leaving state in a fresh `phase: 'idle'` for p1's first real turn.
 */
export function skipInitialTickets(
  state: GameState,
  applyAction: (s: GameState, a: any, actor: any, c: GameContext) => GameState,
  ctx: GameContext,
): GameState {
  let s = state;
  for (const actor of ['p1', 'p2'] as const) {
    if (s.phase !== 'pickingTickets') continue;
    if (s.turn !== actor) continue;
    const keep = s.players[actor].pendingTickets.map((t) => t.id);
    s = applyAction(s, { type: 'KEEP_TICKETS', keep }, actor, ctx);
  }
  return s;
}
