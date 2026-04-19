import { Peer, type DataConnection } from 'peerjs';
import type { NetMessage } from './protocol';
import { codeToPeerId } from './roomCode';

export type PeerEvent =
  | { type: 'peer-ready'; id: string }
  | { type: 'peer-connected' }
  | { type: 'peer-disconnected' }
  | { type: 'message'; message: NetMessage }
  | { type: 'error'; error: Error };

export interface PeerSession {
  /** Peer ID as registered with the broker. */
  readonly id: string;
  /** Human-friendly 6-char code (no prefix). */
  readonly code: string;
  readonly role: 'host' | 'guest';
  /** Send a message to the other side. Silently no-op if not connected. */
  send(msg: NetMessage): void;
  /** Subscribe to session events. Returns unsubscribe. */
  on(handler: (e: PeerEvent) => void): () => void;
  /** True when the data channel is open. */
  isConnected(): boolean;
  /** Tear down the PeerJS peer and the data connection. */
  destroy(): void;
}

interface Subscribable {
  handlers: Set<(e: PeerEvent) => void>;
}

function makeEmitter(): {
  on: PeerSession['on'];
  emit: (e: PeerEvent) => void;
  sub: Subscribable;
} {
  const sub: Subscribable = { handlers: new Set() };
  return {
    on(handler) {
      sub.handlers.add(handler);
      return () => {
        sub.handlers.delete(handler);
      };
    },
    emit(e) {
      for (const h of sub.handlers) h(e);
    },
    sub,
  };
}

function wireConnection(
  conn: DataConnection,
  emit: (e: PeerEvent) => void,
  getStatus: () => { ready: boolean },
): void {
  conn.on('open', () => {
    getStatus().ready = true;
    emit({ type: 'peer-connected' });
  });
  conn.on('data', (data) => {
    emit({ type: 'message', message: data as NetMessage });
  });
  conn.on('close', () => {
    getStatus().ready = false;
    emit({ type: 'peer-disconnected' });
  });
  conn.on('error', (err) => {
    emit({ type: 'error', error: err as Error });
  });
}

/**
 * Create a host session: registers `code` as our peer ID and listens for a single guest to join.
 * The host awaits a `peer-ready` event before the code can be shown to the user.
 */
export function createHostSession(code: string): PeerSession {
  const { on, emit } = makeEmitter();
  const peerId = codeToPeerId(code);
  const peer = new Peer(peerId, { debug: 1 });
  let conn: DataConnection | null = null;
  const status = { ready: false };

  peer.on('open', (id) => {
    emit({ type: 'peer-ready', id });
  });
  peer.on('disconnected', () => {
    // Transient broker disconnect — silently reconnect
    try {
      peer.reconnect();
    } catch {
      /* noop */
    }
  });
  peer.on('error', (err) => {
    // Swallow transient broker errors; they'll retry via `disconnected`.
    const t = (err as unknown as { type?: string }).type;
    if (t === 'network' || t === 'disconnected') {
      try {
        peer.reconnect();
      } catch {
        /* noop */
      }
      return;
    }
    emit({ type: 'error', error: err as Error });
  });
  peer.on('connection', (c) => {
    if (conn) {
      c.close();
      return;
    }
    conn = c;
    wireConnection(c, emit, () => status);
  });

  return {
    id: peerId,
    code,
    role: 'host',
    send(msg) {
      if (conn && status.ready) conn.send(msg);
    },
    on,
    isConnected: () => status.ready,
    destroy: () => {
      try {
        conn?.close();
      } catch {
        /* noop */
      }
      try {
        peer.destroy();
      } catch {
        /* noop */
      }
    },
  };
}

/**
 * Create a guest session: generates a random peer ID, then dials `code`.
 */
export function createGuestSession(code: string): PeerSession {
  const { on, emit } = makeEmitter();
  const peer = new Peer({ debug: 1 });
  let conn: DataConnection | null = null;
  const status = { ready: false };

  peer.on('open', (id) => {
    emit({ type: 'peer-ready', id });
    conn = peer.connect(codeToPeerId(code), {
      reliable: true,
      serialization: 'json',
    });
    wireConnection(conn, emit, () => status);
  });
  peer.on('disconnected', () => {
    try {
      peer.reconnect();
    } catch {
      /* noop */
    }
  });
  peer.on('error', (err) => {
    const t = (err as unknown as { type?: string }).type;
    if (t === 'network' || t === 'disconnected') {
      try {
        peer.reconnect();
      } catch {
        /* noop */
      }
      return;
    }
    emit({ type: 'error', error: err as Error });
  });

  return {
    id: peer.id ?? '',
    code,
    role: 'guest',
    send(msg) {
      if (conn && status.ready) conn.send(msg);
    },
    on,
    isConnected: () => status.ready,
    destroy: () => {
      try {
        conn?.close();
      } catch {
        /* noop */
      }
      try {
        peer.destroy();
      } catch {
        /* noop */
      }
    },
  };
}
