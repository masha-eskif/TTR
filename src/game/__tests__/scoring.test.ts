import { describe, expect, it } from 'vitest';
import { ROUTE_POINTS } from '../constants';
import {
  calculateBreakdown,
  calculateFinalScores,
  liveRouteScore,
  routePointsFor,
} from '../scoring';
import type { GameState, RouteClaim, Ticket } from '../types';
import { makeTestState } from './_fixtures';

function withClaimsAndTickets(
  base: GameState,
  claims: RouteClaim[],
  p1Tickets: Ticket[] = [],
  p2Tickets: Ticket[] = [],
  p1Stations: string[] = [],
  p2Stations: string[] = [],
): GameState {
  const next: GameState = {
    ...base,
    claims,
    routeOwner: { ...base.routeOwner },
    players: {
      ...base.players,
      p1: {
        ...base.players.p1,
        tickets: p1Tickets,
        pendingTickets: [],
        stations: p1Stations,
        stationsLeft: 3 - p1Stations.length,
      },
      p2: {
        ...base.players.p2,
        tickets: p2Tickets,
        pendingTickets: [],
        stations: p2Stations,
        stationsLeft: 3 - p2Stations.length,
      },
    },
  };
  for (const c of claims) next.routeOwner[c.routeId] = c.by;
  return next;
}

describe('routePointsFor', () => {
  it('matches the TTR Europe table', () => {
    expect(routePointsFor(1)).toBe(1);
    expect(routePointsFor(2)).toBe(2);
    expect(routePointsFor(3)).toBe(4);
    expect(routePointsFor(4)).toBe(7);
    expect(routePointsFor(6)).toBe(15);
    expect(routePointsFor(8)).toBe(21);
  });

  it('returns ROUTE_POINTS keys for known lengths', () => {
    for (const lenStr of Object.keys(ROUTE_POINTS)) {
      const len = Number(lenStr);
      expect(routePointsFor(len)).toBe(ROUTE_POINTS[len]);
    }
  });

  it('returns 0 for unknown lengths', () => {
    expect(routePointsFor(0)).toBe(0);
    expect(routePointsFor(99)).toBe(0);
  });
});

describe('liveRouteScore', () => {
  it('sums claimed routes for the player only', () => {
    const { state, ctx } = makeTestState();
    const claims: RouteClaim[] = [
      { routeId: 'A-C', by: 'p1', cardsSpent: [], turn: 1 }, // 1 → 1 pt
      { routeId: 'B-C', by: 'p1', cardsSpent: [], turn: 2 }, // 4 → 7 pts
      { routeId: 'A-B-blue', by: 'p2', cardsSpent: [], turn: 3 }, // p2's
    ];
    const next = withClaimsAndTickets(state, claims);
    expect(liveRouteScore(next, 'p1', ctx)).toBe(1 + 7);
    expect(liveRouteScore(next, 'p2', ctx)).toBe(4); // length 3 → 4
  });
});

describe('calculateBreakdown', () => {
  it('subtracts incomplete ticket points and adds completed', () => {
    const { state, ctx } = makeTestState();
    const claims: RouteClaim[] = [
      { routeId: 'A-C', by: 'p1', cardsSpent: [], turn: 1 },
    ];
    const next = withClaimsAndTickets(
      state,
      claims,
      [
        { id: 't1', from: 'A', to: 'C', points: 5, isLong: false }, // completed
        { id: 't2', from: 'A', to: 'E', points: 10, isLong: true }, // missed
      ],
    );
    const b = calculateBreakdown(next, 'p1', ctx);
    expect(b.routePoints).toBe(1);
    expect(b.ticketPointsEarned).toBe(5);
    expect(b.ticketPointsLost).toBe(10);
    // Stations: p1 placed 0 → stationsLeft 3 → bonus 12
    expect(b.stationBonus).toBe(12);
    expect(b.total).toBe(1 + 5 - 10 + 12);
  });
});

describe('calculateFinalScores + globetrotter', () => {
  it('awards globetrotter to player with more completed tickets', () => {
    const { state, ctx } = makeTestState();
    const claims: RouteClaim[] = [
      { routeId: 'A-C', by: 'p1', cardsSpent: [], turn: 1 },
      { routeId: 'B-C', by: 'p1', cardsSpent: [], turn: 2 },
    ];
    const next = withClaimsAndTickets(
      state,
      claims,
      [
        { id: 't1', from: 'A', to: 'C', points: 5, isLong: false },
        { id: 't2', from: 'B', to: 'C', points: 5, isLong: false },
      ],
      [{ id: 't3', from: 'A', to: 'B', points: 5, isLong: false }], // p2 missed
    );
    const f = calculateFinalScores(next, ctx);
    expect(f.p1.globetrotterBonus).toBe(10);
    expect(f.p2.globetrotterBonus).toBe(0);
    expect(f.winner).toBe('p1');
  });

  it('awards globetrotter to BOTH on a tie', () => {
    const { state, ctx } = makeTestState();
    const claims: RouteClaim[] = [
      { routeId: 'A-C', by: 'p1', cardsSpent: [], turn: 1 },
      { routeId: 'A-B-blue', by: 'p2', cardsSpent: [], turn: 2 },
    ];
    const next = withClaimsAndTickets(
      state,
      claims,
      [{ id: 't1', from: 'A', to: 'C', points: 5, isLong: false }],
      [{ id: 't2', from: 'A', to: 'B', points: 5, isLong: false }],
    );
    const f = calculateFinalScores(next, ctx);
    expect(f.p1.globetrotterBonus).toBe(10);
    expect(f.p2.globetrotterBonus).toBe(10);
  });

  it('reports draw when totals are equal', () => {
    const { state, ctx } = makeTestState();
    const claims: RouteClaim[] = [
      { routeId: 'A-C', by: 'p1', cardsSpent: [], turn: 1 },
      { routeId: 'A-C', by: 'p1', cardsSpent: [], turn: 1 }, // dup, ignored — see below
    ];
    // Both with no tickets and zero claims → 12 stations bonus each, both get globetrotter (tie at 0)
    const next = withClaimsAndTickets(state, [], [], []);
    const f = calculateFinalScores(next, ctx);
    expect(f.winner).toBe('draw');
    void claims;
  });
});
