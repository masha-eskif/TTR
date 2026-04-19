import type {
  CityId,
  GameContext,
  GameState,
  PlayerId,
  RouteId,
  Ticket,
} from './types';

/**
 * Build adjacency for a player given:
 *  - all routes they personally claimed
 *  - any opponent routes they "borrow" via a station they placed in one endpoint
 */
function buildAdjacency(
  ownerId: PlayerId,
  state: GameState,
  ctx: GameContext,
  borrowedRouteIds: ReadonlyArray<RouteId>,
): Map<CityId, CityId[]> {
  const adj = new Map<CityId, CityId[]>();
  const add = (a: CityId, b: CityId) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push(b);
  };
  for (const claim of state.claims) {
    const isMine = claim.by === ownerId;
    const isBorrowed = borrowedRouteIds.includes(claim.routeId);
    if (!isMine && !isBorrowed) continue;
    const r = ctx.routesById[claim.routeId];
    if (!r) continue;
    add(r.from, r.to);
    add(r.to, r.from);
  }
  return adj;
}

export function findReachable(
  start: CityId,
  ownerId: PlayerId,
  state: GameState,
  ctx: GameContext,
  borrowedRouteIds: ReadonlyArray<RouteId> = [],
): Set<CityId> {
  const adj = buildAdjacency(ownerId, state, ctx, borrowedRouteIds);
  const visited = new Set<CityId>([start]);
  const queue: CityId[] = [start];
  while (queue.length) {
    const c = queue.shift()!;
    const neighbors = adj.get(c) ?? [];
    for (const n of neighbors) {
      if (!visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }
  return visited;
}

export function isTicketComplete(
  ticket: Ticket,
  ownerId: PlayerId,
  state: GameState,
  ctx: GameContext,
  borrowedRouteIds: ReadonlyArray<RouteId> = [],
): boolean {
  return findReachable(
    ticket.from,
    ownerId,
    state,
    ctx,
    borrowedRouteIds,
  ).has(ticket.to);
}

/** All distinct opponent-claimed routes that touch the given city. */
function opponentRoutesThroughCity(
  cityId: CityId,
  ownerId: PlayerId,
  state: GameState,
  ctx: GameContext,
): RouteId[] {
  const ids = ctx.routesByCity[cityId] ?? [];
  const out: RouteId[] = [];
  for (const rid of ids) {
    const owner = state.routeOwner[rid];
    if (owner && owner !== ownerId) out.push(rid);
  }
  return out;
}

/**
 * For a player with stations, brute-force the optimal "borrow assignment":
 * each station can claim use of ONE opponent route through that city.
 * Multiple stations cannot borrow the same route.
 *
 * Returns the assignment (one RouteId per station, in same order) that
 * maximizes the player's net ticket score, plus the resulting completed/missed lists.
 */
export interface BorrowEvaluation {
  borrowedRouteIds: RouteId[];
  completed: Ticket[];
  missed: Ticket[];
}

export function evaluateOptimalBorrow(
  ownerId: PlayerId,
  state: GameState,
  ctx: GameContext,
): BorrowEvaluation {
  const player = state.players[ownerId];
  if (player.tickets.length === 0) {
    return { borrowedRouteIds: [], completed: [], missed: [] };
  }

  const stationCities = player.stations;
  // For each station, candidate borrowed routes (or null = don't borrow)
  const candidatesPerStation: Array<RouteId | null>[] = stationCities.map(
    (city) => [null, ...opponentRoutesThroughCity(city, ownerId, state, ctx)],
  );

  // No stations → trivial case
  if (candidatesPerStation.length === 0) {
    return scoreFor([], ownerId, state, ctx);
  }

  let best: BorrowEvaluation | null = null;

  // Cartesian product of candidates
  const enumerate = (i: number, current: Array<RouteId | null>) => {
    if (i === candidatesPerStation.length) {
      const borrowed = current.filter((r): r is RouteId => r !== null);
      // No double-use: each route can be borrowed by at most one station
      if (new Set(borrowed).size !== borrowed.length) return;
      const evalResult = scoreFor(borrowed, ownerId, state, ctx);
      if (!best || ticketDelta(evalResult) > ticketDelta(best)) {
        best = evalResult;
      }
      return;
    }
    for (const choice of candidatesPerStation[i]) {
      current.push(choice);
      enumerate(i + 1, current);
      current.pop();
    }
  };
  enumerate(0, []);

  return best ?? scoreFor([], ownerId, state, ctx);
}

function scoreFor(
  borrowed: RouteId[],
  ownerId: PlayerId,
  state: GameState,
  ctx: GameContext,
): BorrowEvaluation {
  const player = state.players[ownerId];
  const completed: Ticket[] = [];
  const missed: Ticket[] = [];
  for (const t of player.tickets) {
    if (isTicketComplete(t, ownerId, state, ctx, borrowed)) completed.push(t);
    else missed.push(t);
  }
  return { borrowedRouteIds: borrowed, completed, missed };
}

function ticketDelta(e: BorrowEvaluation): number {
  let s = 0;
  for (const t of e.completed) s += t.points;
  for (const t of e.missed) s -= t.points;
  return s;
}
