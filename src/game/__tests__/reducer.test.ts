import { beforeEach, describe, expect, it } from 'vitest';
import { EMPTY_HAND, STARTING_TRAINS } from '../constants';
import { applyAction, InvalidActionError, mergeSpends } from '../reducer';
import type { GameContext, GameState } from '../types';
import { makeTestState, skipInitialTickets } from './_fixtures';

let state: GameState;
let ctx: GameContext;

beforeEach(() => {
  const init = makeTestState({ seed: 11 });
  ctx = init.ctx;
  state = skipInitialTickets(init.state, applyAction, ctx);
});

describe('applyAction — drawing cards', () => {
  it('first deck draw advances phase to drawingCards but keeps the turn', () => {
    const next = applyAction(state, { type: 'DRAW_FROM_DECK' }, 'p1', ctx);
    expect(next.phase).toBe('drawingCards');
    expect(next.turn).toBe('p1');
    expect(next.turnMeta.cardsDrawnThisTurn).toBe(1);
    const handBefore = sumHand(state.players.p1.hand);
    const handAfter = sumHand(next.players.p1.hand);
    expect(handAfter).toBe(handBefore + 1);
  });

  it('second deck draw ends the turn and passes it to p2', () => {
    let s = applyAction(state, { type: 'DRAW_FROM_DECK' }, 'p1', ctx);
    s = applyAction(s, { type: 'DRAW_FROM_DECK' }, 'p1', ctx);
    expect(s.phase).toBe('idle');
    expect(s.turn).toBe('p2');
    expect(s.turnMeta.cardsDrawnThisTurn).toBe(0);
  });

  it('drawing a face-up locomotive on first action ends the turn', () => {
    const setLoco: GameState = {
      ...state,
      faceUpMarket: ['locomotive', 'blue', 'red', 'yellow', 'black'],
    };
    const next = applyAction(
      setLoco,
      { type: 'DRAW_FROM_MARKET', slot: 0 },
      'p1',
      ctx,
    );
    expect(next.turn).toBe('p2');
    expect(next.players.p1.hand.locomotive).toBe(
      setLoco.players.p1.hand.locomotive + 1,
    );
  });

  it('rejects invalid action with InvalidActionError', () => {
    expect(() =>
      applyAction(state, { type: 'DRAW_FROM_MARKET', slot: 0 }, 'p2', ctx),
    ).toThrow(InvalidActionError);
  });
});

describe('applyAction — claim route', () => {
  it('deducts cards, deducts trains, awards route points, ends turn', () => {
    const ready: GameState = {
      ...state,
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          hand: { ...EMPTY_HAND, blue: 3 },
        },
      },
    };
    const next = applyAction(
      ready,
      {
        type: 'CLAIM_ROUTE',
        routeId: 'A-B-blue',
        cards: [{ color: 'blue', count: 3 }],
      },
      'p1',
      ctx,
    );
    expect(next.players.p1.hand.blue).toBe(0);
    expect(next.players.p1.trainsLeft).toBe(STARTING_TRAINS - 3);
    expect(next.players.p1.score).toBe(4); // length 3 → 4 pts
    expect(next.routeOwner['A-B-blue']).toBe('p1');
    expect(next.claims).toHaveLength(1);
    expect(next.turn).toBe('p2');
  });

  it('blocks the parallel route from being claimed', () => {
    const ready: GameState = {
      ...state,
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          hand: { ...EMPTY_HAND, blue: 3 },
        },
        p2: {
          ...state.players.p2,
          hand: { ...EMPTY_HAND, red: 3 },
        },
      },
    };
    const after1 = applyAction(
      ready,
      {
        type: 'CLAIM_ROUTE',
        routeId: 'A-B-blue',
        cards: [{ color: 'blue', count: 3 }],
      },
      'p1',
      ctx,
    );
    expect(() =>
      applyAction(
        after1,
        {
          type: 'CLAIM_ROUTE',
          routeId: 'A-B-red',
          cards: [{ color: 'red', count: 3 }],
        },
        'p2',
        ctx,
      ),
    ).toThrow(InvalidActionError);
  });
});

