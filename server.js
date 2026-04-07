const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav', '.ogg': 'audio/ogg',
};

const rooms = new Map();
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 10;
const ROOM_TTL = 30 * 60 * 1000;

function genCode() {
  let code = '';
  for (let i = 0; i < 5; i++) code += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
  return code;
}

function broadcast(room, msg, exclude) {
  const data = JSON.stringify(msg);
  for (const [pid, client] of room.clients) {
    if (pid !== exclude && client.readyState === 1) {
      client.send(data);
    }
  }
}

function broadcastAll(room, msg) {
  const data = JSON.stringify(msg);
  for (const [, client] of room.clients) {
    if (client.readyState === 1) client.send(data);
  }
}

function roomSnapshot(room) {
  return {
    type: 'room_state',
    code: room.code,
    hostId: room.hostId,
    state: room.state,
    startTime: room.startTime,
    matchDuration: room.matchDuration,
    rankings: room.rankings,
    players: Object.fromEntries(room.players),
  };
}

function removePlayer(room, playerId) {
  room.players.delete(playerId);
  room.clients.delete(playerId);

  if (room.players.size === 0) {
    rooms.delete(room.code);
    return;
  }

  if (room.hostId === playerId) {
    const first = room.players.keys().next().value;
    room.hostId = first;
  }

  broadcastAll(room, roomSnapshot(room));
}

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let playerId = null;
  let roomCode = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'create_room': {
        let code = genCode();
        while (rooms.has(code)) code = genCode();

        const playerData = {
          id: msg.playerId,
          name: (msg.name || 'Blobby').substring(0, 12),
          color: msg.color || 'lavender',
          progress: 0, finished: false, finishTime: null,
          alive: true, coins: 0, gameScore: 0,
        };

        const room = {
          code,
          hostId: msg.playerId,
          state: 'waiting',
          startTime: null,
          matchDuration: msg.matchDuration || 300,
          rankings: null,
          players: new Map([[msg.playerId, playerData]]),
          clients: new Map([[msg.playerId, ws]]),
          createdAt: Date.now(),
        };

        rooms.set(code, room);
        playerId = msg.playerId;
        roomCode = code;

        ws.send(JSON.stringify({ type: 'room_created', code }));
        ws.send(JSON.stringify(roomSnapshot(room)));
        break;
      }

      case 'join_room': {
        const code = (msg.code || '').toUpperCase();
        const room = rooms.get(code);

        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
          return;
        }
        if (room.state !== 'waiting') {
          ws.send(JSON.stringify({ type: 'error', message: 'Game already started' }));
          return;
        }
        if (room.players.size >= MAX_PLAYERS) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room full (max 10)' }));
          return;
        }

        const takenColors = [...room.players.values()].map(p => p.color);
        let color = msg.color || 'lavender';
        if (takenColors.includes(color)) {
          color = msg.fallbackColor || color;
        }

        const playerData = {
          id: msg.playerId,
          name: (msg.name || 'Blobby').substring(0, 12),
          color,
          progress: 0, finished: false, finishTime: null,
          alive: true, coins: 0, gameScore: 0,
        };

        room.players.set(msg.playerId, playerData);
        room.clients.set(msg.playerId, ws);
        playerId = msg.playerId;
        roomCode = code;

        ws.send(JSON.stringify({ type: 'room_joined', code, color }));
        broadcastAll(room, roomSnapshot(room));
        break;
      }

      case 'update_color': {
        const room = rooms.get(roomCode);
        if (!room || !playerId) return;
        const p = room.players.get(playerId);
        if (p) {
          p.color = msg.color;
          broadcastAll(room, roomSnapshot(room));
        }
        break;
      }

      case 'start_game': {
        const room = rooms.get(roomCode);
        if (!room || room.hostId !== playerId) return;

        room.state = 'countdown';
        broadcastAll(room, roomSnapshot(room));

        setTimeout(() => {
          if (room.state !== 'countdown') return;
          room.state = 'playing';
          room.startTime = Date.now();
          for (const [, p] of room.players) {
            p.progress = 0;
            p.finished = false;
            p.finishTime = null;
            p.alive = true;
            p.coins = 0;
            p.gameScore = 0;
          }
          broadcastAll(room, roomSnapshot(room));
        }, 3000);
        break;
      }

      case 'progress': {
        const room = rooms.get(roomCode);
        if (!room || !playerId) return;
        const p = room.players.get(playerId);
        if (!p || p.finished || !p.alive) return;
        p.progress = Math.min(1, msg.progress || 0);
        p.coins = msg.coins || 0;
        p.gameScore = msg.gameScore || 0;
        broadcastAll(room, roomSnapshot(room));
        break;
      }

      case 'player_finished': {
        const room = rooms.get(roomCode);
        if (!room || !playerId) return;
        const p = room.players.get(playerId);
        if (!p) return;
        p.finished = true;
        p.finishTime = msg.finishTime || (Date.now() - (room.startTime || Date.now()));
        p.progress = 1;
        p.coins = msg.coins || 0;
        p.gameScore = msg.gameScore || 0;
        broadcastAll(room, roomSnapshot(room));
        checkMatchEnd(room);
        break;
      }

      case 'player_died': {
        const room = rooms.get(roomCode);
        if (!room || !playerId) return;
        const p = room.players.get(playerId);
        if (!p) return;
        p.alive = false;
        p.coins = msg.coins || 0;
        p.gameScore = msg.gameScore || 0;
        p.progress = Math.min(1, msg.progress || 0);
        broadcastAll(room, roomSnapshot(room));
        checkMatchEnd(room);
        break;
      }

      case 'return_to_lobby': {
        const room = rooms.get(roomCode);
        if (!room || room.hostId !== playerId) return;
        room.state = 'waiting';
        room.startTime = null;
        room.rankings = null;
        for (const [, p] of room.players) {
          p.progress = 0;
          p.finished = false;
          p.finishTime = null;
          p.alive = true;
          p.coins = 0;
          p.gameScore = 0;
        }
        broadcastAll(room, roomSnapshot(room));
        break;
      }

      case 'leave_room': {
        const room = rooms.get(roomCode);
        if (room && playerId) removePlayer(room, playerId);
        playerId = null;
        roomCode = null;
        break;
      }
    }
  });

  ws.on('close', () => {
    if (roomCode && playerId) {
      const room = rooms.get(roomCode);
      if (room) removePlayer(room, playerId);
    }
  });
});

