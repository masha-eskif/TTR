import type { CardColor } from './types';
import {
  ALL_CARD_COLORS,
  CARD_DISTRIBUTION,
  FACE_UP_LOCO_RESHUFFLE,
  FACE_UP_MARKET_SIZE,
} from './constants';
import { pickWeighted, type RngHandle } from './rng';

const DRAW_WEIGHTS = ALL_CARD_COLORS.map((c) => CARD_DISTRIBUTION[c]);

/** Draw a single card from the (infinite) deck per the canonical distribution. */
export function drawCard(handle: RngHandle): CardColor {
  return pickWeighted(handle, ALL_CARD_COLORS, DRAW_WEIGHTS);
}

export function drawN(handle: RngHandle, n: number): CardColor[] {
  return Array.from({ length: n }, () => drawCard(handle));
}

/**
 * Build a fresh face-up market of FACE_UP_MARKET_SIZE cards.
 * Auto-reshuffles whenever ≥3 locomotives appear (TTR rule).
 */
export function freshMarket(handle: RngHandle): CardColor[] {
  let market = drawN(handle, FACE_UP_MARKET_SIZE);
  let safety = 0;
  while (
    countLocomotives(market) >= FACE_UP_LOCO_RESHUFFLE &&
    safety < 20
  ) {
    market = drawN(handle, FACE_UP_MARKET_SIZE);
    safety++;
  }
  return market;
}

/**
 * Refill the market after a card was taken (or replaced after locomotive pick).
 * Replaces empty slots, then triggers the loco-reshuffle rule.
 */
export function refillMarket(
  market: ReadonlyArray<CardColor | null>,
  handle: RngHandle,
): CardColor[] {
  let next: CardColor[] = market.map((c) =>
    c === null ? drawCard(handle) : c,
  );
  while (next.length < FACE_UP_MARKET_SIZE) next.push(drawCard(handle));
  let safety = 0;
  while (
    countLocomotives(next) >= FACE_UP_LOCO_RESHUFFLE &&
    safety < 20
  ) {
    next = drawN(handle, FACE_UP_MARKET_SIZE);
    safety++;
  }
  return next;
}

export function countLocomotives(market: ReadonlyArray<CardColor>): number {
  let n = 0;
  for (const c of market) if (c === 'locomotive') n++;
  return n;
}
