import { describe, expect, it } from 'vitest';
import { createHandle } from '../rng';
import { resolveTunnel } from '../tunnel';
import { makeTestCtx } from './_fixtures';

describe('resolveTunnel', () => {
  it('throws on non-tunnel route', () => {
    const ctx = makeTestCtx();
    const h = createHandle(1, 0);
    expect(() =>
      resolveTunnel('B-C', [{ color: 'blue', count: 4 }], h, ctx),
    ).toThrow();
  });

  it('returns 3 extras and computes a non-negative cost', () => {
    const ctx = makeTestCtx();
    const h = createHandle(1, 0);
    const result = resolveTunnel(
      'D-E',
      [{ color: 'orange', count: 4 }],
      h,
      ctx,
    );
    expect(result.extras).toHaveLength(3);
    expect(result.extraCost).toBeGreaterThanOrEqual(0);
    expect(result.extraCost).toBeLessThanOrEqual(3);
    expect(result.dominantColor).toBe('orange');
  });

  it('counts only matching color and locomotives toward extra cost', () => {
    const ctx = makeTestCtx();
    const h = createHandle(99, 0);
    const result = resolveTunnel(
      'D-E',
      [{ color: 'orange', count: 4 }],
      h,
      ctx,
    );
    let expectedCost = 0;
    for (const e of result.extras) {
      if (e === 'orange' || e === 'locomotive') expectedCost++;
    }
    expect(result.extraCost).toBe(expectedCost);
  });

  it('is deterministic for fixed (seed, cursor)', () => {
    const ctx = makeTestCtx();
    const h1 = createHandle(7, 5);
    const h2 = createHandle(7, 5);
    const r1 = resolveTunnel('D-E', [{ color: 'orange', count: 4 }], h1, ctx);
    const r2 = resolveTunnel('D-E', [{ color: 'orange', count: 4 }], h2, ctx);
    expect(r1).toEqual(r2);
  });

  it('handles all-locomotive spend (no dominant color)', () => {
    const ctx = makeTestCtx();
    const h = createHandle(5, 0);
    const result = resolveTunnel(
      'D-E',
      [{ color: 'locomotive', count: 4 }],
      h,
      ctx,
    );
    expect(result.dominantColor).toBeNull();
    // Only locomotives count
    let expectedCost = 0;
    for (const e of result.extras) if (e === 'locomotive') expectedCost++;
    expect(result.extraCost).toBe(expectedCost);
  });
});