describe('applyAction — tunnel', () => {
  it('puts state into tunnelResolution and exposes extras', () => {
    const ready: GameState = {
      ...state,
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          hand: { ...EMPTY_HAND, orange: 7 }, // plenty for a 4-card tunnel + extras
        },
      },
    };
    const next = applyAction(
      ready,
      {
        type: 'CLAIM_ROUTE',
        routeId: 'D-E',
        cards: [{ color: 'orange', count: 4 }],
      },
      'p1',
      ctx,
    );
    if (next.pendingTunnel) {
      // extraCost > 0 → still in resolution; extraCost == 0 → auto-resolved
      if (next.pendingTunnel.extraCost > 0) {
        expect(next.phase).toBe('tunnelResolution');
        expect(next.pendingTunnel.extrasDrawn).toHaveLength(3);
      }
    } else {
      // Auto-confirmed (no extras needed)
      expect(next.phase).toBe('idle');
      expect(next.routeOwner['D-E']).toBe('p1');
    }
  });

  it('TUNNEL_CONFIRM applies full claim once extras are paid', () => {
    // Use a seed where D-E tunnel's first 3 extras include exactly 1 orange
    // (we'll just construct the pending state by hand to make this deterministic)
    const ready: GameState = {
      ...state,
      phase: 'tunnelResolution',
      pendingTunnel: {
        routeId: 'D-E',
        proposedCards: [{ color: 'orange', count: 4 }],
        extrasDrawn: ['orange', 'blue', 'red'],
        extraCost: 1,
        initiator: 'p1',
      },
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          hand: { ...EMPTY_HAND, orange: 5 },
        },
      },
    };
    const next = applyAction(
      ready,
      { type: 'TUNNEL_CONFIRM', extraCards: [{ color: 'orange', count: 1 }] },
      'p1',
      ctx,
    );
    expect(next.routeOwner['D-E']).toBe('p1');
    expect(next.players.p1.hand.orange).toBe(0);
    expect(next.pendingTunnel).toBeNull();
    expect(next.turn).toBe('p2');
  });

  it('TUNNEL_CANCEL keeps cards and ends the turn', () => {
    const ready: GameState = {
      ...state,
      phase: 'tunnelResolution',
      pendingTunnel: {
        routeId: 'D-E',
        proposedCards: [{ color: 'orange', count: 4 }],
        extrasDrawn: ['orange', 'orange', 'red'],
        extraCost: 2,
        initiator: 'p1',
      },
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          hand: { ...EMPTY_HAND, orange: 4 },
        },
      },
    };
    const next = applyAction(
      ready,
      { type: 'TUNNEL_CANCEL' },
      'p1',
      ctx,
    );
    expect(next.players.p1.hand.orange).toBe(4); // unchanged
    expect(next.routeOwner['D-E']).toBeUndefined();
    expect(next.pendingTunnel).toBeNull();
    expect(next.turn).toBe('p2');
  });
});

describe('applyAction — build station', () => {
  it('places the station, decrements stationsLeft, ends the turn', () => {
    const ready: GameState = {
      ...state,
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          hand: { ...EMPTY_HAND, blue: 1 },
        },
      },
    };
    const next = applyAction(
      ready,
      {
        type: 'BUILD_STATION',
        cityId: 'B',
        cards: [{ color: 'blue', count: 1 }],
      },
      'p1',
      ctx,
    );
    expect(next.players.p1.stations).toEqual(['B']);
    expect(next.players.p1.stationsLeft).toBe(2);
    expect(next.players.p1.hand.blue).toBe(0);
    expect(next.turn).toBe('p2');
  });

  it('does not deduct stationsLeft when infiniteStations is enabled', () => {
    const ready: GameState = {
      ...state,
      houseRules: { ...state.houseRules, infiniteStations: true },
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          hand: { ...EMPTY_HAND, blue: 1 },
        },
      },
    };
    const next = applyAction(
      ready,
      {
        type: 'BUILD_STATION',
        cityId: 'B',
        cards: [{ color: 'blue', count: 1 }],
      },
      'p1',
      ctx,
    );
    expect(next.players.p1.stationsLeft).toBe(3);
  });
});

describe('applyAction — endgame trigger', () => {
  it('triggers final round when player drops to ≤2 trains', () => {
    const lowTrains: GameState = {
      ...state,
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          trainsLeft: 5,
          hand: { ...EMPTY_HAND, orange: 4 },
        },
      },
    };
    const next = applyAction(
      lowTrains,
      {
        type: 'CLAIM_ROUTE',
        routeId: 'B-C',
        cards: [{ color: 'orange', count: 4 }],
      },
      'p1',
      ctx,
    );
    expect(next.players.p1.trainsLeft).toBe(1);
    expect(next.finalRoundTriggeredBy).toBe('p1');
    expect(next.finalRoundPlayersRemaining).toBe(1);
    expect(next.turn).toBe('p2');
    expect(next.phase).toBe('idle');
  });

  it('ends game after opponent finishes their last turn', () => {
    const inFinal: GameState = {
      ...state,
      finalRoundTriggeredBy: 'p1',
      finalRoundPlayersRemaining: 1,
      turn: 'p2',
    };
    const next = applyAction(
      inFinal,
      { type: 'END_TURN_FORCED' },
      'p2',
      ctx,
    );
    expect(next.phase).toBe('gameOver');
  });
});

describe('mergeSpends', () => {
  it('combines duplicate colors and drops zeros', () => {
    const out = mergeSpends([
      { color: 'blue', count: 2 },
      { color: 'blue', count: 1 },
      { color: 'red', count: 0 },
      { color: 'locomotive', count: 1 },
    ]);
    const sorted = out.slice().sort((a, b) => a.color.localeCompare(b.color));
    expect(sorted).toEqual([
      { color: 'blue', count: 3 },
      { color: 'locomotive', count: 1 },
    ]);
  });
});

function sumHand(hand: Record<string, number>): number {
  let n = 0;
  for (const v of Object.values(hand)) n += v;
  return n;
}
