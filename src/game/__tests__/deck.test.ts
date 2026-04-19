import { describe, expect, it } from 'vitest';
import { ALL_CARD_COLORS } from '../constants';
import {
  countLocomotives,
  drawCard,
  drawN,
  freshMarket,
  refillMarket,
} from '../deck';
import { createHandle } from '../rng';

describe('deck', () => {
  it('drawCard returns a valid CardColor', () => {
    const h = createHandle(1, 0);
    for (let i = 0; i < 100; i++) {
      const c = drawCard(h);
      expect(ALL_CARD_COLORS).toContain(c);
    }
  });

  it('drawN returns N cards', () => {
    const h = createHandle(1, 0);
    expect(drawN(h, 4)).toHaveLength(4);
    expect(drawN(h, 0)).toHaveLength(0);
  });

  it('freshMarket returns 5 cards', () => {
    const h = createHandle(7, 0);
    expect(freshMarket(h)).toHaveLength(5);
  });

  it('freshMarket never returns ≥3 locomotives', () => {
    for (let seed = 0; seed < 50; seed++) {
      const h = createHandle(seed, 0);
      const m = freshMarket(h);
      expect(countLocomotives(m)).toBeLessThan(3);
    }
  });

  it('refillMarket fills nulls and respects loco rule', () => {
    const h = createHandle(13, 0);
    const sparse = ['blue', null, 'red', null, 'yellow'] as const;
    const m = refillMarket(sparse as any, h);
    expect(m).toHaveLength(5);
    expect(countLocomotives(m)).toBeLessThan(3);
  });

  it('countLocomotives counts correctly', () => {
    expect(
      countLocomotives(['locomotive', 'blue', 'locomotive', 'red', 'locomotive']),
    ).toBe(3);
    expect(countLocomotives(['blue', 'red', 'green', 'yellow', 'black'])).toBe(0);
  });

  it('card distribution roughly matches canonical proportions over 11000 draws', () => {
    const h = createHandle(42, 0);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 11000; i++) {
      const c = drawCard(h);
      counts[c] = (counts[c] ?? 0) + 1;
    }
    // Each color: 12/110 ≈ 0.109, locomotive: 14/110 ≈ 0.127
    const colorAvg =
      ['purple', 'white', 'blue', 'yellow', 'orange', 'black', 'red', 'green']
        .map((c) => counts[c] ?? 0)
        .reduce((a, b) => a + b, 0) / 8;
    const locoAvg = counts.locomotive ?? 0;
    expect(colorAvg).toBeGreaterThan(11000 * 0.09);
    expect(colorAvg).toBeLessThan(11000 * 0.13);
    expect(locoAvg).toBeGreaterThan(11000 * 0.105);
    expect(locoAvg).toBeLessThan(11000 * 0.15);
  });
});
