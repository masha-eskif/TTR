import type { Action } from './actions';
import {
  INITIAL_TICKETS_KEEP_MIN,
  MIDGAME_TICKETS_KEEP_MIN,
  STATION_BUILD_COST,
} from './constants';
import type {
  CardSpend,
  GameContext,
  GameState,
  Hand,
  PlayerId,
  PlayerState,
  RouteDef,
  ValidationResult,
} from './types';

export function validate(
  state: GameState,
  action: Action,
  actor: PlayerId,
  ctx: GameContext,
): ValidationResult {
  if (state.phase === 'gameOver') {
    return { ok: false, reason: 'Игра окончена' };
  }
  switch (action.type) {
    case 'DRAW_FROM_MARKET':
      return validateDrawFromMarket(state, action, actor);
    case 'DRAW_FROM_DECK':
      return validateDrawFromDeck(state, actor);
    case 'DRAW_TICKETS':
      return validateDrawTickets(state, actor);
    case 'KEEP_TICKETS':
      return validateKeepTickets(state, action, actor);
    case 'CLAIM_ROUTE':
      return validateClaimRoute(state, action, actor, ctx);
    case 'TUNNEL_CONFIRM':
      return validateTunnelConfirm(state, action, actor, ctx);
    case 'TUNNEL_CANCEL':
      return validateTunnelCancel(state, actor);
    case 'BUILD_STATION':
      return validateBuildStation(state, action, actor, ctx);
    case 'TRADE_CARDS':
      return validateTradeCards(state, action, actor);
    case 'END_TURN_FORCED':
    case 'CONCEDE':
      return { ok: true };
  }
}

function isActorsTurn(state: GameState, actor: PlayerId): boolean {
  return state.turn === actor;
}

function validateDrawFromMarket(
  state: GameState,
  action: Extract<Action, { type: 'DRAW_FROM_MARKET' }>,
  actor: PlayerId,
): ValidationResult {
  if (!isActorsTurn(state, actor)) return { ok: false, reason: 'Не ваш ход' };
  if (state.phase !== 'idle' && state.phase !== 'drawingCards') {
    return { ok: false, reason: 'Сейчас нельзя брать карты' };
  }
  const card = state.faceUpMarket[action.slot];
  if (!card) return { ok: false, reason: 'Слот пуст' };
  if (state.phase === 'drawingCards' && card === 'locomotive') {
    return { ok: false, reason: 'Локомотив с рынка нельзя брать вторым' };
  }
  return { ok: true };
}

function validateDrawFromDeck(
  state: GameState,
  actor: PlayerId,
): ValidationResult {
  if (!isActorsTurn(state, actor)) return { ok: false, reason: 'Не ваш ход' };
  if (state.phase !== 'idle' && state.phase !== 'drawingCards') {
    return { ok: false, reason: 'Сейчас нельзя брать карты' };
  }
  return { ok: true };
}

function validateDrawTickets(
  state: GameState,
  actor: PlayerId,
): ValidationResult {
  if (!isActorsTurn(state, actor)) return { ok: false, reason: 'Не ваш ход' };
  if (state.phase !== 'idle') {
    return { ok: false, reason: 'Сейчас нельзя брать билеты' };
  }
  if (state.ticketDeck.length === 0 && state.discardedTickets.length === 0) {
    return { ok: false, reason: 'Колода билетов пуста' };
  }
  return { ok: true };
}

function validateKeepTickets(
  state: GameState,
  action: Extract<Action, { type: 'KEEP_TICKETS' }>,
  actor: PlayerId,
): ValidationResult {
  if (!isActorsTurn(state, actor)) return { ok: false, reason: 'Не ваш ход' };
  if (state.phase !== 'pickingTickets') {
    return { ok: false, reason: 'Нет билетов на выбор' };
  }
  const player = state.players[actor];
  const pendingIds = new Set(player.pendingTickets.map((t) => t.id));
  for (const id of action.keep) {
    if (!pendingIds.has(id)) {
      return { ok: false, reason: `Билет ${id} не из выложенных` };
    }
  }
  if (new Set(action.keep).size !== action.keep.length) {
    return { ok: false, reason: 'Билеты в выборе повторяются' };
  }
  const minKeep = state.turnMeta.initialTicketDraw
    ? INITIAL_TICKETS_KEEP_MIN
    : MIDGAME_TICKETS_KEEP_MIN;
  if (action.keep.length < minKeep) {
    return {
      ok: false,
      reason: `Нужно оставить хотя бы ${minKeep} билет(ов)`,
    };
  }
  return { ok: true };
}

