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

// STUN + free public TURN relays. TURN is required when both peers sit behind
// symmetric NATs (mobile data, some corporate/home routers) where plain STUN
// hole-punching cannot find a direct path.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:openrelay.metered.ca:80' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

const PEER_OPTIONS = {
  debug: 1,
  config: { iceServers: ICE_SERVERS },
} as const;

const CONNECT_TIMEOUT_MS = 20_000;

function describePeerError(err: unknown): string {
  const type = (err as { type?: string } | null)?.type;
  switch (type) {
    case 'peer-unavailable':
      return 'Хост не найден. Проверьте код или попросите соперника создать комнату заново.';
    case 'unavailable-id':
      return 'Такой код уже занят. Создайте комнату заново, чтобы получить новый.';
    case 'browser-incompatible':
      return 'Браузер не поддерживает WebRTC.';
    case 'server-error':
      return 'Сервер подключения недоступен. Попробуйте ещё раз через минуту.';
    case 'ssl-unavailable':
      return 'Проблема с SSL на сервере подключения.';
    case 'socket-error':
    case 'socket-closed':
      return 'Обрыв связи с сервером подключения.';
    case 'webrtc':
      return 'Не удалось установить WebRTC-соединение. Возможно, сеть блокирует P2P.';
    default: {
      const msg = (err as { message?: string } | null)?.message;
      return msg || 'Неизвестная ошибка подключения.';
    }
  }
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
    emit({ type: 'error', error: new Error(describePeerError(err)) });
  });
}

/**
 * Create a host session: registers `code` as our peer ID and listens for a single guest to join.
 * The host awaits a `peer-ready` event before the code can be shown to the user.
 */
export function createHostSession(code: string): PeerSession {
  const { on, emit } = makeEmitter();
  const peerId = codeToPeerId(code);
  const peer = new Peer(peerId, PEER_OPTIONS);
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
    const t = (err as unknown as { type?: string }).type;
    if (t === 'network' || t === 'disconnected') {
      try {
        peer.reconnect();
      } catch {
        /* noop */
      }
      return;
    }
    emit({ type: 'error', error: new Error(describePeerError(err)) });
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
  const peer = new Peer(PEER_OPTIONS);
  let conn: DataConnection | null = null;
  const status = { ready: false };
  let connectTimer: ReturnType<typeof setTimeout> | null = null;

  peer.on('open', (id) => {
    emit({ type: 'peer-ready', id });
    conn = peer.connect(codeToPeerId(code), {
      reliable: true,
      serialization: 'json',
    });
    wireConnection(conn, emit, () => status);
    connectTimer = setTimeout(() => {
      connectTimer = null;
      if (!status.ready) {
        emit({
          type: 'error',
          error: new Error(
            'Не удалось установить соединение за 20 сек. Возможно, сеть блокирует WebRTC или хост отключился.',
          ),
        });
      }
    }, CONNECT_TIMEOUT_MS);
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
    emit({ type: 'error', error: new Error(describePeerError(err)) });
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
      if (connectTimer) {
        clearTimeout(connectTimer);
        connectTimer = null;
      }
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
