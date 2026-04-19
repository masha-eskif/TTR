import type {
  GameState,
  PlayerId,
  PlayerState,
} from './types';

/**
 * Per-player view of the state — strips information the viewer should not see:
 *  - opponent's hand (only the count is public knowledge)
 *  - opponent's secret tickets (count only; revealed at endgame)
 *  - opponent's pendingTickets (the 3 they're choosing from)
 *  - the unrevealed ticket deck contents (only the size)
 *  - the unrevealed long ticket deck contents (only the size)
 *  - discarded tickets (counts only — order is hidden)
 *
 * Routes claimed, scores, station placements, face-up market, and game phase
 * are all public.
 */
export interface RedactedPlayerState
  extends Omit<PlayerState, 'hand' | 'tickets' | 'pendingTickets'> {
  hand: null;
  handCount: number;
  tickets: null;
  ticketCount: number;
  pendingTickets: null;
  pendingTicketCount: number;
}

export interface ViewState
  extends Omit<
    GameState,
    | 'players'
    | 'ticketDeck'
    | 'longTicketDeck'
    | 'discardedTickets'
  > {
  players: Record<PlayerId, PlayerState | RedactedPlayerState>;
  ticketDeckSize: number;
  longTicketDeckSize: number;
  discardedTicketsSize: number;
  // Ticket IDs are NOT exposed
  ticketDeck: null;
  longTicketDeck: null;
  discardedTickets: null;
}

export function redactForPlayer(
  state: GameState,
  viewerId: PlayerId,
): ViewState {
  const opp: PlayerId = viewerId === 'p1' ? 'p2' : 'p1';
  const own = state.players[viewerId];
  const oppFull = state.players[opp];

  const redactedOpp: RedactedPlayerState = {
    id: oppFull.id,
    profileId: oppFull.profileId,
    name: oppFull.name,
    emoji: oppFull.emoji,
    color: oppFull.color,
    trainsLeft: oppFull.trainsLeft,
    stationsLeft: oppFull.stationsLeft,
    stations: oppFull.stations.slice(),
    score: oppFull.score,
    hand: null,
    handCount: countHand(oppFull),
    tickets: null,
    ticketCount: oppFull.tickets.length,
    pendingTickets: null,
    pendingTicketCount: oppFull.pendingTickets.length,
  };

  const players: Record<PlayerId, PlayerState | RedactedPlayerState> = {
    p1: viewerId === 'p1' ? own : redactedOpp,
    p2: viewerId === 'p2' ? own : redactedOpp,
  };

  return {
    version: state.version,
    gameId: state.gameId,
    createdAt: state.createdAt,
    lastMoveAt: state.lastMoveAt,
    seed: state.seed,
    rngCursor: state.rngCursor,
    houseRules: state.houseRules,
    players,
    turn: state.turn,
    phase: state.phase,
    turnNumber: state.turnNumber,
    turnMeta: state.turnMeta,
    faceUpMarket: state.faceUpMarket.slice(),
    claims: state.claims.slice(),
    routeOwner: { ...state.routeOwner },
    pendingTunnel: state.pendingTunnel,
    finalRoundTriggeredBy: state.finalRoundTriggeredBy,
    finalRoundPlayersRemaining: state.finalRoundPlayersRemaining,
    log: state.log.slice(),
    ticketDeckSize: state.ticketDeck.length,
    longTicketDeckSize: state.longTicketDeck.length,
    discardedTicketsSize: state.discardedTickets.length,
    ticketDeck: null,
    longTicketDeck: null,
    discardedTickets: null,
  };
}

function countHand(p: PlayerState): number {
  let n = 0;
  for (const c of Object.values(p.hand)) n += c;
  return n;
}

/** Type guard — is this player slot redacted (i.e. opponent seen by viewer)? */
export function isRedacted(
  p: PlayerState | RedactedPlayerState,
): p is RedactedPlayerState {
  return p.hand === null;
}
