import type { NetMessage } from './protocol';

export type PeerEvent =
  | { type: 'peer-ready'; id: string }
  | { type: 'peer-connected' }
  | { type: 'peer-disconnected' }
  | { type: 'message'; message: NetMessage }
  | { type: 'error'; error: Error };

export interface PeerSession {
  readonly id: string;
  readonly code: string;
  readonly role: 'host' | 'guest';
  send(msg: NetMessage): void;
  on(handler: (e: PeerEvent) => void): () => void;
  isConnected(): boolean;
  destroy(): void;
}

// WebSocket-релей. URL можно переопределить через VITE_RELAY_URL (например,
// ws://localhost:8080 при локальной разработке).
const RELAY_URL: string =
  (import.meta.env.VITE_RELAY_URL as string | undefined) ??
  'wss://ttr-relay.onrender.com';

// Бесплатный Render засыпает после 15 мин простоя и просыпается 30-50 сек —
// поэтому таймаут подключения щедрый.
const CONNECT_TIMEOUT_MS = 60_000;

interface RelayEnvelope {
  type: string;
  [k: string]: unknown;
}

function createSession(code: string, role: 'host' | 'guest'): PeerSession {
  const handlers = new Set<(e: PeerEvent) => void>();
  const emit = (e: PeerEvent): void => {
    for (const h of handlers) h(e);
  };

  let ws: WebSocket;
  try {
    ws = new WebSocket(RELAY_URL);
  } catch (err) {
    // Дефолт возвращаем синхронно, чтобы совпадал контракт старого API, —
    // ошибку шлём асинхронно, когда подписчики успеют подписаться.
    setTimeout(() => {
      emit({
        type: 'error',
        error: new Error(`Не удалось открыть WebSocket: ${(err as Error).message}`),
      });
    }, 0);
    return inertSession(code, role, handlers);
  }

  let ready = false;
  let destroyed = false;
  let connectTimer: ReturnType<typeof setTimeout> | null = null;

  const tag = `[ttr-net/${role}/${code}]`;
  console.log(`${tag} opening WebSocket ${RELAY_URL}`);

  ws.addEventListener('open', () => {
    console.log(`${tag} WS open, sending join`);
    ws.send(JSON.stringify({ type: 'join', code, role }));
    emit({ type: 'peer-ready', id: role });

    connectTimer = setTimeout(() => {
      connectTimer = null;
      if (!ready && !destroyed) {
        console.warn(`${tag} connect timeout — no peer-connected received`);
        emit({
          type: 'error',
          error: new Error(
            role === 'host'
              ? 'Соперник не подключился за 60 секунд. Проверьте, что он ввёл правильный код.'
              : 'Не удалось подключиться за 60 секунд. Проверьте код комнаты и интернет.',
          ),
        });
      }
    }, CONNECT_TIMEOUT_MS);
  });

  ws.addEventListener('message', (ev) => {
    if (destroyed) return;
    let env: RelayEnvelope;
    try {
      const raw = typeof ev.data === 'string' ? ev.data : '';
      env = JSON.parse(raw) as RelayEnvelope;
    } catch {
      return;
    }

    switch (env.type) {
      case 'joined':
        console.log(`${tag} joined room`);
        return;
      case 'peer-connected':
        console.log(`${tag} peer connected`);
        ready = true;
        if (connectTimer) {
          clearTimeout(connectTimer);
          connectTimer = null;
        }
        emit({ type: 'peer-connected' });
        return;
      case 'peer-disconnected':
        console.log(`${tag} peer disconnected`);
        ready = false;
        emit({ type: 'peer-disconnected' });
        return;
      case 'relay-error':
        console.warn(`${tag} relay-error:`, env.error);
        emit({
          type: 'error',
          error: new Error(String(env.error ?? 'Ошибка релея')),
        });
        return;
      default:
        emit({ type: 'message', message: env as unknown as NetMessage });
    }
  });

  ws.addEventListener('error', (ev) => {
    if (destroyed) return;
    console.error(`${tag} WS error`, ev);
    emit({
      type: 'error',
      error: new Error(
        'Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз через минуту.',
      ),
    });
  });

  ws.addEventListener('close', (ev) => {
    if (destroyed) return;
    console.log(`${tag} WS close`, ev.code, ev.reason);
    if (connectTimer) {
      clearTimeout(connectTimer);
      connectTimer = null;
    }
    if (ready) {
      ready = false;
      emit({ type: 'peer-disconnected' });
    }
  });

  return {
    id: role,
    code,
    role,
    send(msg) {
      if (ready && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    },
    on(handler) {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
    isConnected: () => ready,
    destroy() {
      destroyed = true;
      if (connectTimer) {
        clearTimeout(connectTimer);
        connectTimer = null;
      }
      try {
        ws.close();
      } catch {
        /* noop */
      }
    },
  };
}

function inertSession(
  code: string,
  role: 'host' | 'guest',
  handlers: Set<(e: PeerEvent) => void>,
): PeerSession {
  return {
    id: role,
    code,
    role,
    send: () => {},
    on(handler) {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
    isConnected: () => false,
    destroy: () => {},
  };
}

export function createHostSession(code: string): PeerSession {
  return createSession(code, 'host');
}

export function createGuestSession(code: string): PeerSession {
  return createSession(code, 'guest');
}