function checkMatchEnd(room) {
  if (room.state !== 'playing') return;
  const players = [...room.players.values()];
  if (players.length === 0) return;
  const anyFinished = players.some(p => p.finished);
  const allDone = players.every(p => p.finished || !p.alive);
  if (anyFinished || allDone) {
    endMatch(room);
  }
}

function endMatch(room) {
  const MATCH_DURATION = room.matchDuration || 300;
  const players = [...room.players.values()];
  const finished = players.filter(p => p.finished).sort((a, b) => a.finishTime - b.finishTime);
  const alive = players.filter(p => !p.finished && p.alive).sort((a, b) => b.progress - a.progress);
  const dead = players.filter(p => !p.finished && !p.alive).sort((a, b) => b.progress - a.progress);
  const posBonus = [5000, 3000, 2000, 1500, 1000, 500, 250, 100];

  const rankings = [...finished, ...alive, ...dead].map((p, i) => {
    let s = posBonus[i] || 50;
    if (p.finished && p.finishTime) s += Math.max(0, Math.floor((MATCH_DURATION * 1000 - p.finishTime) / 50));
    s += (p.coins || 0) * 200;
    s += (p.gameScore || 0);
    if (!p.finished) s += Math.floor((p.progress || 0) * 2000);
    return {
      id: p.id, name: p.name, color: p.color || 'lavender',
      progress: p.progress, finished: p.finished, finishTime: p.finishTime,
      alive: p.alive, coins: p.coins, gameScore: p.gameScore,
      rank: i + 1, finalScore: s,
    };
  });

  room.state = 'finished';
  room.rankings = rankings;
  broadcastAll(room, roomSnapshot(room));
}

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL && room.state !== 'playing') {
      broadcastAll(room, { type: 'room_closed' });
      rooms.delete(code);
    }
    if (room.state === 'playing' && room.startTime) {
      const elapsed = (now - room.startTime) / 1000;
      if (elapsed >= (room.matchDuration || 300)) {
        endMatch(room);
      }
    }
  }
}, 5000);

server.listen(PORT, () => {
  console.log(`Embeddablob Adventures server running on port ${PORT}`);
});