export function handHas(hand: Hand, spend: CardSpend[]): boolean {
  // Aggregate by color in case of duplicates
  const need: Record<string, number> = {};
  for (const s of spend) need[s.color] = (need[s.color] ?? 0) + s.count;
  for (const [color, n] of Object.entries(need)) {
    if ((hand[color as keyof Hand] ?? 0) < n) return false;
  }
  return true;
}

export function spendTotal(spend: CardSpend[]): number {
  let n = 0;
  for (const s of spend) n += s.count;
  return n;
}

/** Color-rule check for a route claim or station spend. */
export function spendMatchesRouteColor(
  spend: CardSpend[],
  route: RouteDef,
): ValidationResult {
  // Locomotives are wild
  const nonLoco = spend.filter((s) => s.color !== 'locomotive');
  const distinctNonLocoColors = new Set(nonLoco.map((s) => s.color));

  // Ferry locomotive minimum
  const locoCount =
    spend.find((s) => s.color === 'locomotive')?.count ?? 0;
  if (route.isFerry && locoCount < route.locomotivesRequired) {
    return {
      ok: false,
      reason: `Паром требует не меньше ${route.locomotivesRequired} локомотив(ов)`,
    };
  }

  if (route.color === 'gray') {
    if (distinctNonLocoColors.size > 1) {
      return {
        ok: false,
        reason: 'На сером маршруте не-локомотивы должны быть одного цвета',
      };
    }
  } else {
    if (distinctNonLocoColors.size > 1) {
      return { ok: false, reason: 'Можно использовать карты только одного цвета' };
    }
    if (
      distinctNonLocoColors.size === 1 &&
      !distinctNonLocoColors.has(route.color)
    ) {
      return {
        ok: false,
        reason: `Маршрут требует карты цвета «${route.color}» или локомотивы`,
      };
    }
  }
  return { ok: true };
}

function validateClaimRoute(
  state: GameState,
  action: Extract<Action, { type: 'CLAIM_ROUTE' }>,
  actor: PlayerId,
  ctx: GameContext,
): ValidationResult {
  if (!isActorsTurn(state, actor)) return { ok: false, reason: 'Не ваш ход' };
  if (state.phase !== 'idle') {
    return { ok: false, reason: 'Сейчас нельзя клеймить маршрут' };
  }
  const route = ctx.routesById[action.routeId];
  if (!route) return { ok: false, reason: 'Такого маршрута нет' };
  if (state.routeOwner[route.id]) {
    return { ok: false, reason: 'Маршрут уже занят' };
  }
  if (route.parallel && state.routeOwner[route.parallel]) {
    return {
      ok: false,
      reason: 'Параллельный маршрут уже занят (правило 2 игроков)',
    };
  }
  const player = state.players[actor];
  if (player.trainsLeft < route.length) {
    return { ok: false, reason: 'Недостаточно вагонов' };
  }
  if (spendTotal(action.cards) !== route.length) {
    return {
      ok: false,
      reason: `Нужно ровно ${route.length} карт`,
    };
  }
  if (!handHas(player.hand, action.cards)) {
    return { ok: false, reason: 'Карт нет в руке' };
  }
  const colorCheck = spendMatchesRouteColor(action.cards, route);
  if (!colorCheck.ok) return colorCheck;
  return { ok: true };
}

function validateTunnelConfirm(
  state: GameState,
  action: Extract<Action, { type: 'TUNNEL_CONFIRM' }>,
  actor: PlayerId,
  _ctx: GameContext,
): ValidationResult {
  if (state.phase !== 'tunnelResolution' || !state.pendingTunnel) {
    return { ok: false, reason: 'Нет тоннеля для подтверждения' };
  }
  if (state.pendingTunnel.initiator !== actor) {
    return { ok: false, reason: 'Тоннель прокладывает не вы' };
  }
  const player = state.players[actor];
  if (spendTotal(action.extraCards) !== state.pendingTunnel.extraCost) {
    return {
      ok: false,
      reason: `Нужно доплатить ${state.pendingTunnel.extraCost} карт(ы)`,
    };
  }
  // Available cards = hand minus already-proposed
  const hypothetical: Hand = { ...player.hand };
  for (const s of state.pendingTunnel.proposedCards) {
    hypothetical[s.color] -= s.count;
  }
  if (!handHas(hypothetical, action.extraCards)) {
    return { ok: false, reason: 'Не хватает карт для доплаты' };
  }
  // Each extra card must match dominant color or be locomotive
  const dominant = state.pendingTunnel.proposedCards.find(
    (c) => c.color !== 'locomotive',
  )?.color;
  for (const s of action.extraCards) {
    if (s.color === 'locomotive') continue;
    if (dominant && s.color !== dominant) {
      return {
        ok: false,
        reason: `Доплата только цветом «${dominant}» или локомотивами`,
      };
    }
    if (!dominant) {
      return {
        ok: false,
        reason: 'Доплата только локомотивами (исходный спенд — все локо)',
      };
    }
  }
  return { ok: true };
}

