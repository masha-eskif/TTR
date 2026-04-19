/**
 * Deterministic RNG keyed by (seed, cursor). Same (seed, cursor) → same value.
 *
 * Pure-function reducer creates an RngHandle from `state.seed`/`state.rngCursor`,
 * mutates the handle locally during action application, then writes the new
 * cursor back into the resulting state. The mutation never escapes the reducer.
 */
export interface RngHandle {
  seed: number;
  cursor: number;
}

export function createHandle(seed: number, cursor: number): RngHandle {
  return { seed, cursor };
}

/** Advance cursor and return next [0, 1) value. */
export function nextRandom(handle: RngHandle): number {
  handle.cursor++;
  // Hash (seed, cursor) → uniform float using mulberry32-style mixing
  let s = (handle.seed + handle.cursor * 0x9e3779b1) >>> 0;
  let t = (s + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function pickWeighted<T>(
  handle: RngHandle,
  options: T[],
  weights: number[],
): T {
  if (options.length !== weights.length) {
    throw new Error('options and weights length mismatch');
  }
  const total = weights.reduce((a, b) => a + b, 0);
  let r = nextRandom(handle) * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r < 0) return options[i];
  }
  return options[options.length - 1];
}

export function shuffle<T>(handle: RngHandle, items: readonly T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(handle) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
