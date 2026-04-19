import { describe, expect, it } from 'vitest';
import { createHandle, nextRandom, pickWeighted, shuffle } from '../rng';

describe('rng', () => {
  it('produces deterministic values for the same (seed, cursor)', () => {
    const a = createHandle(123, 0);
    const b = createHandle(123, 0);
    const aValues = [nextRandom(a), nextRandom(a), nextRandom(a)];
    const bValues = [nextRandom(b), nextRandom(b), nextRandom(b)];
    expect(aValues).toEqual(bValues);
  });

  it('advances the cursor after each draw', () => {
    const h = createHandle(1, 0);
    nextRandom(h);
    nextRandom(h);
    nextRandom(h);
    expect(h.cursor).toBe(3);
  });

  it('returns values in [0, 1)', () => {
    const h = createHandle(7, 0);
    for (let i = 0; i < 1000; i++) {
      const v = nextRandom(h);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds produce different streams', () => {
    const a = createHandle(1, 0);
    const b = createHandle(2, 0);
    expect(nextRandom(a)).not.toBe(nextRandom(b));
  });

  it('pickWeighted respects relative weights over many trials', () => {
    const h = createHandle(99, 0);
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 10000; i++) {
      counts[pickWeighted(h, ['a', 'b'], [1, 9])]++;
    }
    // 90% should be 'b' ± a few percent
    expect(counts.b / 10000).toBeGreaterThan(0.85);
    expect(counts.b / 10000).toBeLessThan(0.95);
  });

  it('shuffle returns a permutation of the input', () => {
    const h = createHandle(11, 0);
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const out = shuffle(h, input);
    expect(out.length).toBe(input.length);
    expect(out.slice().sort((a, b) => a - b)).toEqual(input);
  });

  it('shuffle does not mutate the input', () => {
    const h = createHandle(11, 0);
    const input = [1, 2, 3];
    const original = input.slice();
    shuffle(h, input);
    expect(input).toEqual(original);
  });
});
