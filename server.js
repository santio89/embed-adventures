const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav', '.ogg': 'audio/ogg',
};

const rooms = new Map();
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 50;
const ROOM_TTL = 30 * 60 * 1000;

// Real-time co-presence: each client streams its own position/animation
// at WORLD_TICK_HZ. The server stores only the most recent state per
// player and rebroadcasts a single combined snapshot to the room at the
// same rate. This keeps outbound traffic at one message-per-tick-per-room
// instead of N×N relays, which scales comfortably to 50-player rooms.
//
// 30 Hz is the action-game sweet spot: combined with cubic-Hermite
// interpolation on the client, remote players move indistinguishably
// from local — but bandwidth stays modest (one merged snapshot/tick
// instead of N relays). Tunable; see REMOTE_SEND_HZ on the client.
const WORLD_TICK_HZ = 30;
const WORLD_TICK_MS = Math.round(1000 / WORLD_TICK_HZ);
// Drop a player from the broadcast snapshot if we haven't heard from
// them in this window (covers idle/disconnected/eliminated players).
const STATE_STALE_MS = 4000;

function genCode() {
  let code = '';
  for (let i = 0; i < 5; i++) code += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
  return code;
}

function roomSnapshot(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    state: room.state,
    startTime: room.startTime,
    matchDuration: room.matchDuration,
    rankings: room.rankings,
    players: Object.fromEntries(room.players),
  };
}

function removePlayer(io, room, playerId) {
  room.players.delete(playerId);
  if (room.live) room.live.delete(playerId);

  if (room.players.size === 0) {
    stopWorldTick(room);
    rooms.delete(room.code);
    return;
  }

  if (room.hostId === playerId) {
    room.hostId = room.players.keys().next().value;
  }

  io.to(room.code).emit('room_state', roomSnapshot(room));
  if (room.state === 'playing') checkMatchEnd(room);
}

// ---- Realtime world-tick broadcast --------------------------------
// Quantize a number to a 16-bit signed range. Player coords are in
// pixels and the playable level is well under 32k px wide, so int16
// is plenty of precision for rendering.
function clampInt16(n) {
  n = n | 0;
  if (n > 32767) return 32767;
  if (n < -32768) return -32768;
  return n;
}

function startWorldTick(io, room) {
  if (room.tickInterval) return;
  room.live = room.live || new Map();
  room.tickInterval = setInterval(() => {
    if (room.state !== 'playing') return;
    const cutoff = Date.now() - STATE_STALE_MS;
    const arr = [];
    for (const [id, s] of room.live) {
      if (!s || s.seenAt < cutoff) continue;
      arr.push({
        i: id,
        x: clampInt16(s.x),
        y: clampInt16(s.y),
        // vx/vy fit comfortably in a small int. Quantized to quarter-px
        // resolution which is invisible at 60fps but cuts payload size.
        // vx range ~±6 px/frame (run); vy range ~±12 (jump apex / fall).
        v: Math.max(-40, Math.min(40, Math.round(s.vx * 4))) / 4,
        w: Math.max(-64, Math.min(64, Math.round(s.vy * 4))) / 4,
        f: s.facing < 0 ? -1 : 1,
        a: s.anim & 0x0f,
        n: s.frame & 0xff,
        s: s.size & 0x03,
        st: s.star ? 1 : 0,
        d: s.dead ? 1 : 0,
      });
    }
    if (arr.length === 0) return;
    io.to(room.code).emit('world_tick', { t: Date.now(), p: arr });
  }, WORLD_TICK_MS);
}

function stopWorldTick(room) {
  if (room.tickInterval) {
    clearInterval(room.tickInterval);
    room.tickInterval = null;
  }
  if (room.live) room.live.clear();
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': mime,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    });
    res.end(data);
  });
});

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

