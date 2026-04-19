import { beforeEach, describe, expect, it } from 'vitest';
import { applyAction } from '../reducer';
import { validate } from '../validate';
import type { GameContext, GameState } from '../types';
import { makeTestState, skipInitialTickets } from './_fixtures';

let state: GameState;
let ctx: GameContext;

beforeEach(() => {
  const init = makeTestState({ seed: 11 });
  ctx = init.ctx;
  state = skipInitialTickets(init.state, applyAction, ctx);
  // Give p1 a known hand for deterministic tests
  state = {
    ...state,
    players: {
      ...state.players,
      p1: {
        ...state.players.p1,
        hand: {
          purple: 0,
          white: 0,
          blue: 5,
          yellow: 0,
          orange: 5,
          black: 2,
          red: 4,
          green: 0,
          locomotive: 2,
        },
      },
    },
  };
});

describe('validate.DRAW_FROM_MARKET', () => {
  it('rejects when not your turn', () => {
    const r = validate(state, { type: 'DRAW_FROM_MARKET', slot: 0 }, 'p2', ctx);
    expect(r.ok).toBe(false);
  });

  it('accepts when it is your turn and slot has a card', () => {
    const r = validate(state, { type: 'DRAW_FROM_MARKET', slot: 0 }, 'p1', ctx);
    expect(r.ok).toBe(true);
  });

  it('rejects loco-from-market on second draw', () => {
    const drawing: GameState = {
      ...state,
      phase: 'drawingCards',
      turnMeta: { ...state.turnMeta, cardsDrawnThisTurn: 1 },
      faceUpMarket: ['locomotive', 'blue', 'red', 'yellow', 'black'],
    };
    const r = validate(
      drawing,
      { type: 'DRAW_FROM_MARKET', slot: 0 },
      'p1',
      ctx,
    );
    expect(r.ok).toBe(false);
  });
});

describe('validate.CLAIM_ROUTE', () => {
  it('rejects unknown route', () => {
    const r = validate(
      state,
      {
        type: 'CLAIM_ROUTE',
        routeId: 'no-such',
        cards: [{ color: 'blue', count: 3 }],
      },
      'p1',
      ctx,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects when count does not match length', () => {
    const r = validate(
      state,
      {
        type: 'CLAIM_ROUTE',
        routeId: 'A-B-blue',
        cards: [{ color: 'blue', count: 2 }],
      },
      'p1',
      ctx,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects wrong color', () => {
    const r = validate(
      state,
      {
        type: 'CLAIM_ROUTE',
        routeId: 'A-B-blue',
        cards: [{ color: 'orange', count: 3 }],
      },
      'p1',
      ctx,
    );
    expect(r.ok).toBe(false);
  });

  it('accepts valid colored claim', () => {
    const r = validate(
      state,
      {
        type: 'CLAIM_ROUTE',
        routeId: 'A-B-blue',
        cards: [{ color: 'blue', count: 3 }],
      },
      'p1',
      ctx,
    );
    expect(r.ok).toBe(true);
  });

  it('accepts colored claim with locomotives', () => {
    const r = validate(
      state,
      {
        type: 'CLAIM_ROUTE',
        routeId: 'A-B-blue',
        cards: [
          { color: 'blue', count: 1 },
          { color: 'locomotive', count: 2 },
        ],
      },
      'p1',
      ctx,
    );
    expect(r.ok).toBe(true);
  });

  it('rejects gray route with mixed non-loco colors', () => {
    const r = validate(
      state,
      {
        type: 'CLAIM_ROUTE',
        routeId: 'B-C',
        cards: [
          { color: 'blue', count: 2 },
          { color: 'red', count: 2 },
        ],
      },
      'p1',
      ctx,
    );
    expect(r.ok).toBe(false);
  });

  it('accepts gray route with single color', () => {
    const r = validate(
      state,
      {
        type: 'CLAIM_ROUTE',
        routeId: 'B-C',
        cards: [{ color: 'orange', count: 4 }],
      },
      'p1',
      ctx,
    );
    expect(r.ok).toBe(true);
  });

  it('rejects ferry without enough locomotives', () => {
    const r = validate(
      state,
      {
        type: 'CLAIM_ROUTE',
        routeId: 'C-D',
        cards: [{ color: 'black', count: 2 }],
      },
      'p1',
      ctx,
    );
    expect(r.ok).toBe(false);
  });

  it('accepts ferry with required locomotive', () => {
    const r = validate(
      state,
      {
        type: 'CLAIM_ROUTE',
        routeId: 'C-D',
        cards: [
          { color: 'black', count: 1 },
          { color: 'locomotive', count: 1 },
        ],
      },
      'p1',
      ctx,
    );
    expect(r.ok).toBe(true);
  });

  it('rejects when player lacks the cards', () => {
    const r = validate(
      state,
      {
        type: 'CLAIM_ROUTE',
        routeId: 'A-B-blue',
        cards: [{ color: 'blue', count: 99 }],
      },
      'p1',
      ctx,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects when parallel route already taken (2-player rule)', () => {
    const taken: GameState = {
      ...state,
      claims: [
        { routeId: 'A-B-red', by: 'p2', cardsSpent: [], turn: 1 },
      ],
      routeOwner: { 'A-B-red': 'p2' },
    };
    const r = validate(
      taken,
      {
        type: 'CLAIM_ROUTE',
        routeId: 'A-B-blue',
        cards: [{ color: 'blue', count: 3 }],
      },
      'p1',
      ctx,
    );
    expect(r.ok).toBe(false);
  });
});

describe('validate.BUILD_STATION', () => {
  it('accepts 1-card cost for first station', () => {
    const r = validate(
      state,
      {
        type: 'BUILD_STATION',
        cityId: 'B',
        cards: [{ color: 'blue', count: 1 }],
      },
      'p1',
      ctx,
    );
    expect(r.ok).toBe(true);
  });

  it('rejects mixed colors', () => {
    const r = validate(
      state,
      {
        type: 'BUILD_STATION',
        cityId: 'B',
        cards: [
          { color: 'blue', count: 1 },
          { color: 'red', count: 1 },
        ],
      },
      'p1',
      ctx,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects when same city already has player station', () => {
    const withStation: GameState = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, stations: ['B'], stationsLeft: 2 },
      },
    };
    const r = validate(
      withStation,
      {
        type: 'BUILD_STATION',
        cityId: 'B',
        cards: [
          { color: 'blue', count: 2 },
        ],
      },
      'p1',
      ctx,
    );
    expect(r.ok).toBe(false);
  });
});

describe('validate.TRADE_CARDS', () => {
  it('rejects when trading is disabled', () => {
    const r = validate(
      state,
      {
        type: 'TRADE_CARDS',
        give: { blue: 1 },
        receive: { red: 1 },
      },
      'p1',
      ctx,
    );
    expect(r.ok).toBe(false);
  });

  it('accepts when trading is enabled and cards are available', () => {
    const enabled: GameState = {
      ...state,
      houseRules: { ...state.houseRules, allowCardTrading: true },
      players: {
        ...state.players,
        p2: {
          ...state.players.p2,
          hand: { ...state.players.p2.hand, red: 3 },
        },
      },
    };
    const r = validate(
      enabled,
      {
        type: 'TRADE_CARDS',
        give: { blue: 1 },
        receive: { red: 1 },
      },
      'p1',
      ctx,
    );
    expect(r.ok).toBe(true);
  });
});
