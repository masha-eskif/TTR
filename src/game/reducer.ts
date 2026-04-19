import type { Action } from './actions';
import {
  ENDGAME_TRIGGER_THRESHOLD,
  MIDGAME_SHORT_TICKETS_DEALT,
} from './constants';
import { drawCard, refillMarket } from './deck';
import { createHandle, type RngHandle } from './rng';
import { validate } from './validate';
import { resolveTunnel } from './tunnel';
import { routePointsFor } from './scoring';
import type {
  CardColor,
  CardSpend,
  GameContext,
  GameLogEntry,
  GameState,
  Hand,
  PlayerId,
  PlayerState,
  TicketId,
  TurnMeta,
} from './types';

const FRESH_TURN_META: TurnMeta = {
  cardsDrawnThisTurn: 0,
  firstDrawWasFaceUpLoco: false,
  initialTicketDraw: false,
};

export class InvalidActionError extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = 'InvalidActionError';
  }
}

/**
 * Apply an action to the state. Throws InvalidActionError if invalid.
 * Returns a new GameState (input state is treated immutably).
 */
export function applyAction(
  state: GameState,
  action: Action,
  actor: PlayerId,
  ctx: GameContext,
  now: number = Date.now(),
): GameState {
  const v = validate(state, action, actor, ctx);
  if (!v.ok) throw new InvalidActionError(v.reason);

  const next: GameState = cloneState(state);
  next.lastMoveAt = now;
  const handle: RngHandle = createHandle(next.seed, next.rngCursor);

  switch (action.type) {
    case 'DRAW_FROM_MARKET':
      doDrawFromMarket(next, action.slot, actor, handle);
      break;
    case 'DRAW_FROM_DECK':
      doDrawFromDeck(next, actor, handle);
      break;
    case 'DRAW_TICKETS':
      doDrawTickets(next, actor, ctx);
      break;
    case 'KEEP_TICKETS':
      doKeepTickets(next, action.keep, actor);
      break;
    case 'CLAIM_ROUTE':
      doClaimRoute(next, action.routeId, action.cards, actor, ctx, handle);
      break;
    case 'TUNNEL_CONFIRM':
      doTunnelConfirm(next, action.extraCards, actor, ctx);
      break;
    case 'TUNNEL_CANCEL':
      doTunnelCancel(next, actor);
      break;
    case 'BUILD_STATION':
      doBuildStation(next, action.cityId, action.cards, actor);
      break;
    case 'TRADE_CARDS':
      doTradeCards(next, action.give, action.receive, actor);
      break;
    case 'END_TURN_FORCED':
      logEvent(next, actor, 'forced_end_turn');
      endTurn(next, actor);
      break;
    case 'CONCEDE':
      logEvent(next, actor, 'conceded');
      next.phase = 'gameOver';
      break;
  }

  next.rngCursor = handle.cursor;
  return next;
}

// ---------- per-action handlers ----------

function doDrawFromMarket(
  state: GameState,
  slot: 0 | 1 | 2 | 3 | 4,
  actor: PlayerId,
  handle: RngHandle,
): void {
  const card = state.faceUpMarket[slot];
  if (!card) return;
  const player = state.players[actor];
  player.hand[card]++;
  const sparse: Array<CardColor | null> = state.faceUpMarket.map((c, i) =>
    i === slot ? null : c,
  );
  state.faceUpMarket = refillMarket(sparse, handle);

  if (state.phase === 'idle' && card === 'locomotive') {
    // Loco from market = whole turn used
    state.turnMeta.cardsDrawnThisTurn = 2;
    state.turnMeta.firstDrawWasFaceUpLoco = true;
    logEvent(state, actor, 'drew_market_loco');
    endTurn(state, actor);
    return;
  }
  state.turnMeta.cardsDrawnThisTurn++;
  logEvent(state, actor, 'drew_from_market', { card });
  if (state.turnMeta.cardsDrawnThisTurn >= 2) {
    endTurn(state, actor);
  } else {
    state.phase = 'drawingCards';
  }
}

function doDrawFromDeck(
  state: GameState,
  actor: PlayerId,
  handle: RngHandle,
): void {
  const card = drawCard(handle);
  state.players[actor].hand[card]++;
  state.turnMeta.cardsDrawnThisTurn++;
  logEvent(state, actor, 'drew_from_deck');
  if (state.turnMeta.cardsDrawnThisTurn >= 2) {
    endTurn(state, actor);
  } else {
    state.phase = 'drawingCards';
  }
}