io.on('connection', (socket) => {
  let playerId = null;
  let roomCode = null;

  socket.on('create_room', (msg, ack) => {
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
      live: new Map(),
      tickInterval: null,
      createdAt: Date.now(),
    };

    rooms.set(code, room);
    playerId = msg.playerId;
    roomCode = code;
    socket.join(code);

    if (typeof ack === 'function') ack({ ok: true, code });
    socket.emit('room_state', roomSnapshot(room));
  });

  socket.on('join_room', (msg, ack) => {
    const code = (msg.code || '').toUpperCase();
    const room = rooms.get(code);

    if (!room) { if (typeof ack === 'function') ack({ ok: false, error: 'Room not found' }); return; }
    if (room.state !== 'waiting') { if (typeof ack === 'function') ack({ ok: false, error: 'Game already started' }); return; }
    if (room.players.size >= MAX_PLAYERS) { if (typeof ack === 'function') ack({ ok: false, error: 'Room full (max ' + MAX_PLAYERS + ')' }); return; }

    const color = msg.color || 'lavender';

    const playerData = {
      id: msg.playerId,
      name: (msg.name || 'Blobby').substring(0, 12),
      color,
      progress: 0, finished: false, finishTime: null,
      alive: true, coins: 0, gameScore: 0,
    };

    room.players.set(msg.playerId, playerData);
    playerId = msg.playerId;
    roomCode = code;
    socket.join(code);

    if (typeof ack === 'function') ack({ ok: true, code, color });
    io.to(code).emit('room_state', roomSnapshot(room));
  });

  socket.on('update_color', (msg) => {
    const room = rooms.get(roomCode);
    if (!room || !playerId) return;
    const p = room.players.get(playerId);
    if (p) {
      p.color = msg.color;
      io.to(roomCode).emit('room_state', roomSnapshot(room));
    }
  });

  socket.on('start_game', () => {
    const room = rooms.get(roomCode);
    if (!room || room.hostId !== playerId) return;

    room.state = 'countdown';
    io.to(roomCode).emit('room_state', roomSnapshot(room));

    setTimeout(() => {
      if (room.state !== 'countdown') return;
      room.state = 'playing';
      room.startTime = Date.now();
      for (const [, p] of room.players) {
        p.progress = 0; p.finished = false; p.finishTime = null;
        p.alive = true; p.coins = 0; p.gameScore = 0;
      }
      if (room.live) room.live.clear();
      startWorldTick(io, room);
      io.to(roomCode).emit('room_state', roomSnapshot(room));
    }, 3000);
  });

  // Realtime per-player position / animation update. Cheap: we just
  // overwrite the latest entry for this player. Broadcast happens on the
  // shared room tick, not here.
  socket.on('player_state', (msg) => {
    const room = rooms.get(roomCode);
    if (!room || !playerId || room.state !== 'playing') return;
    if (!room.players.has(playerId)) return;
    if (!msg || typeof msg !== 'object') return;
    if (!room.live) room.live = new Map();
    room.live.set(playerId, {
      x: +msg.x || 0,
      y: +msg.y || 0,
      vx: +msg.vx || 0,
      vy: +msg.vy || 0,
      facing: msg.facing < 0 ? -1 : 1,
      anim: (msg.anim | 0) & 0x0f,
      frame: (msg.frame | 0) & 0xff,
      size: (msg.size | 0) & 0x03,
      star: msg.star ? 1 : 0,
      dead: msg.dead ? 1 : 0,
      seenAt: Date.now(),
    });
  });

  socket.on('progress', (msg) => {
    const room = rooms.get(roomCode);
    if (!room || !playerId) return;
    const p = room.players.get(playerId);
    if (!p || p.finished || !p.alive) return;
    p.progress = Math.min(1, msg.progress || 0);
    p.coins = msg.coins || 0;
    p.gameScore = msg.gameScore || 0;
    io.to(roomCode).emit('room_state', roomSnapshot(room));
  });

  socket.on('player_finished', (msg) => {
    const room = rooms.get(roomCode);
    if (!room || !playerId) return;
    const p = room.players.get(playerId);
    if (!p || p.finished) return;
    p.finished = true;
    p.finishTime = msg.finishTime || (Date.now() - (room.startTime || Date.now()));
    p.progress = 1;
    p.coins = msg.coins || 0;
    p.gameScore = msg.gameScore || 0;
    io.to(roomCode).emit('room_state', roomSnapshot(room));
    checkMatchEnd(room);
  });

  socket.on('player_died', (msg) => {
    const room = rooms.get(roomCode);
    if (!room || !playerId) return;
    const p = room.players.get(playerId);
    if (!p || !p.alive) return;
    p.alive = false;
    p.coins = msg.coins || 0;
    p.gameScore = msg.gameScore || 0;
    p.progress = Math.min(1, msg.progress || 0);
    io.to(roomCode).emit('room_state', roomSnapshot(room));
    socket.to(roomCode).emit('player_eliminated', { name: p.name });
    checkMatchEnd(room);
  });

  socket.on('return_to_lobby', () => {
    const room = rooms.get(roomCode);
    if (!room || room.hostId !== playerId) return;
    room.state = 'waiting';
    room.startTime = null;
    room.rankings = null;
    for (const [, p] of room.players) {
      p.progress = 0; p.finished = false; p.finishTime = null;
      p.alive = true; p.coins = 0; p.gameScore = 0;
    }
    stopWorldTick(room);
    io.to(roomCode).emit('room_state', roomSnapshot(room));
  });

  socket.on('leave_room', () => {
    if (!roomCode || !playerId) return;
    const room = rooms.get(roomCode);
    socket.leave(roomCode);
    if (room) removePlayer(io, room, playerId);
    playerId = null;
    roomCode = null;
  });

  socket.on('disconnect', () => {
    if (roomCode && playerId) {
      const room = rooms.get(roomCode);
      if (room) removePlayer(io, room, playerId);
    }
  });
});

