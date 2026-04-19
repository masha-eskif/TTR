import {
  EMPTY_HAND,
  INITIAL_LONG_TICKETS_DEALT,
  INITIAL_SHORT_TICKETS_DEALT,
  STARTING_HAND_SIZE,
  STARTING_STATIONS,
  STARTING_TRAINS,
} from './constants';
import { drawCard, freshMarket } from './deck';
import { createHandle, shuffle } from './rng';
import type {
  GameContext,
  GameState,
  HouseRules,
  PlayerId,
  PlayerInit,
  PlayerState,
} from './types';

export interface CreateGameOptions {
  gameId: string;
  seed: number;
  houseRules: HouseRules;
  players: { p1: PlayerInit; p2: PlayerInit };
  ctx: GameContext;
  now?: number;
}

export function createInitialState(opts: CreateGameOptions): GameState {
  const now = opts.now ?? Date.now();
  const handle = createHandle(opts.seed, 0);

  // Decks
  const ticketDeck = shuffle(handle, opts.ctx.shortTicketIds);
  const longTicketDeck = shuffle(handle, opts.ctx.longTicketIds);

  // Starting hands
  const p1Hand = { ...EMPTY_HAND };
  const p2Hand = { ...EMPTY_HAND };
  for (let i = 0; i < STARTING_HAND_SIZE; i++) p1Hand[drawCard(handle)]++;
  for (let i = 0; i < STARTING_HAND_SIZE; i++) p2Hand[drawCard(handle)]++;

  // Initial ticket pendings — 1 long + 3 short to each
  const p1Long = longTicketDeck.splice(0, INITIAL_LONG_TICKETS_DEALT);
  const p1Short = ticketDeck.splice(0, INITIAL_SHORT_TICKETS_DEALT);
  const p2Long = longTicketDeck.splice(0, INITIAL_LONG_TICKETS_DEALT);
  const p2Short = ticketDeck.splice(0, INITIAL_SHORT_TICKETS_DEALT);

  const p1Pending = [...p1Long, ...p1Short].map((id) => opts.ctx.ticketsById[id]);
  const p2Pending = [...p2Long, ...p2Short].map((id) => opts.ctx.ticketsById[id]);

  const faceUp = freshMarket(handle);

  const p1: PlayerState = makePlayer('p1', opts.players.p1, p1Hand, p1Pending);
  const p2: PlayerState = makePlayer('p2', opts.players.p2, p2Hand, p2Pending);

  return {
    version: 1,
    gameId: opts.gameId,
    createdAt: now,
    lastMoveAt: now,
    seed: opts.seed,
    rngCursor: handle.cursor,
    houseRules: opts.houseRules,
    players: { p1, p2 },
    turn: 'p1',
    phase: 'pickingTickets',
    turnNumber: 0,
    turnMeta: {
      cardsDrawnThisTurn: 0,
      firstDrawWasFaceUpLoco: false,
      initialTicketDraw: true,
    },
    faceUpMarket: faceUp,
    ticketDeck,
    longTicketDeck,
    discardedTickets: [],
    claims: [],
    routeOwner: {},
    pendingTunnel: null,
    finalRoundTriggeredBy: null,
    finalRoundPlayersRemaining: 0,
    log: [
      {
        t: now,
        player: 'p1',
        kind: 'game_created',
        data: { seed: opts.seed, houseRules: opts.houseRules },
      },
    ],
  };
}

function makePlayer(
  id: PlayerId,
  init: PlayerInit,
  hand: PlayerState['hand'],
  pendingTickets: PlayerState['pendingTickets'],
): PlayerState {
  return {
    id,
    profileId: init.profileId,
    name: init.name,
    emoji: init.emoji,
    color: init.color,
    hand,
    tickets: [],
    pendingTickets,
    trainsLeft: STARTING_TRAINS,
    stationsLeft: STARTING_STATIONS,
    stations: [],
    score: 0,
  };
}