function doDrawTickets(
  state: GameState,
  actor: PlayerId,
  ctx: GameContext,
): void {
  if (state.ticketDeck.length === 0 && state.discardedTickets.length > 0) {
    state.ticketDeck = state.discardedTickets;
    state.discardedTickets = [];
  }
  const drawn: TicketId[] = state.ticketDeck.splice(
    0,
    Math.min(MIDGAME_SHORT_TICKETS_DEALT, state.ticketDeck.length),
  );
  const player = state.players[actor];
  player.pendingTickets = drawn.map((id) => ctx.ticketsById[id]);
  state.phase = 'pickingTickets';
  state.turnMeta.initialTicketDraw = false;
  logEvent(state, actor, 'drew_tickets', { count: drawn.length });
}

function doKeepTickets(
  state: GameState,
  keep: TicketId[],
  actor: PlayerId,
): void {
  const player = state.players[actor];
  const pending = player.pendingTickets;
  const declined = pending.filter((t) => !keep.includes(t.id));
  const kept = pending.filter((t) => keep.includes(t.id));
  player.tickets.push(...kept);
  player.pendingTickets = [];
  // Long: declined long ticket is removed from game (per official rules).
  // Short: declined short returns to bottom of ticket deck.
  for (const t of declined) {
    if (!t.isLong) state.discardedTickets.push(t.id);
  }
  logEvent(state, actor, 'kept_tickets', {
    keptCount: kept.length,
    declinedCount: declined.length,
  });

  if (state.turnMeta.initialTicketDraw) {
    // Initial deal: setup gave pendingTickets to both. Each picks in turn (p1, then p2).
    const opp: PlayerId = actor === 'p1' ? 'p2' : 'p1';
    if (state.players[opp].pendingTickets.length > 0) {
      state.turn = opp;
      // phase stays 'pickingTickets', initialTicketDraw stays true
    } else {
      state.turn = 'p1';
      state.phase = 'idle';
      state.turnNumber = 1;
      state.turnMeta = { ...FRESH_TURN_META };
    }
    return;
  }

  endTurn(state, actor);
}

function doClaimRoute(
  state: GameState,
  routeId: string,
  cards: CardSpend[],
  actor: PlayerId,
  ctx: GameContext,
  handle: RngHandle,
): void {
  const route = ctx.routesById[routeId];
  if (!route) return;
  if (route.isTunnel) {
    const draw = resolveTunnel(routeId, cards, handle, ctx);
    state.pendingTunnel = {
      routeId,
      proposedCards: cards,
      extrasDrawn: draw.extras,
      extraCost: draw.extraCost,
      initiator: actor,
    };
    state.phase = 'tunnelResolution';
    logEvent(state, actor, 'tunnel_attempt', {
      routeId,
      extras: draw.extras,
      extraCost: draw.extraCost,
    });
    if (draw.extraCost === 0) {
      finalizeRouteClaim(state, routeId, cards, actor, ctx);
      state.pendingTunnel = null;
      logEvent(state, actor, 'tunnel_no_extras', { routeId });
      endTurn(state, actor);
    }
    return;
  }
  finalizeRouteClaim(state, routeId, cards, actor, ctx);
  endTurn(state, actor);
}

function doTunnelConfirm(
  state: GameState,
  extraCards: CardSpend[],
  actor: PlayerId,
  ctx: GameContext,
): void {
  if (!state.pendingTunnel) return;
  const { routeId, proposedCards } = state.pendingTunnel;
  const allCards = mergeSpends([...proposedCards, ...extraCards]);
  finalizeRouteClaim(state, routeId, allCards, actor, ctx);
  logEvent(state, actor, 'tunnel_paid', { routeId });
  state.pendingTunnel = null;
  endTurn(state, actor);
}

function doTunnelCancel(state: GameState, actor: PlayerId): void {
  logEvent(state, actor, 'tunnel_canceled', {
    routeId: state.pendingTunnel?.routeId,
  });
  state.pendingTunnel = null;
  endTurn(state, actor);
}

function doBuildStation(
  state: GameState,
  cityId: string,
  cards: CardSpend[],
  actor: PlayerId,
): void {
  const player = state.players[actor];
  spendCards(player.hand, cards);
  if (!state.houseRules.infiniteStations) {
    player.stationsLeft--;
  }
  player.stations.push(cityId);
  logEvent(state, actor, 'built_station', { cityId });
  endTurn(state, actor);
}

