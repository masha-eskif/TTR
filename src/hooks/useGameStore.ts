import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Action } from '../game/actions';
import { applyAction, InvalidActionError } from '../game/reducer';
import { createInitialState } from '../game/setup';
import { calculateFinalScores } from '../game/scoring';
import type {
  GameContext,
  GameState,
  HouseRules,
  PlayerColor,
  PlayerId,
  PlayerInit,
} from '../game/types';
import { createBoardContext } from '../data';
import {
  deleteSavedGame as deleteSavedGameStorage,
  getProfiles,
  getSavedGame,
  saveGame,
} from '../persistence/storage';
import { summarizeSavedGame } from '../persistence/schema';
import { recordGameResult } from '../profile/profile';
import type { NetMessage } from '../net/protocol';
import {
  createGuestSession,
  createHostSession,
  type PeerSession,
} from '../net/peer';
import { generateRoomCode } from '../net/roomCode';

export type Screen =
  | 'start'
  | 'game'
  | 'profile'
  | 'stats'
  | 'settings'
  | 'newGame'
  | 'continue'
  | 'lobby'
  | 'joinRoom';

export type NetMode = 'offline' | 'host' | 'guest';
export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'waiting-for-peer'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface NewGameInput {
  hostProfileId: string;
  opponentName: string;
  opponentEmoji: string;
  opponentColor?: PlayerColor;
  houseRules: HouseRules;
}

export interface CreateRoomInput {
  hostProfileId: string;
  houseRules: HouseRules;
  opponentPlaceholderName: string;
  opponentPlaceholderEmoji: string;
}

export interface JoinRoomInput {
  code: string;
  profileId: string;
}

interface GameStoreState {
  screen: Screen;
  state: GameState | null;
  ctx: GameContext;

  mode: NetMode;
  myPlayerId: PlayerId | null;
  iAmHost: boolean;
  roomCode: string;
  net: PeerSession | null;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  pendingCreateOpts: CreateRoomInput | null;

  lastError: string | null;
  selectedRouteId: string | null;
  selectedCityId: string | null;
  endgameRecorded: boolean;

  goToScreen(screen: Screen): void;
  setError(err: string | null): void;

  startNewGame(opts: NewGameInput): void;
  loadGame(gameId: string): void;
  abandonCurrentGame(): void;
  endCurrentGame(): void;

  dispatch(action: Action, actor?: PlayerId): void;
  applyRemoteState(state: GameState): void;

  selectRoute(routeId: string | null): void;
  selectCity(cityId: string | null): void;

  createRoom(opts: CreateRoomInput): void;
  joinRoom(opts: JoinRoomInput): void;
  leaveRoom(): void;
}