function checkMatchEnd(room) {
  if (room.state !== 'playing') return;
  const players = [...room.players.values()];
  if (players.length === 0) return;

  // Safety: never end a match that has been running less than 30 seconds.
  // This prevents any edge case where timestamps / player-state gets
  // corrupted early (e.g. startTime = null evaluates to epoch epoch).
  const elapsed = room.startTime ? (Date.now() - room.startTime) / 1000 : 0;
  if (elapsed < 30) return;

  // DQ'd players (dead / disconnected) are ignored.
  // The match ends only when EVERY active (alive) player has finished.
  const active = players.filter(p => p.alive);
  if (active.length > 0 && active.every(p => p.finished)) {
    endMatch(room);
  }
}

function endMatch(room) {
  const dur = room.matchDuration || 300;
  const players = [...room.players.values()];
  const finished = players.filter(p => p.finished).sort((a, b) => a.finishTime - b.finishTime);
  const alive = players.filter(p => !p.finished && p.alive).sort((a, b) => b.progress - a.progress);
  const dead = players.filter(p => !p.finished && !p.alive).sort((a, b) => b.progress - a.progress);

  const rankings = [...finished, ...alive, ...dead].map((p, i) => {
    let s = 0;
    if (p.finished) {
      s = 30000;
      if (p.finishTime != null) {
        s += Math.max(0, Math.floor((dur * 1000 - p.finishTime) / 50));
      }
    } else {
      s += Math.floor(Math.min(8000, (p.progress || 0) * 8000));
    }
    s += (p.coins || 0) * 200;
    s += (p.gameScore || 0);
    return {
      id: p.id, name: p.name, color: p.color || 'lavender',
      progress: p.progress, finished: p.finished, finishTime: p.finishTime,
      alive: p.alive, coins: p.coins, gameScore: p.gameScore,
      rank: i + 1, finalScore: s,
    };
  });

  room.state = 'finished';
  room.rankings = rankings;
  stopWorldTick(room);
  io.to(room.code).emit('room_state', roomSnapshot(room));
}

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL && room.state !== 'playing') {
      io.to(code).emit('room_closed');
      stopWorldTick(room);
      rooms.delete(code);
    }
    if (room.state === 'playing' && room.startTime) {
      if ((now - room.startTime) / 1000 >= (room.matchDuration || 300)) {
        endMatch(room);
      }
    }
  }
}, 5000);

function findFreePort(startPort, retries) {
  return new Promise((resolve, reject) => {
    const probe = require('net').createServer();
    probe.once('error', (err) => {
      if (err.code === 'EADDRINUSE' && retries > 0) {
        console.log(`Port ${startPort} in use, trying ${startPort + 1}...`);
        resolve(findFreePort(startPort + 1, retries - 1));
      } else {
        reject(err);
      }
    });
    probe.once('listening', () => {
      probe.close(() => resolve(startPort));
    });
    probe.listen(startPort);
  });
}

const startPort = parseInt(process.env.PORT, 10) || 3000;
findFreePort(startPort, 20).then((port) => {
  server.listen(port, () => {
    console.log(`Embeddablob Adventures server running on http://localhost:${port}`);
  });
}).catch((err) => {
  console.error(`Could not find a free port: ${err.message}`);
  process.exit(1);
});