function doTradeCards(
  state: GameState,
  give: Partial<Record<CardColor, number>>,
  receive: Partial<Record<CardColor, number>>,
  actor: PlayerId,
): void {
  const opp: PlayerId = actor === 'p1' ? 'p2' : 'p1';
  const me = state.players[actor];
  const them = state.players[opp];
  for (const k of Object.keys(give) as CardColor[]) {
    const n = give[k] ?? 0;
    if (!n) continue;
    me.hand[k] -= n;
    them.hand[k] += n;
  }
  for (const k of Object.keys(receive) as CardColor[]) {
    const n = receive[k] ?? 0;
    if (!n) continue;
    them.hand[k] -= n;
    me.hand[k] += n;
  }
  logEvent(state, actor, 'traded_cards', { give, receive });
  endTurn(state, actor);
}

// ---------- shared helpers ----------

function finalizeRouteClaim(
  state: GameState,
  routeId: string,
  cards: CardSpend[],
  actor: PlayerId,
  ctx: GameContext,
): void {
  const route = ctx.routesById[routeId];
  if (!route) return;
  const player = state.players[actor];
  spendCards(player.hand, cards);
  player.trainsLeft -= route.length;
  state.claims.push({
    routeId,
    by: actor,
    cardsSpent: cards,
    turn: state.turnNumber,
  });
  state.routeOwner[routeId] = actor;
  player.score += routePointsFor(route.length);
  logEvent(state, actor, 'claimed_route', {
    routeId,
    length: route.length,
    color: route.color,
  });
}

function endTurn(state: GameState, actor: PlayerId): void {
  // Trigger detection: first turn that brings someone to ≤ threshold
  if (state.finalRoundTriggeredBy === null) {
    for (const id of ['p1', 'p2'] as PlayerId[]) {
      if (state.players[id].trainsLeft <= ENDGAME_TRIGGER_THRESHOLD) {
        state.finalRoundTriggeredBy = id;
        // Standard rule: each OTHER player gets one more turn. For 2 players: 1 more.
        state.finalRoundPlayersRemaining = 1;
        logEvent(state, id, 'final_round_triggered');
        break;
      }
    }
  } else {
    // Already in final round: this turn used up one
    state.finalRoundPlayersRemaining--;
    if (state.finalRoundPlayersRemaining <= 0) {
      state.phase = 'gameOver';
      logEvent(state, actor, 'game_over');
      return;
    }
  }

  state.turn = actor === 'p1' ? 'p2' : 'p1';
  state.phase = 'idle';
  state.turnMeta = { ...FRESH_TURN_META };
  state.turnNumber++;
}

export function spendCards(hand: Hand, spend: CardSpend[]): void {
  for (const s of spend) {
    hand[s.color] -= s.count;
  }
}

export function mergeSpends(spends: CardSpend[]): CardSpend[] {
  const map: Partial<Record<CardColor, number>> = {};
  for (const s of spends) {
    map[s.color] = (map[s.color] ?? 0) + s.count;
  }
  const out: CardSpend[] = [];
  for (const k of Object.keys(map) as CardColor[]) {
    const n = map[k] ?? 0;
    if (n > 0) out.push({ color: k, count: n });
  }
  return out;
}

function logEvent(
  state: GameState,
  player: PlayerId,
  kind: string,
  data?: Record<string, unknown>,
): void {
  const entry: GameLogEntry = {
    t: state.lastMoveAt,
    player,
    kind,
    ...(data ? { data } : {}),
  };
  state.log.push(entry);
}

// ---------- structural clone (shallow-deep enough for our state shape) ----------

function cloneState(state: GameState): GameState {
  return {
    ...state,
    houseRules: { ...state.houseRules },
    turnMeta: { ...state.turnMeta },
    players: {
      p1: clonePlayer(state.players.p1),
      p2: clonePlayer(state.players.p2),
    },
    faceUpMarket: state.faceUpMarket.slice(),
    ticketDeck: state.ticketDeck.slice(),
    longTicketDeck: state.longTicketDeck.slice(),
    discardedTickets: state.discardedTickets.slice(),
    claims: state.claims.map((c) => ({
      ...c,
      cardsSpent: c.cardsSpent.slice(),
    })),
    routeOwner: { ...state.routeOwner },
    pendingTunnel: state.pendingTunnel
      ? {
          ...state.pendingTunnel,
          proposedCards: state.pendingTunnel.proposedCards.slice(),
          extrasDrawn: state.pendingTunnel.extrasDrawn.slice(),
        }
      : null,
    log: state.log.slice(),
  };
}

function clonePlayer(p: PlayerState): PlayerState {
  return {
    ...p,
    hand: { ...p.hand },
    tickets: p.tickets.slice(),
    pendingTickets: p.pendingTickets.slice(),
    stations: p.stations.slice(),
  };
}