function validateTunnelCancel(
  state: GameState,
  actor: PlayerId,
): ValidationResult {
  if (state.phase !== 'tunnelResolution' || !state.pendingTunnel) {
    return { ok: false, reason: 'Нет тоннеля для отмены' };
  }
  if (state.pendingTunnel.initiator !== actor) {
    return { ok: false, reason: 'Тоннель прокладывает не вы' };
  }
  return { ok: true };
}

function validateBuildStation(
  state: GameState,
  action: Extract<Action, { type: 'BUILD_STATION' }>,
  actor: PlayerId,
  ctx: GameContext,
): ValidationResult {
  if (!isActorsTurn(state, actor)) return { ok: false, reason: 'Не ваш ход' };
  if (state.phase !== 'idle') {
    return { ok: false, reason: 'Сейчас нельзя строить вокзал' };
  }
  const player: PlayerState = state.players[actor];
  if (!ctx.citiesById[action.cityId]) {
    return { ok: false, reason: 'Такого города нет' };
  }
  if (player.stations.includes(action.cityId)) {
    return { ok: false, reason: 'Здесь уже стоит ваш вокзал' };
  }
  if (!state.houseRules.infiniteStations && player.stationsLeft <= 0) {
    return { ok: false, reason: 'Вокзалы кончились' };
  }
  // Station cost: 1st = 1 card, 2nd = 2 cards (same color), 3rd = 3 cards (same color)
  const stationsBuilt = player.stations.length;
  // With infinite stations, cap cost at 3
  const costIdx = Math.min(stationsBuilt + 1, 3);
  const requiredCount = STATION_BUILD_COST[costIdx];
  if (spendTotal(action.cards) !== requiredCount) {
    return {
      ok: false,
      reason: `Стоимость вокзала — ${requiredCount} карт(ы) одного цвета`,
    };
  }
  if (!handHas(player.hand, action.cards)) {
    return { ok: false, reason: 'Карт нет в руке' };
  }
  // Same color (locos wild). For 1-card cost — any single card OK (incl. loco)
  const nonLoco = action.cards.filter((s) => s.color !== 'locomotive');
  const distinct = new Set(nonLoco.map((s) => s.color));
  if (distinct.size > 1) {
    return { ok: false, reason: 'Карты должны быть одного цвета' };
  }
  return { ok: true };
}

function validateTradeCards(
  state: GameState,
  action: Extract<Action, { type: 'TRADE_CARDS' }>,
  actor: PlayerId,
): ValidationResult {
  if (!state.houseRules.allowCardTrading) {
    return { ok: false, reason: 'Обмен карт отключён' };
  }
  if (!isActorsTurn(state, actor)) return { ok: false, reason: 'Не ваш ход' };
  if (state.phase !== 'idle') {
    return { ok: false, reason: 'Сейчас нельзя обмениваться' };
  }
  const opp: PlayerId = actor === 'p1' ? 'p2' : 'p1';
  const player = state.players[actor];
  const opponent = state.players[opp];
  let giveSum = 0;
  for (const [color, n] of Object.entries(action.give)) {
    if (!n) continue;
    giveSum += n;
    if ((player.hand[color as keyof Hand] ?? 0) < n) {
      return { ok: false, reason: 'У вас нет таких карт для обмена' };
    }
  }
  let recvSum = 0;
  for (const [color, n] of Object.entries(action.receive)) {
    if (!n) continue;
    recvSum += n;
    if ((opponent.hand[color as keyof Hand] ?? 0) < n) {
      return { ok: false, reason: 'У соперника нет таких карт' };
    }
  }
  if (giveSum === 0 && recvSum === 0) {
    return { ok: false, reason: 'Пустой обмен' };
  }
  return { ok: true };
}
