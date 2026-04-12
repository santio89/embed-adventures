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

  if (room.players.size === 0) {
    rooms.delete(room.code);
    return;
  }

  if (room.hostId === playerId) {
    room.hostId = room.players.keys().next().value;
  }

  io.to(room.code).emit('room_state', roomSnapshot(room));
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
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

const io = new Server(server, {
  cors: { origin: '*' },
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
      io.to(roomCode).emit('room_state', roomSnapshot(room));
    }, 3000);
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
    if (!p) return;
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
    if (!p) return;
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
  if (players.some(p => p.finished) || players.every(p => p.finished || !p.alive)) {
    endMatch(room);
  }
}

function endMatch(room) {
  const dur = room.matchDuration || 300;
  const players = [...room.players.values()];
  const finished = players.filter(p => p.finished).sort((a, b) => a.finishTime - b.finishTime);
  const alive = players.filter(p => !p.finished && p.alive).sort((a, b) => b.progress - a.progress);
  const dead = players.filter(p => !p.finished && !p.alive).sort((a, b) => b.progress - a.progress);
  const posBonus = [5000, 3000, 2000, 1500, 1000, 500, 250, 100];

  const rankings = [...finished, ...alive, ...dead].map((p, i) => {
    let s = posBonus[i] || 50;
    if (p.finished && p.finishTime) s += Math.max(0, Math.floor((dur * 1000 - p.finishTime) / 50));
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
  io.to(room.code).emit('room_state', roomSnapshot(room));
}

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL && room.state !== 'playing') {
      io.to(code).emit('room_closed');
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
