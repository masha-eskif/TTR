import type { Action } from '../game/actions';
import type { GameState, PlayerId } from '../game/types';

/** Messages exchanged between host and guest over the PeerJS data channel. */
export type NetMessage =
  | {
      type: 'HELLO';
      profileId: string;
      name: string;
      emoji: string;
    }
  | {
      type: 'WELCOME';
      gameState: GameState;
      youAre: PlayerId;
    }
  | {
      type: 'ACTION';
      action: Action;
      actor: PlayerId;
      nonce: string;
    }
  | {
      type: 'ACTION_ACK';
      nonce: string;
      ok: boolean;
      reason?: string;
    }
  | {
      type: 'STATE';
      gameState: GameState;
    }
  | {
      type: 'RESYNC_REQUEST';
    }
  | {
      type: 'PING';
      t: number;
    }
  | {
      type: 'PONG';
      t: number;
    };

export type NetMessageType = NetMessage['type'];
