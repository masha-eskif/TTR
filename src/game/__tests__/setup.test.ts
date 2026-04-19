import { describe, expect, it } from 'vitest';
import {
  STARTING_HAND_SIZE,
  STARTING_STATIONS,
  STARTING_TRAINS,
} from '../constants';
import { makeTestState } from './_fixtures';

describe('createInitialState', () => {
  it('initializes both players with starting trains and stations', () => {
    const { state } = makeTestState();
    for (const id of ['p1', 'p2'] as const) {
      expect(state.players[id].trainsLeft).toBe(STARTING_TRAINS);
      expect(state.players[id].stationsLeft).toBe(STARTING_STATIONS);
      expect(state.players[id].stations).toEqual([]);
      expect(state.players[id].score).toBe(0);
      expect(state.players[id].tickets).toEqual([]);
    }
  });

  it('deals STARTING_HAND_SIZE cards to each player', () => {
    const { state } = makeTestState();
    for (const id of ['p1', 'p2'] as const) {
      const total = Object.values(state.players[id].hand).reduce(
        (a, b) => a + b,
        0,
      );
      expect(total).toBe(STARTING_HAND_SIZE);
    }
  });

  it('deals 1 long + 3 short tickets to each player as pendingTickets', () => {
    const { state } = makeTestState();
    for (const id of ['p1', 'p2'] as const) {
      const pending = state.players[id].pendingTickets;
      expect(pending.length).toBe(4);
      expect(pending.filter((t) => t.isLong).length).toBe(1);
      expect(pending.filter((t) => !t.isLong).length).toBe(3);
    }
  });

  it('starts in pickingTickets phase with initialTicketDraw flag and turn = p1', () => {
    const { state } = makeTestState();
    expect(state.phase).toBe('pickingTickets');
    expect(state.turn).toBe('p1');
    expect(state.turnMeta.initialTicketDraw).toBe(true);
    expect(state.turnNumber).toBe(0);
  });

  it('produces a 5-card face-up market', () => {
    const { state } = makeTestState();
    expect(state.faceUpMarket).toHaveLength(5);
  });

  it('seed reproduces the same initial hand', () => {
    const a = makeTestState({ seed: 100 }).state;
    const b = makeTestState({ seed: 100 }).state;
    expect(a.players.p1.hand).toEqual(b.players.p1.hand);
    expect(a.faceUpMarket).toEqual(b.faceUpMarket);
  });

  it('different seeds produce different hands', () => {
    const a = makeTestState({ seed: 1 }).state;
    const b = makeTestState({ seed: 2 }).state;
    // Probabilistically different — hands or market should differ
    const sameHand = JSON.stringify(a.players.p1.hand) === JSON.stringify(b.players.p1.hand);
    const sameMarket = JSON.stringify(a.faceUpMarket) === JSON.stringify(b.faceUpMarket);
    expect(sameHand && sameMarket).toBe(false);
  });
});
