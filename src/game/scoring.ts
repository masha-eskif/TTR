import { GLOBETROTTER_BONUS, ROUTE_POINTS, STATION_END_BONUS } from './constants';
import { evaluateOptimalBorrow } from './graph';
import type {
  GameContext,
  GameState,
  PlayerId,
  ScoreBreakdown,
} from './types';

export function routePointsFor(length: number): number {
  return ROUTE_POINTS[length] ?? 0;
}

/**
 * Live route-only score (used during the game for the side panel).
 * Does NOT include ticket bonuses/penalties or globetrotter — those are revealed at endgame.
 */
export function liveRouteScore(state: GameState, playerId: PlayerId, ctx: GameContext): number {
  let s = 0;
  for (const c of state.claims) {
    if (c.by !== playerId) continue;
    const r = ctx.routesById[c.routeId];
    if (!r) continue;
    s += routePointsFor(r.length);
  }
  return s;
}

export function calculateBreakdown(
  state: GameState,
  playerId: PlayerId,
  ctx: GameContext,
): ScoreBreakdown {
  const player = state.players[playerId];
  const routePoints = liveRouteScore(state, playerId, ctx);
  const borrow = evaluateOptimalBorrow(playerId, state, ctx);
  let ticketPointsEarned = 0;
  let ticketPointsLost = 0;
  for (const t of borrow.completed) ticketPointsEarned += t.points;
  for (const t of borrow.missed) ticketPointsLost += t.points;
  const stationBonus = (player.stationsLeft ?? 0) * STATION_END_BONUS;
  return {
    routePoints,
    ticketsCompleted: borrow.completed,
    ticketsMissed: borrow.missed,
    ticketPointsEarned,
    ticketPointsLost,
    stationBonus,
    globetrotterBonus: 0, // filled by calculateFinalScores
    total:
      routePoints +
      ticketPointsEarned -
      ticketPointsLost +
      stationBonus,
    borrowedRoutes: borrow.borrowedRouteIds,
  };
}

export interface FinalScores {
  p1: ScoreBreakdown;
  p2: ScoreBreakdown;
  winner: PlayerId | 'draw';
}

export function calculateFinalScores(
  state: GameState,
  ctx: GameContext,
): FinalScores {
  const p1 = calculateBreakdown(state, 'p1', ctx);
  const p2 = calculateBreakdown(state, 'p2', ctx);

  // Globetrotter: +10 to player with most completed tickets; tie → both get it
  const c1 = p1.ticketsCompleted.length;
  const c2 = p2.ticketsCompleted.length;
  if (c1 >= c2) p1.globetrotterBonus = GLOBETROTTER_BONUS;
  if (c2 >= c1) p2.globetrotterBonus = GLOBETROTTER_BONUS;
  p1.total += p1.globetrotterBonus;
  p2.total += p2.globetrotterBonus;

  let winner: PlayerId | 'draw';
  if (p1.total > p2.total) winner = 'p1';
  else if (p2.total > p1.total) winner = 'p2';
  else if (p1.ticketsCompleted.length > p2.ticketsCompleted.length) winner = 'p1';
  else if (p2.ticketsCompleted.length > p1.ticketsCompleted.length) winner = 'p2';
  else winner = 'draw';

  return { p1, p2, winner };
}
