import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT || 8080;
const MAX_MSG = 64 * 1024;
const rooms = new Map(); // room -> Map(connId -> { ws, name })

function roomOf(name) {
  if (!rooms.has(name)) rooms.set(name, new Map());
  return rooms.get(name);
}
function presence(room) {
  return [...room.values()].map(u => ({ name: u.name, ts: Date.now() }));
}
function broadcast(room, payload, exceptWs) {
  const data = JSON.stringify(payload);
  for (const u of room.values()) {
    if (u.ws.readyState === WebSocket.OPEN && u.ws !== exceptWs) u.ws.send(data);
  }
}
function sendPresence(room) {
  broadcast(room, { type: 'presence', peers: presence(room) });
}
function prune(roomName, room) {
  for (const [id, u] of room) {
    if (u.ws.readyState > 1) {
      room.delete(id);
      broadcast(room, { type: 'sys', text: `${u.name} saiu`, ts: Date.now() });
    }
  }
  if (!room.size) rooms.delete(roomName);
}

const server = http.createServer((req, res) => {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' };
  if (req.url === '/health') {
    res.writeHead(200, headers);
    res.end(JSON.stringify({
      ok: true,
      rooms: [...rooms.keys()],
      users: [...rooms.values()].reduce((s, r) => s + r.size, 0),
      uptime: process.uptime() | 0,
    }));
    return;
  }
  if (req.url === '/') {
    res.writeHead(200, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('SILVA XVI signaling server está ativo. Conecte via WebSocket /health para status.');
    return;
  }
  res.writeHead(404, headers);
  res.end('{"ok":false}');
});

const wss = new WebSocketServer({ server, maxPayload: MAX_MSG });

wss.on('connection', (ws, req) => {
  let roomName = null, name = null, connId = Math.random().toString(36).slice(2, 10);

  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw.toString()); } catch { return; }
    if (!m || typeof m.type !== 'string') return;

    if (m.type === 'join') {
      roomName = (m.room || 'default').toString().slice(0, 40);
      name = (m.name || 'Anon' + connId).toString().slice(0, 24);
      if (rooms.has(roomName)) prune(roomName, rooms.get(roomName));
      const room = roomOf(roomName);
      room.set(connId, { ws, name });
      broadcast(room, { type: 'sys', text: `${name} entrou 💙`, ts: Date.now() }, ws);
      ws.send(JSON.stringify({ type: 'welcome', you: connId, room: roomName }));
      sendPresence(room);
      return;
    }

    if (!roomName || !rooms.has(roomName)) return;
    const room = rooms.get(roomName);

    if (m.type === 'msg' || m.type === 'offer' || m.type === 'answer' || m.type === 'nudge') {
      if (raw.length > MAX_MSG) return;
      broadcast(room, { ...m, from: name, ts: m.ts || Date.now() }, ws);
      if (m.type === 'msg') sendPresence(room);
      return;
    }

    if (m.type === 'who') {
      ws.send(JSON.stringify({ type: 'presence', peers: presence(room) }));
    }
  });

  ws.on('close', () => {
    if (roomName && rooms.has(roomName)) {
      const room = rooms.get(roomName);
      broadcast(room, { type: 'sys', text: `${name || 'Alguém'} saiu`, ts: Date.now() });
      prune(roomName, room);
      if (rooms.has(roomName)) sendPresence(rooms.get(roomName));
    }
  });
  ws.on('error', () => {});
});

setInterval(() => { for (const [r, room] of rooms) prune(r, room); }, 30000);

server.listen(PORT, () => console.log(`🏛️ SILVA XVI signaling ativo na porta ${PORT}`));
