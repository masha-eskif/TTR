import { describe, expect, it } from 'vitest';
import { isRedacted, redactForPlayer } from '../redact';
import { makeTestState } from './_fixtures';

describe('redactForPlayer', () => {
  it('hides opponent hand, tickets, and pendingTickets', () => {
    const { state } = makeTestState();
    const view = redactForPlayer(state, 'p1');
    const oppView = view.players.p2;
    expect(isRedacted(oppView)).toBe(true);
    if (isRedacted(oppView)) {
      expect(oppView.hand).toBeNull();
      expect(oppView.tickets).toBeNull();
      expect(oppView.pendingTickets).toBeNull();
      expect(oppView.handCount).toBe(4);
      expect(oppView.pendingTicketCount).toBe(4);
      expect(oppView.ticketCount).toBe(0);
    }
  });

  it('preserves the viewer’s own hand and tickets', () => {
    const { state } = makeTestState();
    const view = redactForPlayer(state, 'p1');
    expect(isRedacted(view.players.p1)).toBe(false);
    expect(view.players.p1.hand).toEqual(state.players.p1.hand);
  });

  it('hides ticket deck contents but exposes sizes', () => {
    const { state } = makeTestState();
    const view = redactForPlayer(state, 'p1');
    expect(view.ticketDeck).toBeNull();
    expect(view.longTicketDeck).toBeNull();
    expect(view.discardedTickets).toBeNull();
    expect(view.ticketDeckSize).toBe(state.ticketDeck.length);
    expect(view.longTicketDeckSize).toBe(state.longTicketDeck.length);
  });

  it('preserves public state: market, claims, scores, route owners', () => {
    const { state } = makeTestState();
    const view = redactForPlayer(state, 'p1');
    expect(view.faceUpMarket).toEqual(state.faceUpMarket);
    expect(view.claims).toEqual(state.claims);
    expect(view.routeOwner).toEqual(state.routeOwner);
    expect(view.players.p2.score).toBe(state.players.p2.score);
    expect(view.players.p2.trainsLeft).toBe(state.players.p2.trainsLeft);
  });
});
