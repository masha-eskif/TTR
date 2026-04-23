import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT) || 8080;

// code -> { host?: WebSocket, guest?: WebSocket }
const rooms = new Map();

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('TTR relay is running. Connect via WebSocket.');
});

const wss = new WebSocketServer({ server: httpServer });

function send(ws, obj) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  let joined = null; // { code, role }

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: 'relay-error', error: 'invalid json' });
      ws.close(1003, 'invalid json');
      return;
    }

    // First message must be 'join'.
    if (!joined) {
      if (msg.type !== 'join' || typeof msg.code !== 'string' || (msg.role !== 'host' && msg.role !== 'guest')) {
        send(ws, { type: 'relay-error', error: 'expected join {code, role}' });
        ws.close(1003, 'expected join');
        return;
      }
      const code = msg.code.toUpperCase();
      const room = rooms.get(code) ?? {};
      if (room[msg.role]) {
        send(ws, { type: 'relay-error', error: `${msg.role} already in room ${code}` });
        ws.close(1008, 'slot busy');
        return;
      }
      room[msg.role] = ws;
      rooms.set(code, room);
      joined = { code, role: msg.role };
      send(ws, { type: 'joined', role: msg.role, code });
      console.log(`[${code}] ${msg.role} joined (${wss.clients.size} clients total)`);

      // If both sides are in the room — notify both
      if (room.host && room.guest) {
        send(room.host, { type: 'peer-connected' });
        send(room.guest, { type: 'peer-connected' });
        console.log(`[${code}] both peers connected`);
      }
      return;
    }

    // Already joined — relay to the partner as-is.
    const room = rooms.get(joined.code);
    if (!room) return;
    const peer = joined.role === 'host' ? room.guest : room.host;
    if (peer && peer.readyState === peer.OPEN) {
      peer.send(raw.toString());
    }
  });

  ws.on('close', () => {
    if (!joined) return;
    const room = rooms.get(joined.code);
    if (!room) return;
    if (room[joined.role] === ws) {
      delete room[joined.role];
    }
    const peer = joined.role === 'host' ? room.guest : room.host;
    if (peer && peer.readyState === peer.OPEN) {
      send(peer, { type: 'peer-disconnected' });
    }
    if (!room.host && !room.guest) {
      rooms.delete(joined.code);
      console.log(`[${joined.code}] room closed`);
    } else {
      console.log(`[${joined.code}] ${joined.role} left`);
    }
  });
});

// Heartbeat: drop zombie connections every 30s.
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      /* noop */
    }
  }
}, 30_000);

wss.on('close', () => clearInterval(heartbeat));

httpServer.listen(PORT, () => {
  console.log(`TTR relay listening on :${PORT}`);
});
