import { describe, expect, it } from 'vitest';
import {
  evaluateOptimalBorrow,
  findReachable,
  isTicketComplete,
} from '../graph';
import type { GameState, RouteClaim } from '../types';
import { makeTestCtx, makeTestState, P1_INIT, P2_INIT } from './_fixtures';

function withClaims(
  baseState: GameState,
  claims: RouteClaim[],
): GameState {
  const next: GameState = {
    ...baseState,
    claims,
    routeOwner: { ...baseState.routeOwner },
  };
  for (const c of claims) next.routeOwner[c.routeId] = c.by;
  return next;
}

describe('graph.findReachable', () => {
  it('returns just start when player has no claims', () => {
    const { state } = makeTestState();
    const reach = findReachable('A', 'p1', state, makeTestCtx());
    expect([...reach]).toEqual(['A']);
  });

  it('walks the graph through claimed routes', () => {
    const { state, ctx } = makeTestState();
    const claims: RouteClaim[] = [
      { routeId: 'A-B-blue', by: 'p1', cardsSpent: [], turn: 1 },
      { routeId: 'B-C', by: 'p1', cardsSpent: [], turn: 2 },
    ];
    const next = withClaims(state, claims);
    const reach = findReachable('A', 'p1', next, ctx);
    expect(reach.has('B')).toBe(true);
    expect(reach.has('C')).toBe(true);
    expect(reach.has('D')).toBe(false);
  });

  it('does not walk through opponent routes', () => {
    const { state, ctx } = makeTestState();
    const claims: RouteClaim[] = [
      { routeId: 'A-B-blue', by: 'p1', cardsSpent: [], turn: 1 },
      { routeId: 'B-C', by: 'p2', cardsSpent: [], turn: 2 },
    ];
    const next = withClaims(state, claims);
    const reach = findReachable('A', 'p1', next, ctx);
    expect(reach.has('B')).toBe(true);
    expect(reach.has('C')).toBe(false);
  });

  it('walks borrowed routes (station-aided)', () => {
    const { state, ctx } = makeTestState();
    const claims: RouteClaim[] = [
      { routeId: 'A-B-blue', by: 'p1', cardsSpent: [], turn: 1 },
      { routeId: 'B-C', by: 'p2', cardsSpent: [], turn: 2 },
    ];
    const next = withClaims(state, claims);
    const reach = findReachable('A', 'p1', next, ctx, ['B-C']);
    expect(reach.has('C')).toBe(true);
  });
});

describe('graph.isTicketComplete', () => {
  it('detects a completed simple ticket', () => {
    const { state, ctx } = makeTestState();
    const claims: RouteClaim[] = [
      { routeId: 'A-C', by: 'p1', cardsSpent: [], turn: 1 },
    ];
    const next = withClaims(state, claims);
    const ticket = { id: 'T', from: 'A', to: 'C', points: 3, isLong: false };
    expect(isTicketComplete(ticket, 'p1', next, ctx)).toBe(true);
  });

  it('returns false for an unreachable ticket', () => {
    const { state, ctx } = makeTestState();
    const ticket = { id: 'T', from: 'A', to: 'E', points: 15, isLong: true };
    expect(isTicketComplete(ticket, 'p1', state, ctx)).toBe(false);
  });
});

describe('graph.evaluateOptimalBorrow', () => {
  it('returns no borrows and no completed tickets when player has no tickets', () => {
    const { state, ctx } = makeTestState();
    const stripped: GameState = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, tickets: [], pendingTickets: [] },
      },
    };
    const result = evaluateOptimalBorrow('p1', stripped, ctx);
    expect(result.completed).toEqual([]);
    expect(result.missed).toEqual([]);
    expect(result.borrowedRouteIds).toEqual([]);
  });

  it('borrows opponent route through station to complete a ticket', () => {
    const { state, ctx } = makeTestState();
    const claims: RouteClaim[] = [
      { routeId: 'A-B-blue', by: 'p1', cardsSpent: [], turn: 1 },
      { routeId: 'B-C', by: 'p2', cardsSpent: [], turn: 2 }, // opponent owns B-C
      { routeId: 'C-D', by: 'p1', cardsSpent: [], turn: 3 },
    ];
    const next = withClaims(state, claims);
    next.players.p1 = {
      ...next.players.p1,
      tickets: [{ id: 'T_A_D', from: 'A', to: 'D', points: 5, isLong: false }],
      stations: ['B'], // station at B borrows opponent's B-C
    };
    const result = evaluateOptimalBorrow('p1', next, ctx);
    expect(result.completed.length).toBe(1);
    expect(result.borrowedRouteIds).toContain('B-C');
  });

  it('chooses the borrow assignment maximizing ticket score', () => {
    // Force a choice between two opponent routes through one station
    const ctx = makeTestCtx();
    const baseState = makeTestState().state;
    // Manually wire claims: opponent owns B-C and A-B-red; player owns A-B-blue (=> B reachable) and C-D
    // Player has station at B; can borrow either B-C (helps reach D) or A-B-red (redundant).
    // Only B-C completes the ticket.
    const claims: RouteClaim[] = [
      { routeId: 'A-B-blue', by: 'p1', cardsSpent: [], turn: 1 },
      { routeId: 'B-C', by: 'p2', cardsSpent: [], turn: 2 },
      { routeId: 'A-B-red', by: 'p2', cardsSpent: [], turn: 3 },
      { routeId: 'C-D', by: 'p1', cardsSpent: [], turn: 4 },
    ];
    const next = withClaims(baseState, claims);
    next.players.p1 = {
      ...next.players.p1,
      tickets: [{ id: 'T_A_D', from: 'A', to: 'D', points: 5, isLong: false }],
      stations: ['B'],
    };
    const result = evaluateOptimalBorrow('p1', next, ctx);
    expect(result.borrowedRouteIds).toEqual(['B-C']);
    expect(result.completed.length).toBe(1);
  });

  // Suppress unused-import warnings (P1_INIT/P2_INIT) — fixture imports are
  // exported through `_fixtures` for cross-test access.
  void P1_INIT;
  void P2_INIT;
});
