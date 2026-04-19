import type { GameState, HouseRules, PlayerColor, PlayerId } from '../game/types';

export const STORAGE_VERSION = 1;
export const KEY_PREFIX = 'ttr.v1.';

export const KEYS = {
  profiles: `${KEY_PREFIX}profiles`,
  activeProfile: `${KEY_PREFIX}activeProfile`,
  settings: `${KEY_PREFIX}settings`,
  games: `${KEY_PREFIX}games`,
} as const;

// ---------- Profile ----------

export interface ProfileStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  totalScore: number;
  bestScore: number;
  ticketsCompleted: number;
  ticketsMissed: number;
  routesClaimed: number;
  longestSingleRoute: number; // length in train cars
}

export interface Profile {
  id: string;
  name: string;
  emoji: string;
  createdAt: number;
  stats: ProfileStats;
}

export function emptyStats(): ProfileStats {
  return {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    totalScore: 0,
    bestScore: 0,
    ticketsCompleted: 0,
    ticketsMissed: 0,
    routesClaimed: 0,
    longestSingleRoute: 0,
  };
}

// ---------- Settings ----------

export interface Settings {
  defaultHouseRules: HouseRules;
  language: 'ru';
}

export function defaultSettings(): Settings {
  return {
    defaultHouseRules: {
      infiniteCards: true,
      infiniteStations: false,
      allowCardTrading: false,
    },
    language: 'ru',
  };
}

// ---------- Saved game ----------

export interface SavedGame {
  gameId: string;
  createdAt: number;
  lastMoveAt: number;
  iAmHost: boolean;
  myPlayerId: PlayerId;
  myColor: PlayerColor;
  myName: string;
  myEmoji: string;
  opponentName: string;
  opponentEmoji: string;
  opponentColor: PlayerColor;
  myScore: number;
  opponentScore: number;
  roomCode: string;
  // Full GameState (host) or redacted ViewState (guest).
  // Stored as the raw object — localStorage will JSON.stringify it anyway.
  state: unknown;
  stateKind: 'full' | 'view';
}

export function summarizeSavedGame(
  gameId: string,
  state: GameState,
  opts: {
    iAmHost: boolean;
    myPlayerId: PlayerId;
    roomCode: string;
  },
): SavedGame {
  const me = state.players[opts.myPlayerId];
  const opp = state.players[opts.myPlayerId === 'p1' ? 'p2' : 'p1'];
  return {
    gameId,
    createdAt: state.createdAt,
    lastMoveAt: state.lastMoveAt,
    iAmHost: opts.iAmHost,
    myPlayerId: opts.myPlayerId,
    myColor: me.color,
    myName: me.name,
    myEmoji: me.emoji,
    opponentName: opp.name,
    opponentEmoji: opp.emoji,
    opponentColor: opp.color,
    myScore: me.score,
    opponentScore: opp.score,
    roomCode: opts.roomCode,
    state,
    stateKind: 'full',
  };
}