export const useGameStore = create<GameStoreState>((set, get) => {
  const ctx = createBoardContext();

  // ---------- internal helpers (closures over set/get) ----------

  function safelyApplyLocal(
    action: Action,
    actorId: PlayerId,
  ): GameState | null {
    const s = get();
    if (!s.state) return null;
    try {
      const next = applyAction(s.state, action, actorId, s.ctx);
      set({
        state: next,
        lastError: null,
        selectedRouteId: null,
        selectedCityId: null,
      });
      if (next.phase === 'gameOver' && !s.endgameRecorded) {
        recordEndgameStats(next, s.ctx);
        deleteSavedGameStorage(next.gameId);
        set({ endgameRecorded: true });
      } else {
        saveGame(
          summarizeSavedGame(next.gameId, next, {
            iAmHost: s.iAmHost,
            myPlayerId: s.myPlayerId ?? 'p1',
            roomCode: s.roomCode,
          }),
        );
      }
      return next;
    } catch (e) {
      if (e instanceof InvalidActionError) set({ lastError: e.reason });
      else set({ lastError: String(e) });
      return null;
    }
  }

  function handleIncomingMessage(msg: NetMessage): void {
    const s = get();
    switch (msg.type) {
      case 'HELLO': {
        // Only host handles HELLO — create the initial state now.
        if (s.mode !== 'host' || !s.pendingCreateOpts) return;
        const opts = s.pendingCreateOpts;
        const hostProfile = getProfiles().find((p) => p.id === opts.hostProfileId);
        if (!hostProfile) {
          set({ connectionError: 'Профиль хоста не найден' });
          return;
        }
        const hostColor: PlayerColor = 'red';
        const guestColor: PlayerColor = 'blue';
        const host: PlayerInit = {
          profileId: hostProfile.id,
          name: hostProfile.name,
          emoji: hostProfile.emoji,
          color: hostColor,
        };
        const guest: PlayerInit = {
          profileId: msg.profileId || `guest-${uuidv4()}`,
          name: msg.name || opts.opponentPlaceholderName,
          emoji: msg.emoji || opts.opponentPlaceholderEmoji,
          color: guestColor,
        };
        const state = createInitialState({
          gameId: uuidv4(),
          seed: Math.floor(Math.random() * 0x7fffffff),
          houseRules: opts.houseRules,
          players: { p1: host, p2: guest },
          ctx: get().ctx,
        });
        set({
          state,
          screen: 'game',
          myPlayerId: 'p1',
          connectionStatus: 'connected',
          pendingCreateOpts: null,
          endgameRecorded: false,
        });
        s.net?.send({ type: 'WELCOME', gameState: state, youAre: 'p2' });
        saveGame(
          summarizeSavedGame(state.gameId, state, {
            iAmHost: true,
            myPlayerId: 'p1',
            roomCode: s.roomCode,
          }),
        );
        return;
      }

      case 'WELCOME': {
        if (s.mode !== 'guest') return;
        set({
          state: msg.gameState,
          myPlayerId: msg.youAre,
          screen: 'game',
          connectionStatus: 'connected',
          endgameRecorded: false,
        });
        saveGame(
          summarizeSavedGame(msg.gameState.gameId, msg.gameState, {
            iAmHost: false,
            myPlayerId: msg.youAre,
            roomCode: s.roomCode,
          }),
        );
        return;
      }

      case 'ACTION': {
        // Only host processes ACTION — validate, apply, broadcast STATE or reject.
        if (s.mode !== 'host') return;
        const next = safelyApplyLocal(msg.action, msg.actor);
        if (next) {
          s.net?.send({ type: 'ACTION_ACK', nonce: msg.nonce, ok: true });
          s.net?.send({ type: 'STATE', gameState: next });
        } else {
          const reason = get().lastError ?? 'invalid';
          s.net?.send({
            type: 'ACTION_ACK',
            nonce: msg.nonce,
            ok: false,
            reason,
          });
        }
        return;
      }

      case 'ACTION_ACK': {
        if (!msg.ok) set({ lastError: msg.reason ?? 'Действие отклонено' });
        return;
      }

      case 'STATE': {
        if (s.mode !== 'guest') return;
        set({ state: msg.gameState, lastError: null });
        if (
          msg.gameState.phase === 'gameOver' &&
          !s.endgameRecorded
        ) {
          recordEndgameStats(msg.gameState, s.ctx);
          deleteSavedGameStorage(msg.gameState.gameId);
          set({ endgameRecorded: true });
        } else {
          saveGame(
            summarizeSavedGame(msg.gameState.gameId, msg.gameState, {
              iAmHost: false,
              myPlayerId: s.myPlayerId ?? 'p2',
              roomCode: s.roomCode,
            }),
          );
        }
        return;
      }

      case 'RESYNC_REQUEST': {
        if (s.mode !== 'host' || !s.state) return;
        s.net?.send({ type: 'STATE', gameState: s.state });
        return;
      }

      case 'PING':
        s.net?.send({ type: 'PONG', t: msg.t });
        return;

      case 'PONG':
        return;
    }
  }

  function attachNet(session: PeerSession): void {
    session.on((e) => {
      switch (e.type) {
        case 'peer-ready':
          set({
            connectionStatus:
              session.role === 'host' ? 'waiting-for-peer' : 'connecting',
          });
          break;
        case 'peer-connected':
          set({ connectionStatus: 'connected' });
          if (session.role === 'guest') {
            const joinCtx = (session as unknown as {
              __joinCtx?: { profileId: string };
            }).__joinCtx;
            if (joinCtx) {
              const p = getProfiles().find((x) => x.id === joinCtx.profileId);
              session.send({
                type: 'HELLO',
                profileId: p?.id ?? joinCtx.profileId,
                name: p?.name ?? 'Гость',
                emoji: p?.emoji ?? '🐺',
              });
            }
          }
          break;
        case 'peer-disconnected':
          set({ connectionStatus: 'disconnected' });
          break;
        case 'error':
          set({
            connectionStatus: 'error',
            connectionError: e.error.message,
          });
          break;
        case 'message':
          handleIncomingMessage(e.message);
          break;
      }
    });
  }

  // ---------- store body ----------

  return {
    screen: 'start',
    state: null,
    ctx,
    mode: 'offline',
    myPlayerId: null,
    iAmHost: true,
    roomCode: 'offline',
    net: null,
    connectionStatus: 'idle',
    connectionError: null,
    pendingCreateOpts: null,
    lastError: null,
    selectedRouteId: null,
    selectedCityId: null,
    endgameRecorded: false,

    goToScreen(screen) {
      set({ screen, lastError: null });
    },
    setError(lastError) {
      set({ lastError });
    },

    startNewGame(opts) {
      const { hostProfileId, opponentName, opponentEmoji, houseRules } = opts;
      const hostProfile = getProfiles().find((p) => p.id === hostProfileId);
      if (!hostProfile) {
        set({ lastError: 'Профиль не найден' });
        return;
      }

      const state = createInitialState({
        gameId: uuidv4(),
        seed: Math.floor(Math.random() * 0x7fffffff),
        houseRules,
        players: {
          p1: {
            profileId: hostProfile.id,
            name: hostProfile.name,
            emoji: hostProfile.emoji,
            color: 'red',
          },
          p2: {
            profileId: `guest-${uuidv4()}`,
            name: opponentName,
            emoji: opponentEmoji,
            color: opts.opponentColor ?? 'blue',
          },
        },
        ctx: get().ctx,
      });

      set({
        state,
        screen: 'game',
        mode: 'offline',
        myPlayerId: null,
        iAmHost: true,
        roomCode: 'offline',
        net: null,
        connectionStatus: 'idle',
        lastError: null,
        endgameRecorded: false,
      });
      saveGame(
        summarizeSavedGame(state.gameId, state, {
          iAmHost: true,
          myPlayerId: 'p1',
          roomCode: 'offline',
        }),
      );
    },

    loadGame(gameId) {
      const sg = getSavedGame(gameId);
      if (!sg) {
        set({ lastError: 'Партия не найдена' });
        return;
      }
      set({
        state: sg.state as GameState,
        screen: 'game',
        mode: 'offline', // resuming a P2P game locally means hot-seat unless reconnecting (future)
        myPlayerId: null,
        iAmHost: sg.iAmHost,
        roomCode: sg.roomCode,
        net: null,
        connectionStatus: 'idle',
        lastError: null,
        endgameRecorded: false,
      });
    },

    abandonCurrentGame() {
      const s = get();
      s.net?.destroy();
      set({
        state: null,
        screen: 'start',
        mode: 'offline',
        myPlayerId: null,
        net: null,
        connectionStatus: 'idle',
        selectedRouteId: null,
        selectedCityId: null,
      });
    },

    endCurrentGame() {
      const s = get();
      if (!s.state) {
        set({ screen: 'start' });
        return;
      }
      get().dispatch({ type: 'CONCEDE' }, s.state.turn);
    },

    dispatch(action, actor) {
      const s = get();
      if (!s.state) return;
      const actorId = actor ?? s.state.turn;

      // In networked mode, only the local player's own actions can be dispatched.
      if (s.mode !== 'offline' && s.myPlayerId && actorId !== s.myPlayerId) {
        set({ lastError: 'Сейчас ход соперника' });
        return;
      }

      if (s.mode === 'guest') {
        s.net?.send({
          type: 'ACTION',
          action,
          actor: actorId,
          nonce: uuidv4(),
        });
        return;
      }

      // offline or host — apply locally
      const next = safelyApplyLocal(action, actorId);
      if (next && s.mode === 'host') {
        s.net?.send({ type: 'STATE', gameState: next });
      }
    },

    applyRemoteState(state) {
      set({ state, lastError: null });
    },

    selectRoute(routeId) {
      set({ selectedRouteId: routeId, selectedCityId: null });
    },
    selectCity(cityId) {
      set({ selectedCityId: cityId, selectedRouteId: null });
    },

    createRoom(opts) {
      const code = generateRoomCode();
      const session = createHostSession(code);
      set({
        mode: 'host',
        iAmHost: true,
        myPlayerId: 'p1',
        net: session,
        roomCode: code,
        connectionStatus: 'connecting',
        connectionError: null,
        pendingCreateOpts: opts,
        screen: 'lobby',
        state: null,
      });
      attachNet(session);
    },

    joinRoom(opts) {
      const session = createGuestSession(opts.code);
      // Attach profile id to the session for the HELLO emit — see attachNet
      (session as any).__joinCtx = { profileId: opts.profileId };
      set({
        mode: 'guest',
        iAmHost: false,
        myPlayerId: null, // determined by WELCOME
        net: session,
        roomCode: opts.code.trim().toUpperCase(),
        connectionStatus: 'connecting',
        connectionError: null,
        screen: 'lobby',
        state: null,
      });
      attachNet(session);
    },

    leaveRoom() {
      const s = get();
      s.net?.destroy();
      set({
        mode: 'offline',
        net: null,
        connectionStatus: 'idle',
        screen: 'start',
        state: null,
        pendingCreateOpts: null,
      });
    },
  };
});

function recordEndgameStats(state: GameState, ctx: GameContext): void {
  const scores = calculateFinalScores(state, ctx);
  for (const id of ['p1', 'p2'] as PlayerId[]) {
    const player = state.players[id];
    const breakdown = id === 'p1' ? scores.p1 : scores.p2;
    const won = scores.winner === id;
    const draw = scores.winner === 'draw';
    const routesClaimed = state.claims.filter((c) => c.by === id).length;
    const longestSingleRoute = state.claims
      .filter((c) => c.by === id)
      .reduce((max, c) => {
        const r = ctx.routesById[c.routeId];
        return r ? Math.max(max, r.length) : max;
      }, 0);

    if (!player.profileId.startsWith('guest-')) {
      recordGameResult({
        profileId: player.profileId,
        finalScore: breakdown.total,
        won,
        draw,
        ticketsCompleted: breakdown.ticketsCompleted.length,
        ticketsMissed: breakdown.ticketsMissed.length,
        routesClaimed,
        longestSingleRoute,
      });
    }
  }
}
