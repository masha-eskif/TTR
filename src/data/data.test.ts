import { describe, expect, it } from 'vitest';
import { ROUTE_POINTS } from '../game/constants';
import { CITIES, ROUTES, TICKETS, createBoardContext } from './index';

describe('board data', () => {
  it('createBoardContext does not throw and has the right counts', () => {
    const ctx = createBoardContext();
    expect(ctx.cities.length).toBe(47);
    expect(ctx.routes.length).toBeGreaterThanOrEqual(60);
    expect(ctx.shortTicketIds.length).toBe(46);
    expect(ctx.longTicketIds.length).toBe(6);
  });

  it('every city has a unique id and a name', () => {
    const ids = new Set<string>();
    for (const c of CITIES) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(ids.has(c.id)).toBe(false);
      ids.add(c.id);
    }
  });

  it('every route id is unique', () => {
    const ids = new Set<string>();
    for (const r of ROUTES) {
      expect(ids.has(r.id)).toBe(false);
      ids.add(r.id);
    }
  });

  it('every route uses a known city and a valid length', () => {
    const cityIds = new Set(CITIES.map((c) => c.id));
    for (const r of ROUTES) {
      expect(cityIds.has(r.from)).toBe(true);
      expect(cityIds.has(r.to)).toBe(true);
      expect(ROUTE_POINTS[r.length]).toBeGreaterThan(0);
    }
  });

  it('parallel references resolve to existing routes (and back)', () => {
    const byId = new Map(ROUTES.map((r) => [r.id, r]));
    for (const r of ROUTES) {
      if (!r.parallel) continue;
      const partner = byId.get(r.parallel);
      expect(partner).toBeDefined();
      expect(partner!.parallel).toBe(r.id);
    }
  });

  it('every ticket is between two known cities', () => {
    const cityIds = new Set(CITIES.map((c) => c.id));
    for (const tk of TICKETS) {
      expect(cityIds.has(tk.from)).toBe(true);
      expect(cityIds.has(tk.to)).toBe(true);
      expect(tk.points).toBeGreaterThan(0);
    }
  });

  it('every ticket id is unique', () => {
    const ids = new Set<string>();
    for (const tk of TICKETS) {
      expect(ids.has(tk.id)).toBe(false);
      ids.add(tk.id);
    }
  });

  it('every ticket has at least one path between endpoints (graph connectivity)', () => {
    const ctx = createBoardContext();
    // Build full undirected graph from ROUTES (ignoring ownership)
    const adj = new Map<string, string[]>();
    for (const r of ROUTES) {
      (adj.get(r.from) ?? adj.set(r.from, []).get(r.from)!).push(r.to);
      (adj.get(r.to) ?? adj.set(r.to, []).get(r.to)!).push(r.from);
    }
    function reachable(from: string): Set<string> {
      const seen = new Set<string>([from]);
      const queue = [from];
      while (queue.length) {
        const c = queue.shift()!;
        for (const n of adj.get(c) ?? []) {
          if (!seen.has(n)) {
            seen.add(n);
            queue.push(n);
          }
        }
      }
      return seen;
    }
    for (const tk of ctx.tickets) {
      const seen = reachable(tk.from);
      expect(seen.has(tk.to)).toBe(true);
    }
  });

  it('has at least one tunnel and one ferry route', () => {
    expect(ROUTES.some((r) => r.isTunnel)).toBe(true);
    expect(ROUTES.some((r) => r.isFerry)).toBe(true);
  });
});
