import { TUNNEL_DRAW_COUNT } from './constants';
import { drawCard } from './deck';
import type { RngHandle } from './rng';
import type { CardColor, CardSpend, GameContext, RouteId } from './types';

export interface TunnelDraw {
  extras: CardColor[];
  extraCost: number;
  dominantColor: CardColor | null;
}

/**
 * Draw 3 extra cards from the (infinite) deck and compute the additional
 * cards required: each extra matching the route's dominant color OR a
 * locomotive adds +1 to the cost.
 *
 * Dominant color = the non-loco color among proposedCards (single color
 * since the route claim must be monochromatic). For locomotive-only spends
 * (rare; used on gray tunnels) the cost is just the count of locomotive extras.
 */
export function resolveTunnel(
  routeId: RouteId,
  proposedCards: CardSpend[],
  handle: RngHandle,
  ctx: GameContext,
): TunnelDraw {
  const route = ctx.routesById[routeId];
  if (!route) throw new Error(`Unknown route: ${routeId}`);
  if (!route.isTunnel) throw new Error(`Route ${routeId} is not a tunnel`);

  const extras = Array.from({ length: TUNNEL_DRAW_COUNT }, () =>
    drawCard(handle),
  );
  const nonLoco = proposedCards.find((c) => c.color !== 'locomotive');
  const dominantColor: CardColor | null = nonLoco?.color ?? null;
  let extraCost = 0;
  for (const e of extras) {
    if (e === 'locomotive') {
      extraCost++;
    } else if (dominantColor !== null && e === dominantColor) {
      extraCost++;
    }
  }
  return { extras, extraCost, dominantColor };
}
