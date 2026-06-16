// ================================================================
// EMBEDDABLE INTEGRATION
// ================================================================
// When embedded via embeddables, game.js loads before React renders
// the CustomHTML containing the canvas. This IIFE polls for the
// canvas element before initializing. Set GAME_SERVER_URL to the
// Render multiplayer server; leave empty for same-origin (standalone).
var GAME_SERVER_URL = window.GAME_SERVER_URL ||
  (location.hostname === 'embed-adventures.onrender.com' ? '' : 'https://embed-adventures.onrender.com');

(function _embeddableBootstrap() {
if (!document.getElementById('gameCanvas')) {
  setTimeout(_embeddableBootstrap, 80);
  return;
}

// ================================================================
// EVENT BUS
// ================================================================
// Engine events. Glue files (standalone-glue.js, embeddable-glue.js)
// subscribe to these and translate them into UI updates so the engine
// stays DOM-agnostic for menus.
//
// Events emitted by the engine:
//   lobby_state       { code, players, isHost, takenColors }
//   countdown_started ()
//   match_started     ()
//   race_progress     { players }
//   match_finished    { rankings, isHost }
//   room_closed       ()
//   create_room_pending      ()
//   create_room_failed       { error }
//   join_room_pending        ()
//   join_room_failed         { error }
//   paused / unpaused        ()
//   quit_to_menu             ()
//   scanlines_changed        { on }
//   engine_ready             ()
var _listeners = Object.create(null);
function on(evt, fn) {
  if (!_listeners[evt]) _listeners[evt] = [];
  _listeners[evt].push(fn);
  return function unsub() { off(evt, fn); };
}
function off(evt, fn) {
  var arr = _listeners[evt];
  if (!arr) return;
  var i = arr.indexOf(fn);
  if (i >= 0) arr.splice(i, 1);
}
function emit(evt, payload) {
  var arr = _listeners[evt];
  if (!arr) return;
  for (var i = 0; i < arr.length; i++) {
    try { arr[i](payload); }
    catch (e) { try { console.error('[engine] listener for ' + evt + ' threw:', e); } catch (_) {} }
  }
}

function emitBlockEvent(type, key) {
  if (!multiplayerMode || !ws) return;
  ws.emit('block_event', { [type]: key });
}

function sendEntityKill(data) {
  if (!multiplayerMode || !ws) return;
  ws.emit('entity_kill', data);
}

// ================================================================
// CANVAS SETUP
// ================================================================
const canvas = document.getElementById('gameCanvas');
const TILE = 16;
const VIEW_W = 256;
const VIEW_H = 240;
const ASPECT = VIEW_W / VIEW_H;
const dpr = window.devicePixelRatio || 1;

const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = true;

var scanlinesOn = localStorage.getItem('crtOn') === 'true';

const wrapper = document.getElementById('gameWrapper');
const crtCanvas = document.getElementById('crtOverlay');
const crtCtx = crtCanvas.getContext('2d');
function resizeCanvas() {
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  let w, h;
  if (maxW / maxH > ASPECT) {
    h = maxH;
    w = Math.floor(h * ASPECT);
  } else {
    w = maxW;
    h = Math.floor(w / ASPECT);
  }
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  wrapper.style.width = w + 'px';
  wrapper.style.height = h + 'px';
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.imageSmoothingEnabled = true;
  crtCanvas.width = Math.floor(w * dpr);
  crtCanvas.height = Math.floor(h * dpr);
  applyCrt();
}
resizeCanvas();
wrapper.classList.add('ready');
window.addEventListener('resize', resizeCanvas);
// Initial scanlines state is emitted later, after the event bus is
// declared, so glue files can subscribe to it before it fires.

const RES = 2;
const buf = document.createElement('canvas');
buf.width = VIEW_W * RES;
buf.height = VIEW_H * RES;
const bx = buf.getContext('2d');
bx.imageSmoothingEnabled = false;
bx.scale(RES, RES);

function applyCrt() {
  if (!scanlinesOn) {
    crtCanvas.style.display = 'none';
    return;
  }
  crtCanvas.style.display = '';
  var w = crtCanvas.width, h = crtCanvas.height;
  if (!w || !h) return;
  crtCtx.clearRect(0, 0, w, h);

  var lineH = Math.max(2, h / VIEW_H);
  var scanTile = document.createElement('canvas');
  scanTile.width = 1;
  scanTile.height = Math.round(lineH * 2);
  var stx = scanTile.getContext('2d');
  var sg = stx.createLinearGradient(0, 0, 0, scanTile.height);
  sg.addColorStop(0, 'rgba(0,0,0,0)');
  sg.addColorStop(0.35, 'rgba(0,0,0,0)');
  sg.addColorStop(0.5, 'rgba(0,0,0,0.045)');
  sg.addColorStop(0.65, 'rgba(0,0,0,0)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  stx.fillStyle = sg;
  stx.fillRect(0, 0, 1, scanTile.height);
  crtCtx.fillStyle = crtCtx.createPattern(scanTile, 'repeat');
  crtCtx.fillRect(0, 0, w, h);

  var pw = Math.max(3, Math.round(w / VIEW_W));
  var rgbTile = document.createElement('canvas');
  rgbTile.width = pw;
  rgbTile.height = 1;
  var rx = rgbTile.getContext('2d');
  var third = pw / 3;
  var rg = rx.createLinearGradient(0, 0, pw, 0);
  rg.addColorStop(0, 'rgba(255,80,80,0.025)');
  rg.addColorStop(0.28, 'rgba(255,80,80,0.01)');
  rg.addColorStop(0.33, 'rgba(0,0,0,0.015)');
  rg.addColorStop(0.34, 'rgba(80,255,80,0.025)');
  rg.addColorStop(0.61, 'rgba(80,255,80,0.01)');
  rg.addColorStop(0.66, 'rgba(0,0,0,0.015)');
  rg.addColorStop(0.67, 'rgba(80,80,255,0.025)');
  rg.addColorStop(0.95, 'rgba(80,80,255,0.01)');
  rg.addColorStop(1, 'rgba(0,0,0,0.015)');
  rx.fillStyle = rg;
  rx.fillRect(0, 0, pw, 1);
  crtCtx.fillStyle = crtCtx.createPattern(rgbTile, 'repeat');
  crtCtx.fillRect(0, 0, w, h);

  var vg = crtCtx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.25, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(0.55, 'rgba(0,0,0,0)');
  vg.addColorStop(0.75, 'rgba(0,0,0,0.04)');
  vg.addColorStop(0.9, 'rgba(0,0,0,0.12)');
  vg.addColorStop(1, 'rgba(0,0,0,0.22)');
  crtCtx.fillStyle = vg;
  crtCtx.fillRect(0, 0, w, h);

  var ig = crtCtx.createRadialGradient(w * 0.45, h * 0.4, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.5);
  ig.addColorStop(0, 'rgba(220,210,255,0.015)');
  ig.addColorStop(0.5, 'rgba(200,190,240,0.006)');
  ig.addColorStop(1, 'rgba(0,0,0,0)');
  crtCtx.fillStyle = ig;
  crtCtx.fillRect(0, 0, w, h);

  crtCtx.strokeStyle = 'rgba(180,160,220,0.06)';
  crtCtx.lineWidth = 1;
  crtCtx.strokeRect(0.5, 0.5, w - 1, h - 1);
}
function drawScanlines() {}
function toggleScanlines() {
  scanlinesOn = !scanlinesOn;
  localStorage.setItem('crtOn', scanlinesOn);
  applyCrt();
  emit('scanlines_changed', { on: scanlinesOn });
}

// ================================================================
// COLORS (NES palette)
// ================================================================
const COL = {
  sky: '#a080c8',
  ground: '#5848a0',
  groundDark: '#382868',
  groundLight: '#7868b8',
  brick: '#6858a8',
  brickLine: '#483878',
  block: '#f0d050',
  blockShade: '#c8a030',
  blockDark: '#a07818',
  pipe: '#48a080',
  pipeDark: '#286850',
  pipeHighlight: '#68c8a0',
  mario: '#c0a8e8',
  marioSkin: '#d8c8f0',
  marioBrown: '#6040c0',
  marioOveralls: '#9880c0',
  goomba: '#c06888',
  goombaDark: '#904060',
  koopa: '#5080c0',
  koopaDark: '#304888',
  coin: '#f0d050',
  mushroom: '#f070a0',
  mushroomSpots: '#fcfcfc',
  white: '#fcfcfc',
  black: '#000000',
  flagPole: '#a090c8',
  bush: '#607098',
  bushLight: '#8898b8',
  cloud: '#f0ecfc',
  cloudShade: '#c8b8e0',
  hillGreen: '#584090',
  hillLight: '#8870b8',
  castle: '#6858a0',
  castleDark: '#3c2868',
  castleLight: '#9888c0',
  text: '#fcfcfc',
  hardBlock: '#5060a0',
  hardBlockLight: '#7080c0',
  hardBlockDark: '#303870',
};

// ================================================================
// BIOMES: Forest -> Snow -> Desert -> Lava (each 120 tiles wide)
// ================================================================
const BIOME_FOREST = {
  id: 0, name: 'WHISPERING WOODS',
  // Sky gradient stops (top -> bottom)
  sky: ['#1c2842','#2d4a3e','#4a7050','#7ea868','#bfd890','#f0e8b8'],
  fog: 'rgba(80,140,90,0.10)',
  // Ground (top tile + below)
  groundTop: '#3a8a3a', groundTopHi: '#5fc05a', groundTopLo: '#1f5a22',
  groundBody: '#5a3920', groundBodyHi: '#8a5a32', groundBodyLo: '#2c1a0c',
  // Bricks
  brick: '#7a5840', brickShade: '#5a3e28', brickHi: '#a07858', brickMortar: '#3a2418',
  // Hard block (mossy stone)
  hard: '#6a7a5a', hardHi: '#9bab8a', hardLo: '#3a4632',
  // Pipes
  pipe: '#3a9a58', pipeHi: '#7adc94', pipeLo: '#1c5230',
  // Hill/decor colors
  hillCol1: '#3a8050', hillCol2: '#1f5230', hillCol3: '#0a2818',
  cloudCol: '#fcfcfc', cloudShade: '#cfe8d4',
  bushHi: '#7ed080', bushMid: '#3a8a3a', bushLo: '#1a4a22',
  trunk: '#4a2c14', trunkLight: '#7a4828', foliage: '#3a8a3a', foliageHi: '#7adc94',
  // Player accent (consistent purple highlight)
  accent: '#c0a8e8', accentSoft: 'rgba(192,168,232,0.35)',
  particle: { count: 14, color: '#bff09a', sizeMin: 0.6, sizeMax: 1.2, kind: 'leaf' },
};

const BIOME_SNOW = {
  id: 1, name: 'FROSTPEAK PASS',
  sky: ['#0e1832','#1f2e58','#3a548c','#7aa6d4','#bcd6ec','#eaf2fa'],
  fog: 'rgba(180,210,240,0.18)',
  groundTop: '#f0f6fc', groundTopHi: '#ffffff', groundTopLo: '#a8c8e0',
  groundBody: '#5a78a8', groundBodyHi: '#88a8d0', groundBodyLo: '#2a3a68',
  brick: '#8aa6c8', brickShade: '#5a78a0', brickHi: '#c0d4e8', brickMortar: '#384a68',
  hard: '#7a98c0', hardHi: '#bcd4ea', hardLo: '#3a567c',
  pipe: '#5fb8d8', pipeHi: '#a8e8f4', pipeLo: '#2a6890',
  hillCol1: '#a8c0e0', hillCol2: '#5a78a8', hillCol3: '#1c2a48',
  cloudCol: '#fcfcfc', cloudShade: '#d8e4f0',
  bushHi: '#fcfcfc', bushMid: '#bccfe2', bushLo: '#7898b8',
  trunk: '#3a2e2a', trunkLight: '#6a5a52', foliage: '#fcfcfc', foliageHi: '#e0eef8',
  accent: '#c0a8e8', accentSoft: 'rgba(192,168,232,0.45)',
  particle: { count: 28, color: '#ffffff', sizeMin: 0.5, sizeMax: 1.4, kind: 'snow' },
};

const BIOME_DESERT = {
  id: 2, name: 'DUSKDUNE EXPANSE',
  sky: ['#3a1830','#7a2a48','#d05a48','#ec9858','#f4c878','#fae8a8'],
  fog: 'rgba(240,180,120,0.10)',
  groundTop: '#f0c878', groundTopHi: '#fae0a0', groundTopLo: '#c08840',
  groundBody: '#a06028', groundBodyHi: '#c88848', groundBodyLo: '#5a3010',
  brick: '#c89058', brickShade: '#8a5828', brickHi: '#f0c08a', brickMortar: '#5a3010',
  hard: '#b07840', hardHi: '#e0a868', hardLo: '#6a3a14',
  pipe: '#d06840', pipeHi: '#f4a878', pipeLo: '#7a2818',
  hillCol1: '#e8a868', hillCol2: '#a06030', hillCol3: '#4a200c',
  cloudCol: '#fae0c0', cloudShade: '#e0a878',
  bushHi: '#7ec078', bushMid: '#3a8048', bushLo: '#1a4828',
  trunk: '#5a3a18', trunkLight: '#a06838', foliage: '#3a8048', foliageHi: '#7adc94',
  accent: '#c0a8e8', accentSoft: 'rgba(192,168,232,0.40)',
  particle: { count: 16, color: '#fae0a0', sizeMin: 0.4, sizeMax: 1.0, kind: 'sand' },
};

const BIOME_LAVA = {
  id: 3, name: 'EMBERHEART CALDERA',
  sky: ['#0c0210','#3c0a14','#7a1820','#c83a20','#f06830','#fcc068'],
  fog: 'rgba(255,80,40,0.14)',
  groundTop: '#3a1818', groundTopHi: '#7a3018', groundTopLo: '#150808',
  groundBody: '#2a0c0c', groundBodyHi: '#5a1810', groundBodyLo: '#0a0204',
  brick: '#3a1c1c', brickShade: '#1a0a0a', brickHi: '#7a2818', brickMortar: '#0a0202',
  hard: '#3c2828', hardHi: '#806050', hardLo: '#180a0a',
  pipe: '#3a1010', pipeHi: '#a04018', pipeLo: '#100404',
  hillCol1: '#7a2818', hillCol2: '#3a1010', hillCol3: '#1a0606',
  cloudCol: '#3a1818', cloudShade: '#1a0808',
  bushHi: '#a02818', bushMid: '#5a1408', bushLo: '#1a0404',
  trunk: '#1a0a0a', trunkLight: '#3a1818', foliage: '#3a1010', foliageHi: '#7a2818',
  accent: '#e0c0ff', accentSoft: 'rgba(220,180,255,0.55)',
  particle: { count: 24, color: '#fcc060', sizeMin: 0.5, sizeMax: 1.3, kind: 'ember' },
};

// ================================================================
// FINAL ARENA: COSMIC NEXUS (the "5th section")
// Pure deep-space stage. No lava tint anywhere — the player has
// stepped THROUGH the volcano and out the other side into the
// universe itself. Cool indigos and starlit violets so the sky
// reads as the void between galaxies, with planets, nebulas and
// the Milky Way drifting overhead.
// ================================================================
const BIOME_COSMIC = {
  id: 4, name: 'COSMIC NEXUS',
  // Pure cosmic gradient: starless black at top, deep indigo through
  // the middle, soft nebula violet at the horizon. NO orange.
  sky: ['#02010a','#070518','#0e0a28','#16103c','#1a1448','#0a0820'],
  fog: 'rgba(180,160,255,0.10)',
  // Ground/blocks: starlit obsidian — deep indigo with lavender highlights,
  // so the floor reads as polished cosmic stone rather than magma.
  groundTop: '#221a48', groundTopHi: '#5a4a98', groundTopLo: '#0a0628',
  groundBody: '#150f30', groundBodyHi: '#3a2c70', groundBodyLo: '#06040f',
  brick: '#2a2050', brickShade: '#150f30', brickHi: '#5a4898', brickMortar: '#08051a',
  hard: '#3c3068', hardHi: '#807098', hardLo: '#150f30',
  pipe: '#2a1860', pipeHi: '#7048c8', pipeLo: '#100828',
  hillCol1: '#3a2870', hillCol2: '#1a1040', hillCol3: '#06040f',
  cloudCol: '#1a1438', cloudShade: '#0a0820',
  bushHi: '#9070d8', bushMid: '#4a2890', bushLo: '#160828',
  trunk: '#150f30', trunkLight: '#3a2870', foliage: '#2a1860', foliageHi: '#9070d8',
  accent: '#d8c0ff', accentSoft: 'rgba(216,192,255,0.55)',
  particle: { count: 24, color: '#d8c0ff', sizeMin: 0.5, sizeMax: 1.4, kind: 'spark' },
};

// Mystery blocks (?-blocks, coin/powerup blocks) intentionally use one
// universal palette across every biome. The classic warm-yellow look is
// instantly recognisable as "interactable" — keeping it stage-agnostic
// makes the iconography read at a glance no matter the theme.
const DEFAULT_QBLOCK = { bg: '#f0c860', shade: '#b88828', dark: '#7c5a14' };

const BIOMES = [BIOME_FOREST, BIOME_SNOW, BIOME_DESERT, BIOME_LAVA, BIOME_COSMIC];
const BIOME_BOUNDS = [120, 240, 360, 480, 540];
function biomeAtTile(tx) {
  for (let i = 0; i < BIOME_BOUNDS.length; i++) if (tx < BIOME_BOUNDS[i]) return BIOMES[i];
  return BIOMES[BIOMES.length - 1];
}
function biomeAtX(x) { return biomeAtTile(Math.floor(x / TILE)); }
// Returns blend factor (0-1) of current biome -> next biome based on camera position.
// Useful for crossfading the sky between adjacent biomes near a checkpoint.
function biomeBlendInfo(camPxX) {
  const camTx = camPxX / TILE + (VIEW_W / TILE) * 0.5;
  let idx = 0;
  for (let i = 0; i < BIOME_BOUNDS.length; i++) {
    if (camTx < BIOME_BOUNDS[i]) { idx = i; break; }
    idx = i;
  }
  const a = BIOMES[idx];
  // Short, snappy transition window (8 tiles ≈ 128px). With a smoothstep
  // curve the crossfade is almost imperceptible at the endpoints, which
  // means heavy work (drawing both biomes) only happens for a few frames.
  const fadeWidth = 8;
  const boundary = idx > 0 ? BIOME_BOUNDS[idx - 1] : -Infinity;
  const distToPrev = camTx - boundary;
  if (idx > 0 && distToPrev < fadeWidth) {
    const prev = BIOMES[idx - 1];
    const lin = Math.max(0, Math.min(1, distToPrev / fadeWidth));
    const t = lin * lin * (3 - 2 * lin); // smoothstep — eases in/out
    return { from: prev, to: a, t: t };
  }
  return { from: a, to: a, t: 1 };
}
function lerpColor(a, b, t) {
  const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return '#' + r.toString(16).padStart(2,'0') + g.toString(16).padStart(2,'0') + bl.toString(16).padStart(2,'0');
}

const BG_STARS = [];
for (let i = 0; i < 40; i++) {
  BG_STARS.push({
    tx: Math.random() * 480,
    ty: Math.random() * 0.22,
    size: 0.4 + Math.random() * 0.8,
    speed: 0.3 + Math.random() * 0.7,
    phase: Math.random() * Math.PI * 2,
  });
}

// ----------------------------------------------------------------
// HILL SPRITE CACHE
// Hills are STATIC (no animation), so pre-render each (biome, size)
// combo into an offscreen canvas once and just drawImage() it during
// rendering. This is critical for performance during biome transitions
// where we draw two biome's worth of hills per frame: avoids hundreds
// of gradient/clip/path allocations per frame and the GC pauses they
// cause (the "half second freeze" the player saw at section borders).
// ----------------------------------------------------------------
const HILL_CACHE = {}; // key: `${biomeId}:${rTiles}`
function getHillSprite(Bm, rTiles) {
  const key = Bm.id + ':' + rTiles;
  if (HILL_CACHE[key]) return HILL_CACHE[key];
  const T = TILE;
  const r = rTiles * T;
  const PAD = 32; // halo + drip + soft edge
  const canvasW = Math.ceil(r * 2) + PAD * 2;
  const canvasH = Math.ceil(r * 1.4) + PAD * 2;
  const c = document.createElement('canvas');
  c.width = canvasW;
  c.height = canvasH;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  // Origin where the hill would be drawn:
  // hcx = canvas center X, hillBase = canvas height - PAD
  const hcx = canvasW / 2;
  const hillBase = canvasH - PAD;
  const GY_local = hillBase - r * 0.4; // mimic the "ground line" used originally
  const peakY = GY_local - r;
  if (Bm.id === 2) {
    // Desert dunes
    const grad = g.createLinearGradient(hcx, hillBase - r, hcx, hillBase);
    grad.addColorStop(0, Bm.hillCol1);
    grad.addColorStop(0.6, Bm.hillCol2);
    grad.addColorStop(1, Bm.hillCol3);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(hcx, hillBase, r, Math.PI, 0, false);
    g.lineTo(hcx + r, canvasH);
    g.lineTo(hcx - r, canvasH);
    g.closePath();
    g.fill();
  } else if (Bm.id === 1) {
    // Snow peaks
    const grad = g.createLinearGradient(hcx - r, 0, hcx + r, 0);
    grad.addColorStop(0, Bm.hillCol3);
    grad.addColorStop(0.5, Bm.hillCol2);
    grad.addColorStop(1, Bm.hillCol1);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(hcx - r, GY_local);
    g.lineTo(hcx - r * 0.4, GY_local - r * 0.6);
    g.lineTo(hcx, GY_local - r);
    g.lineTo(hcx + r * 0.45, GY_local - r * 0.55);
    g.lineTo(hcx + r, GY_local);
    g.closePath();
    g.fill();
    // Snow cap
    g.fillStyle = '#fcfcfc';
    g.beginPath();
    g.moveTo(hcx - r * 0.18, GY_local - r * 0.78);
    g.lineTo(hcx, GY_local - r);
    g.lineTo(hcx + r * 0.22, GY_local - r * 0.74);
    g.lineTo(hcx + r * 0.10, GY_local - r * 0.65);
    g.lineTo(hcx - r * 0.05, GY_local - r * 0.7);
    g.closePath();
    g.fill();
  } else if (Bm.id === 3) {
    // Lava: jagged volcano with magma effects (cached!)
    g.beginPath();
    g.moveTo(hcx - r, GY_local);
    g.lineTo(hcx - r * 0.45, GY_local - r * 0.55);
    g.lineTo(hcx - r * 0.2, GY_local - r * 0.85);
    g.lineTo(hcx, peakY);
    g.lineTo(hcx + r * 0.18, GY_local - r * 0.85);
    g.lineTo(hcx + r * 0.5, GY_local - r * 0.5);
    g.lineTo(hcx + r, GY_local);
    g.closePath();
    const bodyG = g.createLinearGradient(hcx, peakY, hcx, GY_local);
    bodyG.addColorStop(0, Bm.hillCol1);
    bodyG.addColorStop(0.45, Bm.hillCol2);
    bodyG.addColorStop(1, Bm.hillCol3);
    g.fillStyle = bodyG;
    g.fill();
    g.save();
    g.clip();
    const rimG = g.createLinearGradient(hcx, peakY, hcx + r * 0.6, GY_local - r * 0.2);
    rimG.addColorStop(0, 'rgba(255,140,60,0.45)');
    rimG.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = rimG;
    g.fillRect(hcx - r, peakY - 2, r * 2, r * 0.85);
    g.strokeStyle = 'rgba(255,170,60,0.55)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(hcx - r * 0.04, peakY + 1);
    g.lineTo(hcx - r * 0.10, peakY + r * 0.18);
    g.lineTo(hcx - r * 0.04, peakY + r * 0.32);
    g.lineTo(hcx - r * 0.14, peakY + r * 0.50);
    g.stroke();
    g.beginPath();
    g.moveTo(hcx + r * 0.06, peakY + 2);
    g.lineTo(hcx + r * 0.16, peakY + r * 0.22);
    g.lineTo(hcx + r * 0.10, peakY + r * 0.42);
    g.stroke();
    g.fillStyle = 'rgba(255,220,140,0.85)';
    g.fillRect(hcx - r * 0.10, peakY + r * 0.18, 1, 2);
    g.fillRect(hcx - r * 0.04, peakY + r * 0.32, 1, 2);
    g.fillRect(hcx + r * 0.16, peakY + r * 0.22, 1, 2);
    g.restore();
    // Crater rim
    g.fillStyle = 'rgba(40,8,4,0.95)';
    g.beginPath();
    g.ellipse(hcx, peakY + 2, r * 0.22, 2, 0, 0, Math.PI * 2);
    g.fill();
    // Inner glowing magma
    const crG = g.createRadialGradient(hcx, peakY + 1, 0.5, hcx, peakY + 1, r * 0.22);
    crG.addColorStop(0, '#fff0a0');
    crG.addColorStop(0.4, '#ffb050');
    crG.addColorStop(1, 'rgba(220,60,20,0.8)');
    g.fillStyle = crG;
    g.beginPath();
    g.ellipse(hcx, peakY + 1, r * 0.16, 1.6, 0, 0, Math.PI * 2);
    g.fill();
    // Outer ember halo
    const haloG = g.createRadialGradient(hcx, peakY, 0, hcx, peakY, r * 0.45);
    haloG.addColorStop(0, 'rgba(255,160,60,0.55)');
    haloG.addColorStop(1, 'rgba(255,80,20,0)');
    g.fillStyle = haloG;
    g.beginPath();
    g.arc(hcx, peakY, r * 0.45, 0, Math.PI * 2);
    g.fill();
    // Lava overflow drip
    g.fillStyle = 'rgba(255,140,40,0.55)';
    g.fillRect(hcx + 1, peakY + 1, 1.5, r * 0.55);
    g.fillStyle = 'rgba(255,220,140,0.85)';
    g.fillRect(hcx + 1, peakY + 1, 0.6, r * 0.20);
  } else {
    // Forest: classic rounded hill
    const grad = g.createRadialGradient(hcx - r * 0.2, hillBase - r * 0.7, r * 0.1, hcx, hillBase, r);
    grad.addColorStop(0, Bm.hillCol1);
    grad.addColorStop(0.5, Bm.hillCol2);
    grad.addColorStop(1, Bm.hillCol3);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(hcx, hillBase, r, Math.PI, 0, false);
    g.lineTo(hcx + r, canvasH);
    g.lineTo(hcx - r, canvasH);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.beginPath();
    g.arc(hcx - r * 0.2, hillBase - r * 0.5, r * 0.4, 0, Math.PI * 2);
    g.fill();
  }
  // Pre-rendered desert pyramid silhouette (every 4th hill in the original).
  // We render it as a separate sprite below to keep the cached hill clean.
  const sprite = { canvas: c, hcxOffset: hcx, hillBaseOffset: hillBase, GY_localOffset: GY_local };
  HILL_CACHE[key] = sprite;
  return sprite;
}
// Eager-build all (biome, size) combos at startup so first transition has zero
// pre-render hitch.
(function prebuildHills() {
  for (let bi = 0; bi < BIOMES.length; bi++) {
    for (let rt = 4; rt <= 8; rt++) {
      getHillSprite(BIOMES[bi], rt);
    }
  }
})();

// ----------------------------------------------------------------
// TILE SPRITE CACHE
// ----------------------------------------------------------------
// Tiles were re-allocating 1-3 CanvasGradient objects per tile per frame
// (~hundreds of allocations every render), causing intermittent GC pauses
// and visible stutters during scrolling. We pre-render every static tile
// variant once and blit it as a cached sprite from then on. ?-blocks keep
// a tiny per-frame additive overlay for the pulsing shimmer / halo, but
// the expensive radial / linear gradients are baked in.
// ----------------------------------------------------------------
const TILE_CACHE = {}; // key: `${tile}:${biomeId}:${variant}`

function _newTileCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function _renderGroundSurface(g, B) {
  const topGrad = g.createLinearGradient(0, 0, 0, 5);
  topGrad.addColorStop(0, B.groundTopHi);
  topGrad.addColorStop(1, B.groundTop);
  g.fillStyle = topGrad;
  g.fillRect(0, 0, TILE, 5);
  const bodyGrad = g.createLinearGradient(0, 5, 0, TILE);
  bodyGrad.addColorStop(0, B.groundBodyHi);
  bodyGrad.addColorStop(0.5, B.groundBody);
  bodyGrad.addColorStop(1, B.groundBodyLo);
  g.fillStyle = bodyGrad;
  g.fillRect(0, 5, TILE, TILE - 5);
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.fillRect(0, 0, TILE, 1);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(0, 5, TILE, 0.6);
  _renderGroundBiomeSpeckle(g, B);
}
function _renderGroundBody(g, B) {
  const bodyGrad = g.createLinearGradient(0, 0, 0, TILE);
  bodyGrad.addColorStop(0, B.groundBodyHi);
  bodyGrad.addColorStop(0.5, B.groundBody);
  bodyGrad.addColorStop(1, B.groundBodyLo);
  g.fillStyle = bodyGrad;
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle = 'rgba(255,255,255,0.10)';
  g.fillRect(0, 0, TILE, 1);
  _renderGroundBiomeSpeckle(g, B);
}
function _renderGroundBiomeSpeckle(g, B) {
  if (B.id === 0) {
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(4, 8, 1, 1);
    g.fillRect(11, 11, 1, 1);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(8, 9, 1, 1);
  } else if (B.id === 1) {
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(3, 9, 1, 1);
    g.fillRect(12, 11, 1, 1);
    g.fillStyle = 'rgba(120,160,200,0.18)';
    g.fillRect(7, 13, 1, 1);
  } else if (B.id === 2) {
    g.fillStyle = 'rgba(255,240,180,0.20)';
    g.fillRect(2, 8, 1, 1);
    g.fillRect(6, 10, 1, 1);
    g.fillRect(11, 12, 1, 1);
    g.fillStyle = 'rgba(120,80,30,0.20)';
    g.fillRect(9, 9, 1, 1);
    g.fillRect(4, 13, 1, 1);
  } else {
    g.fillStyle = 'rgba(255,80,20,0.45)';
    g.fillRect(3, 9, 4, 1);
    g.fillRect(9, 12, 3, 1);
    g.fillStyle = 'rgba(255,160,40,0.55)';
    g.fillRect(11, 8, 1, 1);
    g.fillRect(5, 13, 1, 1);
  }
}
function _renderBrick(g, B) {
  const bGrad = g.createLinearGradient(0, 0, 0, TILE);
  bGrad.addColorStop(0, B.brickHi);
  bGrad.addColorStop(0.45, B.brick);
  bGrad.addColorStop(1, B.brickShade);
  g.fillStyle = bGrad;
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle = 'rgba(255,255,255,0.16)';
  g.fillRect(0.5, 1, 6, 1);
  g.fillRect(8, 1, 7, 1);
  g.fillRect(0.5, 8, 2.5, 1);
  g.fillRect(4, 8, 7, 1);
  g.fillRect(12, 8, 3.5, 1);
  g.fillStyle = B.brickMortar;
  g.fillRect(0, 0, TILE, 0.8);
  g.fillRect(0, 7, TILE, 0.8);
  g.fillRect(7.2, 0, 0.6, 7);
  g.fillRect(3.2, 7, 0.6, 9);
  g.fillRect(11.2, 7, 0.6, 9);
  g.fillRect(0, 15.2, TILE, 0.8);
  if (B.id === 0) {
    g.fillStyle = 'rgba(120,200,90,0.55)';
    g.fillRect(2, 7.5, 2, 0.7);
    g.fillRect(9, 7.5, 3, 0.7);
  } else if (B.id === 1) {
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.fillRect(4, 1, 1, 1);
    g.fillRect(11, 9, 1, 1);
  } else if (B.id === 3) {
    g.fillStyle = 'rgba(255,100,30,0.35)';
    g.fillRect(5, 5, 4, 1);
    g.fillRect(8, 12, 5, 1);
  }
}
function _renderHard(g, B) {
  const hGrad = g.createLinearGradient(0, 0, 0, TILE);
  hGrad.addColorStop(0, B.hardHi);
  hGrad.addColorStop(0.5, B.hard);
  hGrad.addColorStop(1, B.hardLo);
  g.fillStyle = hGrad;
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle = 'rgba(255,255,255,0.16)';
  g.fillRect(0, 0, TILE, 1);
  g.fillRect(0, 0, 1, TILE);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(TILE - 1, 0, 1, TILE);
  g.fillRect(0, TILE - 1, TILE, 1);
  g.fillStyle = 'rgba(0,0,0,0.08)';
  g.fillRect(2, 2, TILE - 4, TILE - 4);
  g.fillStyle = 'rgba(255,255,255,0.10)';
  g.fillRect(3, 3, TILE - 6, 1);
  g.fillRect(3, 3, 1, TILE - 6);
  g.fillStyle = 'rgba(0,0,0,0.08)';
  g.fillRect(TILE - 4, 3, 1, TILE - 6);
  g.fillRect(3, TILE - 4, TILE - 6, 1);
  g.fillStyle = 'rgba(0,0,0,0.10)';
  g.fillRect(7, 2, 1, TILE - 4);
  g.fillRect(2, 7, TILE - 4, 1);
  if (B.id === 1) {
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.fillRect(11, 4, 2, 1);
    g.fillRect(12, 4, 1, 2);
  } else if (B.id === 3) {
    g.fillStyle = 'rgba(255,100,30,0.55)';
    g.fillRect(4, 11, 5, 1);
  }
}
function _renderQEmpty(g, B) {
  const eGrad = g.createLinearGradient(0, 0, 0, TILE);
  eGrad.addColorStop(0, DEFAULT_QBLOCK.shade);
  eGrad.addColorStop(1, DEFAULT_QBLOCK.dark);
  g.fillStyle = eGrad;
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(TILE - 1.5, 0, 1.5, TILE);
  g.fillRect(0, TILE - 1.5, TILE, 1.5);
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.fillRect(0, 0, TILE, 1);
  g.fillRect(0, 0, 1, TILE);
}
function _renderQActive(g, B, kind) {
  // kind: 'q' (?-block, biome-tinted), '1up' (blue), 'star' (purple)
  const blockBg  = kind === '1up' ? '#80c0e0' : kind === 'star' ? '#a890d0' : DEFAULT_QBLOCK.bg;
  const blockShd = kind === '1up' ? '#5090b0' : kind === 'star' ? '#7868a8' : DEFAULT_QBLOCK.shade;
  const blockDk  = kind === '1up' ? '#306080' : kind === 'star' ? '#584888' : DEFAULT_QBLOCK.dark;
  const qGrad = g.createLinearGradient(0, 0, 0, TILE);
  qGrad.addColorStop(0, blockBg);
  qGrad.addColorStop(1, blockShd);
  g.fillStyle = qGrad;
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(TILE - 1.5, 0, 1.5, TILE);
  g.fillRect(0, TILE - 1.5, TILE, 1.5);
  g.fillStyle = 'rgba(255,255,255,0.16)';
  g.fillRect(0, 0, TILE, 1);
  g.fillRect(0, 0, 1, TILE);
  if (kind === 'star') {
    g.fillStyle = '#e8c850';
    g.fillRect(7, 3, 2, 2);
    g.fillRect(5, 5, 6, 2);
    g.fillRect(3, 7, 10, 2);
    g.fillRect(5, 9, 6, 2);
    g.fillRect(4, 10, 3, 2);
    g.fillRect(9, 10, 3, 2);
  } else {
    g.fillStyle = blockDk;
    g.fillRect(5, 3, 6, 2);
    g.fillRect(9, 5, 2, 3);
    g.fillRect(7, 7, 2, 2);
    g.fillRect(7, 11, 2, 2);
  }
}
function _renderPipe10(g, B) {
  const pG = g.createLinearGradient(0, 0, TILE, 0);
  pG.addColorStop(0, B.pipeHi);
  pG.addColorStop(0.3, B.pipe);
  pG.addColorStop(0.85, B.pipe);
  pG.addColorStop(1, B.pipeLo);
  g.fillStyle = pG;
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle = 'rgba(255,255,255,0.14)';
  g.fillRect(3, 0, 2, TILE);
}
function _renderPipe11(g, B) {
  const pG = g.createLinearGradient(0, 0, TILE, 0);
  pG.addColorStop(0, B.pipeLo);
  pG.addColorStop(0.2, B.pipe);
  pG.addColorStop(0.7, B.pipe);
  pG.addColorStop(1, B.pipeHi);
  g.fillStyle = pG;
  g.fillRect(0, 0, TILE, TILE);
}
function _renderPipe12(g, B) {
  // Sprite is 18px wide; drawn at sx-2.
  const pG = g.createLinearGradient(0, 0, TILE + 2, 0);
  pG.addColorStop(0, B.pipeHi);
  pG.addColorStop(0.25, B.pipe);
  pG.addColorStop(0.85, B.pipe);
  pG.addColorStop(1, B.pipeLo);
  g.fillStyle = pG;
  g.fillRect(0, 0, TILE + 2, TILE);
  g.fillStyle = 'rgba(255,255,255,0.30)';
  g.fillRect(0, 0, TILE + 4, 1);
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.fillRect(0, 1, TILE + 4, 1);
  g.fillStyle = 'rgba(255,255,255,0.16)';
  g.fillRect(3, 1, 2, TILE - 2);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(0, TILE - 1, TILE + 4, 1);
  g.fillStyle = 'rgba(0,0,0,0.10)';
  g.fillRect(1, 2, TILE + 2, 1);
  g.fillStyle = 'rgba(255,255,255,0.08)';
  g.fillRect(2, 3, TILE - 2, 1);
}
function _renderPipe13(g, B) {
  // Sprite is 18px wide; drawn at sx (right side extends past tile).
  const pG = g.createLinearGradient(0, 0, TILE + 2, 0);
  pG.addColorStop(0, B.pipeLo);
  pG.addColorStop(0.2, B.pipe);
  pG.addColorStop(0.7, B.pipe);
  pG.addColorStop(1, B.pipeHi);
  g.fillStyle = pG;
  g.fillRect(0, 0, TILE + 2, TILE);
  g.fillStyle = 'rgba(255,255,255,0.26)';
  g.fillRect(0, 0, TILE + 2, 1);
  g.fillStyle = 'rgba(255,255,255,0.14)';
  g.fillRect(0, 1, TILE + 2, 1);
  g.fillStyle = 'rgba(0,0,0,0.10)';
  g.fillRect(0, 2, TILE + 2, 1);
  g.fillStyle = 'rgba(255,255,255,0.07)';
  g.fillRect(1, 3, TILE, 1);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(0, TILE - 1, TILE + 2, 1);
}

function getTileSprite(tile, B, variant) {
  const key = tile + ':' + B.id + ':' + (variant || '');
  let c = TILE_CACHE[key];
  if (c) return c;
  // Pipe 12/13 are 18px wide; everything else is 16x16.
  const w = (tile === 12 || tile === 13) ? TILE + 2 : TILE;
  c = _newTileCanvas(w, TILE);
  const g = c.getContext('2d');
  switch (tile) {
    case 1:
      if (variant === 'surface') _renderGroundSurface(g, B);
      else _renderGroundBody(g, B);
      break;
    case 2: _renderBrick(g, B); break;
    case 5: _renderHard(g, B); break;
    case 3:
    case 4:
      if (variant === 'empty') _renderQEmpty(g, B);
      else _renderQActive(g, B, 'q');
      break;
    case 6:
      if (variant === 'empty') _renderQEmpty(g, B);
      else _renderQActive(g, B, '1up');
      break;
    case 7:
      if (variant === 'empty') _renderQEmpty(g, B);
      else _renderQActive(g, B, 'star');
      break;
    case 10: _renderPipe10(g, B); break;
    case 11: _renderPipe11(g, B); break;
    case 12: _renderPipe12(g, B); break;
    case 13: _renderPipe13(g, B); break;
  }
  TILE_CACHE[key] = c;
  return c;
}

// Pre-cached radial halo for ?-block / 1up / star pulsing glow.
// Single 32x32 white sprite re-tinted via fillStyle + composite.
const BLOCK_GLOW_CACHE = {};
function getBlockGlowSprite(color) {
  if (BLOCK_GLOW_CACHE[color]) return BLOCK_GLOW_CACHE[color];
  const c = _newTileCanvas(28, 28);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(14, 14, 2, 14, 14, 14);
  grd.addColorStop(0, color);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 28, 28);
  BLOCK_GLOW_CACHE[color] = c;
  return c;
}

(function prebuildTiles() {
  for (let bi = 0; bi < BIOMES.length; bi++) {
    const B = BIOMES[bi];
    getTileSprite(1, B, 'surface');
    getTileSprite(1, B, 'body');
    getTileSprite(2, B);
    getTileSprite(5, B);
    getTileSprite(3, B);
    getTileSprite(3, B, 'empty');
    getTileSprite(4, B);
    getTileSprite(4, B, 'empty');
    getTileSprite(6, B);
    getTileSprite(6, B, 'empty');
    getTileSprite(7, B);
    getTileSprite(7, B, 'empty');
    getTileSprite(10, B);
    getTileSprite(11, B);
    getTileSprite(12, B);
    getTileSprite(13, B);
  }
  // Glow halos
  getBlockGlowSprite('#f0d868'); // forest/snow/desert ?-block
  getBlockGlowSprite('#ffb060'); // lava ?-block
  getBlockGlowSprite('#80d0e8'); // 1up
  getBlockGlowSprite('#c8a8f0'); // star
})();

let ambientMotes = [];
function initAmbientMotes() {
  ambientMotes = [];
  for (let i = 0; i < 18; i++) {
    ambientMotes.push({
      x: Math.random() * 480 * 16,
      y: 40 + Math.random() * 160,
      vy: -0.08 - Math.random() * 0.12,
      vx: (Math.random() - 0.5) * 0.15,
      size: 0.6 + Math.random() * 1.0,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.15 + Math.random() * 0.25,
    });
  }
}
initAmbientMotes();

// ================================================================
// SPRITE DRAWING
// ================================================================
const _spriteCache = new Map();

function drawPixels(cx, x, y, pixels, palette, flipped, scale) {
  const s = scale || 1;
  const cacheKey = s > 1 ? (flipped ? 3 : 2) : (flipped ? 1 : 0);
  let palMap = _spriteCache.get(pixels);
  if (!palMap) {
    palMap = new Map();
    _spriteCache.set(pixels, palMap);
  }
  let byFlip = palMap.get(palette);
  if (!byFlip) {
    byFlip = [null, null, null, null];
    palMap.set(palette, byFlip);
  }
  if (!byFlip[cacheKey]) {
    const w = pixels[0].length;
    const h = pixels.length;
    const sc = document.createElement('canvas');
    sc.width = w * s;
    sc.height = h * s;
    const sctx = sc.getContext('2d');
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const p = pixels[row][col];
        if (p === 0) continue;
        const color = palette[p];
        if (!color) continue;
        sctx.fillStyle = color;
        const dx = flipped ? (w - 1 - col) * s : col * s;
        sctx.fillRect(dx, row * s, s, s);
      }
    }
    byFlip[cacheKey] = sc;
  }
  cx.drawImage(byFlip[cacheKey], x | 0, y | 0);
}

// Embeddablob sprites (16x16) - round blob with eyes and feet
// Palette: 1=body, 2=shadow, 3=white(eyes), 4=black(pupils/mouth), 5=feet
const MARIO_STAND = [
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,2,2,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,2,1,1,1,3,3,1,1,3,3,1,1,1,1,0],
  [0,2,1,1,3,3,3,3,1,3,3,3,3,1,1,0],
  [0,2,1,1,3,4,3,3,1,3,3,4,3,1,1,0],
  [0,2,1,1,1,3,3,1,1,1,3,3,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,4,1,4,1,1,1,1,0,0],
  [0,0,1,1,1,1,1,1,4,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,5,5,5,0,0,0,5,5,5,0,0,0,0],
  [0,0,5,5,5,5,0,0,5,5,5,5,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const MARIO_RUN1 = [
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,2,2,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,2,1,1,1,3,3,1,1,3,3,1,1,1,1,0],
  [0,2,1,1,3,3,3,3,1,3,3,3,3,1,1,0],
  [0,2,1,1,3,4,3,3,1,3,3,4,3,1,1,0],
  [0,2,1,1,1,3,3,1,1,1,3,3,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,4,1,4,1,1,1,1,0,0],
  [0,0,1,1,1,1,1,1,4,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,5,5,5,0,0,0,0,0,0,5,5,5,0,0,0],
  [5,5,5,5,0,0,0,0,0,5,5,5,5,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const MARIO_RUN2 = [
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,2,2,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,2,1,1,1,3,3,1,1,3,3,1,1,1,1,0],
  [0,2,1,1,3,3,3,3,1,3,3,3,3,1,1,0],
  [0,2,1,1,3,4,3,3,1,3,3,4,3,1,1,0],
  [0,2,1,1,1,3,3,1,1,1,3,3,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,4,1,4,1,1,1,1,0,0],
  [0,0,1,1,1,1,1,1,4,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,5,5,5,0,0,5,5,0,0,0,0,0],
  [0,0,0,5,5,5,5,0,5,5,5,5,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const MARIO_JUMP = [
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,2,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,2,2,1,1,3,3,1,1,3,3,1,1,1,1,0],
  [0,2,1,1,3,3,3,3,1,3,3,3,3,1,1,0],
  [0,2,1,1,3,4,3,3,1,3,3,4,3,1,1,0],
  [0,2,1,1,1,3,3,1,1,1,3,3,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,4,1,4,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,4,1,1,1,1,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,5,5,0,5,5,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const MARIO_DEAD = [
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,2,1,1,4,1,4,1,1,4,1,4,1,1,1,0],
  [0,2,1,1,1,4,1,1,1,1,4,1,1,1,1,0],
  [0,2,1,1,4,1,4,1,1,4,1,4,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,5,5,5,0,0,0,0,0,5,5,5,0,0,0],
  [0,5,5,5,5,0,0,0,0,5,5,5,5,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const MARIO_SKID = [
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,2,2,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,2,1,1,1,3,3,1,1,3,3,1,1,1,1,0],
  [0,2,1,1,3,3,3,3,1,3,3,3,3,1,1,0],
  [0,2,1,1,3,3,4,3,1,3,4,3,3,1,1,0],
  [0,2,1,1,1,3,3,1,1,1,3,3,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,1,4,4,1,1,1,1,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,0,5,5,5,0,0,0,0,0,0,0],
  [0,0,0,0,0,5,5,5,5,5,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Big Embeddablob (16x24) - larger blob
const BIG_MARIO_STAND = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [2,1,1,1,1,3,3,3,1,3,3,3,1,1,1,1],
  [2,1,1,1,3,3,3,3,1,3,3,3,3,1,1,1],
  [2,1,1,1,3,4,4,3,1,3,4,4,3,1,1,1],
  [2,1,1,1,1,3,3,3,1,1,3,3,3,1,1,1],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,1,1,1,1,1,4,1,1,4,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,4,4,1,1,1,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,5,5,5,0,0,5,5,5,0,0,0,0],
  [0,0,0,5,5,5,5,0,0,5,5,5,5,0,0,0],
  [0,0,0,5,5,5,5,0,0,5,5,5,5,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const BIG_MARIO_RUN1 = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [2,1,1,1,1,3,3,3,1,3,3,3,1,1,1,1],
  [2,1,1,1,3,3,3,3,1,3,3,3,3,1,1,1],
  [2,1,1,1,3,4,4,3,1,3,4,4,3,1,1,1],
  [2,1,1,1,1,3,3,3,1,1,3,3,3,1,1,1],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,1,1,1,1,1,4,1,1,4,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,4,4,1,1,1,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
  [0,5,5,5,5,0,0,0,0,0,5,5,5,0,0,0],
  [5,5,5,5,5,0,0,0,0,5,5,5,5,0,0,0],
  [0,0,0,0,0,0,0,0,0,5,5,5,5,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const BIG_MARIO_RUN2 = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [2,1,1,1,1,3,3,3,1,3,3,3,1,1,1,1],
  [2,1,1,1,3,3,3,3,1,3,3,3,3,1,1,1],
  [2,1,1,1,3,4,4,3,1,3,4,4,3,1,1,1],
  [0,1,1,1,1,3,3,3,1,1,3,3,3,1,1,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,1,1,1,1,1,4,1,1,4,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,4,4,1,1,1,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,5,5,5,0,0,0,5,5,0,0,0,0],
  [0,0,0,5,5,5,5,0,0,5,5,5,5,0,0,0],
  [0,0,0,5,5,5,0,0,0,5,5,5,5,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const BIG_MARIO_JUMP = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,2,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,2,2,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,2,1,1,1,3,3,3,1,3,3,3,1,1,1,0],
  [0,2,1,1,3,3,3,3,1,3,3,3,3,1,1,0],
  [0,2,1,1,3,4,4,3,1,3,4,4,3,1,1,0],
  [0,1,1,1,1,3,3,3,1,1,3,3,3,1,1,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,1,1,1,1,4,1,1,4,1,1,0,0,0],
  [0,0,0,0,1,1,1,1,4,4,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,5,5,0,5,5,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const BIG_MARIO_CROUCH = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [2,2,1,1,3,3,3,1,1,3,3,3,1,1,1,1],
  [2,1,1,1,3,4,3,1,1,3,4,3,1,1,1,1],
  [0,1,1,1,1,3,3,1,1,1,3,3,1,1,1,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,4,4,1,1,1,1,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,5,5,5,5,0,0,5,5,5,5,0,0,0],
  [0,0,5,5,5,5,5,0,0,5,5,5,5,5,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const MARIO_PALETTE = { 1: COL.mario, 2: COL.marioOveralls, 3: '#fcfcfc', 4: '#1a1a2e', 5: COL.marioBrown };
const FIRE_MARIO_PALETTE = { 1: '#fcfcfc', 2: '#d0d0e0', 3: '#fcfcfc', 4: '#1a1a2e', 5: '#ff6040' };

const BUZZY_SPRITE = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,1,1,2,1,1,1,1,2,1,1,0,0,0],
  [0,0,1,1,2,2,1,1,1,2,2,1,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,3,1,1,1,3,0,0,0,0,0,0],
  [0,0,0,0,3,3,3,1,3,3,3,0,0,0,0,0],
  [0,0,0,3,3,3,3,1,3,3,3,3,0,0,0,0],
  [0,0,0,3,3,0,3,3,3,0,3,3,0,0,0,0],
  [0,0,0,0,0,0,3,0,3,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,0,3,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];
const BUZZY_FLAT = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [1,1,2,2,1,1,1,1,1,2,2,1,1,1,1,0],
  [1,2,2,3,2,1,1,1,2,3,2,1,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];
const BUZZY_PALETTE = { 1: '#4050b8', 2: COL.white, 3: COL.black };

// Piranha plant palette. Ten distinct indices so the head, mouth,
// stem and teeth don't share colors (which was making the sprite
// read as muddy/noisy before).
//   1  head main pink/magenta      6  mouth interior (near-black)
//   2  head white spot             7  stem left-side highlight
//   3  stem base purple            8  head shadow (under lobes)
//   4  dark outline                9  tooth (cream, != spot white)
//   5  stem right-side shadow     10  head top-left highlight
// The stem now uses a clean left→right gradient (7-3-5 or 7-3-3-3-5)
// per row instead of the old 3/5 checker, so shading reads as a
// single lit cylinder rather than speckle noise.
// Rows 0..6 = head (uses outline index 4 = dark magenta)
// Rows 7..15 = stem (uses outline index 11 = dark purple)
const PIRANHA_SPRITE1 = [
  [0,0,0, 4, 1, 1,0,0,0, 1, 1, 4,0,0,0,0],
  [0,0, 4, 1,10, 2,4,0, 4, 2,10, 1,4,0,0,0],
  [0, 4, 1,10, 1, 1,4,0, 4, 1, 1,10, 1,4,0,0],
  [0, 4, 1, 1, 4, 9,6, 9,6, 9, 4, 1, 1,4,0,0],
  [0,0, 4, 4, 9, 6,9, 6,9, 6, 9, 4, 4,0,0,0],
  [0,0,0, 4, 1, 1,1, 1,1, 1, 1, 4,0,0,0,0],
  [0,0,0,0, 4, 8,1, 1,1, 8, 4,0,0,0,0,0],
  [0,0,0,0,0,11,3, 3,3,11,0,0,0,0,0,0],
  [0,0,0,0,0,11,7, 3,5,11,0,0,0,0,0,0],
  [0,0,0,0,11, 7,3, 3,3, 5,11,0,0,0,0,0],
  [0,0,0,0,11, 7,3, 3,3, 5,11,0,0,0,0,0],
  [0,0,0,0,0,11,3, 3,3,11,0,0,0,0,0,0],
  [0,0,0,0,0,11,7, 3,5,11,0,0,0,0,0,0],
  [0,0,0,0,11, 7,3, 3,3, 5,11,0,0,0,0,0],
  [0,0,0,0,11, 7,3, 3,3, 5,11,0,0,0,0,0],
  [0,0,0,0,0,11,3, 3,3,11,0,0,0,0,0,0],
];
const PIRANHA_SPRITE2 = [
  [0,0, 4, 1, 1,0,0,0,0,0, 1, 1, 4,0,0,0],
  [0, 4, 1,10, 2, 4,0,0,0, 4, 2,10, 1, 4,0,0],
  [0, 4, 1, 1, 2, 4,0,0,0, 4, 2, 1, 1, 4,0,0],
  [0, 4, 1, 4, 9, 6,9, 6,9, 6, 9, 4, 1, 4,0,0],
  [0,0, 4, 6, 6, 9,6, 9,6, 9, 6, 6, 4,0,0,0],
  [0,0,0, 4, 1, 1,1, 1,1, 1, 1, 4,0,0,0,0],
  [0,0,0,0, 4, 8,1, 1,1, 8, 4,0,0,0,0,0],
  [0,0,0,0,0,11,3, 3,3,11,0,0,0,0,0,0],
  [0,0,0,0,0,11,7, 3,5,11,0,0,0,0,0,0],
  [0,0,0,0,11, 7,3, 3,3, 5,11,0,0,0,0,0],
  [0,0,0,0,11, 7,3, 3,3, 5,11,0,0,0,0,0],
  [0,0,0,0,0,11,3, 3,3,11,0,0,0,0,0,0],
  [0,0,0,0,0,11,7, 3,5,11,0,0,0,0,0,0],
  [0,0,0,0,11, 7,3, 3,3, 5,11,0,0,0,0,0],
  [0,0,0,0,11, 7,3, 3,3, 5,11,0,0,0,0,0],
  [0,0,0,0,0,11,3, 3,3,11,0,0,0,0,0,0],
];
// SMW-style palette. Two key ideas:
//  1. Outlines are a DARK VERSION OF THE FILL COLOR, not near-black —
//     so the head gets a dark-magenta outline and the stem gets a
//     dark-purple outline. Each region's edge reads as shading of
//     itself instead of a hard black sticker border.
//  2. Base colors are brighter/cleaner (SMW cartoon vibrance), and
//     shadow/highlight pairs stay close to base hue so shading
//     doesn't darken the silhouette or introduce muddy mid-tones.
const PIRANHA_PALETTE = {
  1:  '#d858ac',  // head main pink-magenta (brighter)
  2:  '#ffffff',  // head spot pure white
  3:  '#6a58d0',  // stem base purple (brighter)
  4:  '#6a1858',  // HEAD outline (dark magenta, pairs with pink fill)
  5:  '#4838a0',  // stem right-side shadow
  6:  '#200030',  // mouth interior
  7:  '#a898e8',  // stem left-side highlight
  8:  '#9a2878',  // head under-lobe shadow
  9:  '#fffef0',  // tooth cream
  10: '#f8a8d0',  // head top-left highlight
  11: '#2a1858',  // STEM outline (dark purple, pairs with purple fill)
};

const PIXEL_FONT = {
  'A':[0x0E,0x11,0x11,0x1F,0x11,0x11,0x11],'B':[0x1E,0x11,0x11,0x1E,0x11,0x11,0x1E],
  'C':[0x0E,0x11,0x10,0x10,0x10,0x11,0x0E],'D':[0x1C,0x12,0x11,0x11,0x11,0x12,0x1C],
  'E':[0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F],'F':[0x1F,0x10,0x10,0x1E,0x10,0x10,0x10],
  'G':[0x0E,0x11,0x10,0x17,0x11,0x11,0x0F],'H':[0x11,0x11,0x11,0x1F,0x11,0x11,0x11],
  'I':[0x0E,0x04,0x04,0x04,0x04,0x04,0x0E],'J':[0x07,0x02,0x02,0x02,0x02,0x12,0x0C],
  'K':[0x11,0x12,0x14,0x18,0x14,0x12,0x11],'L':[0x10,0x10,0x10,0x10,0x10,0x10,0x1F],
  'M':[0x11,0x1B,0x15,0x15,0x11,0x11,0x11],'N':[0x11,0x19,0x15,0x13,0x11,0x11,0x11],
  'O':[0x0E,0x11,0x11,0x11,0x11,0x11,0x0E],'P':[0x1E,0x11,0x11,0x1E,0x10,0x10,0x10],
  'Q':[0x0E,0x11,0x11,0x11,0x15,0x12,0x0D],'R':[0x1E,0x11,0x11,0x1E,0x14,0x12,0x11],
  'S':[0x0E,0x11,0x10,0x0E,0x01,0x11,0x0E],'T':[0x1F,0x04,0x04,0x04,0x04,0x04,0x04],
  'U':[0x11,0x11,0x11,0x11,0x11,0x11,0x0E],'V':[0x11,0x11,0x11,0x11,0x11,0x0A,0x04],
  'W':[0x11,0x11,0x11,0x15,0x15,0x1B,0x11],'X':[0x11,0x11,0x0A,0x04,0x0A,0x11,0x11],
  'Y':[0x11,0x11,0x0A,0x04,0x04,0x04,0x04],'Z':[0x1F,0x01,0x02,0x04,0x08,0x10,0x1F],
  '0':[0x0E,0x11,0x13,0x15,0x19,0x11,0x0E],'1':[0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
  '2':[0x0E,0x11,0x01,0x06,0x08,0x10,0x1F],'3':[0x0E,0x11,0x01,0x06,0x01,0x11,0x0E],
  '4':[0x02,0x06,0x0A,0x12,0x1F,0x02,0x02],'5':[0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
  '6':[0x06,0x08,0x10,0x1E,0x11,0x11,0x0E],'7':[0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
  '8':[0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E],'9':[0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
  ':':[0x00,0x00,0x04,0x00,0x00,0x04,0x00],'-':[0x00,0x00,0x00,0x0E,0x00,0x00,0x00],
  '!':[0x04,0x04,0x04,0x04,0x04,0x00,0x04],' ':[0x00,0x00,0x00,0x00,0x00,0x00,0x00],
  'x':[0x00,0x00,0x11,0x0A,0x04,0x0A,0x11],'.':[0x00,0x00,0x00,0x00,0x00,0x00,0x04],
  '=':[0x00,0x00,0x1F,0x00,0x1F,0x00,0x00],'+':[0x00,0x04,0x04,0x1F,0x04,0x04,0x00],
  '/':[0x01,0x02,0x02,0x04,0x08,0x08,0x10],'<':[0x00,0x04,0x02,0x01,0x02,0x04,0x00],
  '>':[0x00,0x04,0x08,0x10,0x08,0x04,0x00],'·':[0x00,0x00,0x00,0x04,0x00,0x00,0x00],
};

// Compact 3x5 bitmap font for floating nameplates / micro-labels.
// Each glyph is 5 rows x 3 cols, encoded one row per byte with the
// leftmost pixel as bit 0x4. Advance is 4px (3 glyph + 1 gap), so a
// 12-char name fits in ~47 px — about 35% the width of drawPixelText.
const TINY_FONT = {
  'A':[0x2,0x5,0x7,0x5,0x5], 'B':[0x6,0x5,0x6,0x5,0x6], 'C':[0x3,0x4,0x4,0x4,0x3],
  'D':[0x6,0x5,0x5,0x5,0x6], 'E':[0x7,0x4,0x6,0x4,0x7], 'F':[0x7,0x4,0x6,0x4,0x4],
  'G':[0x3,0x4,0x5,0x5,0x3], 'H':[0x5,0x5,0x7,0x5,0x5], 'I':[0x7,0x2,0x2,0x2,0x7],
  'J':[0x1,0x1,0x1,0x5,0x2], 'K':[0x5,0x6,0x4,0x6,0x5], 'L':[0x4,0x4,0x4,0x4,0x7],
  'M':[0x5,0x7,0x7,0x5,0x5], 'N':[0x5,0x7,0x7,0x7,0x5], 'O':[0x2,0x5,0x5,0x5,0x2],
  'P':[0x6,0x5,0x6,0x4,0x4], 'Q':[0x2,0x5,0x5,0x6,0x3], 'R':[0x6,0x5,0x6,0x5,0x5],
  'S':[0x3,0x4,0x2,0x1,0x6], 'T':[0x7,0x2,0x2,0x2,0x2], 'U':[0x5,0x5,0x5,0x5,0x2],
  'V':[0x5,0x5,0x5,0x2,0x2], 'W':[0x5,0x5,0x7,0x7,0x5], 'X':[0x5,0x5,0x2,0x5,0x5],
  'Y':[0x5,0x5,0x2,0x2,0x2], 'Z':[0x7,0x1,0x2,0x4,0x7],
  '0':[0x2,0x5,0x5,0x5,0x2], '1':[0x2,0x6,0x2,0x2,0x7], '2':[0x6,0x1,0x2,0x4,0x7],
  '3':[0x6,0x1,0x2,0x1,0x6], '4':[0x5,0x5,0x7,0x1,0x1], '5':[0x7,0x4,0x6,0x1,0x6],
  '6':[0x3,0x4,0x6,0x5,0x2], '7':[0x7,0x1,0x2,0x2,0x2], '8':[0x2,0x5,0x2,0x5,0x2],
  '9':[0x2,0x5,0x3,0x1,0x6],
  ' ':[0x0,0x0,0x0,0x0,0x0], '.':[0x0,0x0,0x0,0x0,0x2], '!':[0x2,0x2,0x2,0x0,0x2],
  '?':[0x6,0x1,0x2,0x0,0x2], '*':[0x0,0x5,0x2,0x5,0x0], '-':[0x0,0x0,0x7,0x0,0x0],
};

function drawTinyText(ctx, text, x, y, color, shadowColor) {
  const str = String(text).toUpperCase();
  for (let i = 0; i < str.length; i++) {
    const glyph = TINY_FONT[str[i]];
    const cx = x + i * 4;
    if (!glyph) continue;
    for (let row = 0; row < 5; row++) {
      const bits = glyph[row];
      if (!bits) continue;
      for (let col = 0; col < 3; col++) {
        if (bits & (0x4 >> col)) {
          if (shadowColor) {
            ctx.fillStyle = shadowColor;
            ctx.fillRect(cx + col, y + row + 1, 1, 1);
          }
          ctx.fillStyle = color;
          ctx.fillRect(cx + col, y + row, 1, 1);
        }
      }
    }
  }
}

function drawPixelText(ctx, text, x, y, color, shadowColor) {
  const str = String(text).toUpperCase();
  for (let i = 0; i < str.length; i++) {
    const glyph = PIXEL_FONT[str[i]];
    if (!glyph) continue;
    const cx = x + i * 6;
    for (let row = 0; row < 7; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 5; col++) {
        if (bits & (0x10 >> col)) {
          if (shadowColor) {
            ctx.fillStyle = shadowColor;
            ctx.fillRect(cx + col + 1, y + row + 1, 1, 1);
          }
          ctx.fillStyle = color;
          ctx.fillRect(cx + col, y + row, 1, 1);
        }
      }
    }
  }
}

const GOOMBA_SPRITE = [
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,1,1,2,2,1,1,1,2,2,1,1,0,0,0],
  [0,1,1,2,2,3,2,1,2,2,3,2,1,1,0,0],
  [0,1,1,2,2,3,2,1,2,2,3,2,1,1,0,0],
  [0,1,1,1,2,2,1,1,1,2,2,1,1,1,0,0],
  [0,0,1,1,1,1,2,2,2,1,1,1,1,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,3,1,1,1,1,1,3,0,0,0,0,0],
  [0,0,0,3,3,3,1,1,1,3,3,3,0,0,0,0],
  [0,0,3,3,3,3,1,1,1,3,3,3,3,0,0,0],
  [0,0,3,3,0,3,3,3,3,3,0,3,3,0,0,0],
  [0,0,0,0,0,3,3,0,3,3,0,0,0,0,0,0],
  [0,0,0,0,0,3,3,0,3,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];
const GOOMBA_FLAT = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [1,1,2,2,1,1,1,1,1,2,2,1,1,1,1,0],
  [1,2,2,3,2,1,1,1,2,3,2,1,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];
const GOOMBA_PALETTE = { 1: COL.goomba, 2: COL.white, 3: COL.black };

// ----------------------------------------------------------------
// Per-biome enemy skin variants. Same silhouette, different palette
// so each section feels distinct without inflating the entity zoo.
// Indexed by Bm.id (0=Forest, 1=Snow, 2=Desert, 3=Lava).
// ----------------------------------------------------------------
const GOOMBA_PALETTE_BY_BIOME = [
  { 1: '#c06888', 2: COL.white, 3: COL.black },             // Forest: classic mauve mushroom
  { 1: '#a8c8e8', 2: '#fcfcfc', 3: '#1a2848' },             // Snow: icy pale-blue
  { 1: '#d09858', 2: '#fcf0c8', 3: '#3a1808' },             // Desert: sandstone/mummy
  { 1: '#5a2018', 2: '#ffd068', 3: '#100408' },             // Lava: charred with ember glow
  { 1: '#5a1850', 2: '#e0c0ff', 3: '#100410' },             // Cosmic: void shade with sparkle highlight
];
const KOOPA_SHELL_BY_BIOME = [
  { hi: '#7898d0', mid: '#5878b8', lo: '#384888', head: '#b8d060', headLo: '#607828' }, // Forest
  { hi: '#a8d8f0', mid: '#7098c8', lo: '#385080', head: '#e0f0fc', headLo: '#5878a8' }, // Snow (icy)
  { hi: '#d8b070', mid: '#a07840', lo: '#583810', head: '#c89858', headLo: '#604018' }, // Desert (cobra-bronze)
  { hi: '#d04020', mid: '#883010', lo: '#380808', head: '#ffa040', headLo: '#702008' }, // Lava (salamander)
  { hi: '#a040d8', mid: '#6018a0', lo: '#280850', head: '#e0c0ff', headLo: '#604098' }, // Cosmic (void-shell)
];
const BUZZY_PALETTE_BY_BIOME = [
  { 1: '#4050b8', 2: COL.white, 3: COL.black },             // Forest (default)
  { 1: '#80b0e0', 2: '#fcfcfc', 3: '#102448' },             // Snow (frosted shell)
  { 1: '#a86838', 2: '#fcf0c8', 3: '#3a1808' },             // Desert (scarab)
  { 1: '#702010', 2: '#ffd068', 3: '#100408' },             // Lava (magma shell)
  { 1: '#5a1880', 2: '#e0c0ff', 3: '#100410' },             // Cosmic (void shell)
];
const SWOOPER_COLORS_BY_BIOME = [
  { wing: '#5838a0', bodyHi: '#9068c8', bodyMid: '#5838a0', bodyLo: '#2a1050' }, // Forest bat
  { wing: '#5a78a8', bodyHi: '#a0b8d8', bodyMid: '#5a78a8', bodyLo: '#203858' }, // Snow owl
  { wing: '#a06030', bodyHi: '#d8a060', bodyMid: '#a06030', bodyLo: '#502810' }, // Desert hawk
  { wing: '#a02810', bodyHi: '#ffa040', bodyMid: '#a02810', bodyLo: '#380808' }, // Lava firebat
  { wing: '#6018a0', bodyHi: '#c878f0', bodyMid: '#6018a0', bodyLo: '#200840' }, // Cosmic stellar-bat
];
const PHANTOM_COLORS_BY_BIOME = [
  { hi: '#fcfcfc', mid: '#e0d8f0', lo: '#b8a8d8', glow: '#fcf0a0' }, // Forest wisp
  { hi: '#e8f4ff', mid: '#b8d4ec', lo: '#7898c0', glow: '#a0d8ff' }, // Snow spirit
  { hi: '#fff0c8', mid: '#e8c898', lo: '#a8784a', glow: '#fff8a0' }, // Desert mirage
  { hi: '#ffe0b0', mid: '#ff9050', lo: '#a04018', glow: '#fff0a0' }, // Lava ember-ghost
  { hi: '#f0d8ff', mid: '#c890f0', lo: '#7038a8', glow: '#ffe8a0' }, // Cosmic apparition
];

// Helper: pick the biome variant for an enemy (computed from world x).
function biomeIdAtX(x) {
  return biomeAtX(x).id;
}

const KOOPA_SPRITE = [
  [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,1,2,2,1,2,1,0,0,0,0,0,0],
  [0,0,0,0,1,2,3,2,2,1,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,4,1,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,4,4,4,1,1,1,4,0,0,0,0,0,0],
  [0,0,4,4,4,4,1,1,4,4,4,0,0,0,0,0],
  [0,0,4,5,4,4,1,4,4,5,4,0,0,0,0,0],
  [0,0,4,5,5,4,4,4,5,5,4,0,0,0,0,0],
  [0,0,0,4,5,5,4,5,5,4,0,0,0,0,0,0],
  [0,0,0,0,4,4,4,4,4,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,6,6,0,6,6,0,0,0,0,0,0,0],
  [0,0,0,6,6,6,0,6,6,6,0,0,0,0,0,0],
];
const KOOPA_SHELL = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,4,4,4,4,4,4,0,0,0,0,0,0],
  [0,0,0,4,4,5,4,4,5,4,4,0,0,0,0,0],
  [0,0,4,4,5,5,4,4,5,5,4,4,0,0,0,0],
  [0,0,4,4,5,5,4,4,5,5,4,4,0,0,0,0],
  [0,0,0,4,4,5,4,4,5,4,4,0,0,0,0,0],
  [0,0,0,0,4,4,4,4,4,4,0,0,0,0,0,0],
  [0,0,0,6,6,6,6,6,6,6,6,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];
const KOOPA_PALETTE = { 1: COL.koopa, 2: COL.white, 3: COL.black, 4: COL.koopa, 5: COL.koopaDark, 6: '#d0c0e0' };

// Bowser boss sprite (32x32)
const BOWSER_SPRITE = [
  [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,1,2,2,1,0,1,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,1,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,1,2,2,2,2,2,2,2,2,2,2,1,1,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,3,3,1,1,1,1,1,1,1,1,1,1,3,3,1,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,3,4,4,3,3,3,3,3,3,3,3,3,3,4,4,3,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,3,4,4,5,5,3,3,3,3,3,3,3,3,5,5,4,4,3,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,3,4,5,6,6,5,5,3,3,3,3,5,5,6,6,5,4,3,1,0,0,0,0,0,0,0],
  [0,0,0,0,1,3,3,4,5,5,5,5,3,3,3,3,3,3,5,5,5,5,4,3,3,1,0,0,0,0,0,0],
  [0,0,0,0,1,3,3,3,4,4,4,3,3,3,3,3,3,3,3,4,4,4,3,3,3,1,0,0,0,0,0,0],
  [0,0,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,0,0,0,0,0],
  [0,0,0,1,3,3,3,3,3,3,3,7,7,7,7,7,7,7,7,3,3,3,3,3,3,3,1,0,0,0,0,0],
  [0,0,1,3,3,3,3,3,3,3,7,7,8,7,8,7,8,7,8,7,3,3,3,3,3,3,3,1,0,0,0,0],
  [0,0,1,3,3,3,3,3,3,7,7,8,8,7,8,7,8,8,7,7,3,3,3,3,3,3,3,1,0,0,0,0],
  [0,0,1,3,3,3,3,3,3,7,8,8,7,7,8,7,7,8,8,7,3,3,3,3,3,3,3,1,0,0,0,0],
  [0,0,1,3,3,3,3,3,3,7,7,7,7,7,7,7,7,7,7,7,3,3,3,3,3,3,3,1,0,0,0,0],
  [0,0,0,1,3,3,3,3,3,3,7,7,7,7,7,7,7,7,7,3,3,3,3,3,3,3,1,0,0,0,0,0],
  [0,0,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,0,0,0,0,0],
  [0,0,0,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,0,0,0,0,0,0],
  [0,0,0,0,0,1,3,3,1,3,3,3,3,3,3,3,3,3,3,3,3,1,3,3,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,9,1,3,3,3,3,3,3,3,3,3,3,1,9,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,9,9,1,3,3,3,3,3,3,3,3,1,9,9,1,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,9,9,1,3,3,3,3,3,3,3,3,1,9,9,1,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,9,9,1,3,3,3,3,3,3,1,9,9,1,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,9,9,1,3,3,3,3,3,3,1,9,9,1,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,1,9,1,1,1,3,3,1,1,1,9,1,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,1,9,9,1,3,3,1,9,9,1,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,1,9,9,1,3,3,1,9,9,1,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,1,1,9,1,0,1,1,0,1,9,1,1,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,9,9,1,0,0,0,0,0,0,1,9,9,1,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0],
];
const BOWSER_PALETTE = {
  1: '#802060', 2: '#c04080', 3: '#5040a0', 4: '#8070c0',
  5: '#fcfcfc', 6: '#000000', 7: '#e8c850', 8: '#a08020',
  9: '#e8c850',
};

// Boss fireball sprite (8x8)
const FIREBALL_SPRITE = [
  [0,0,1,1,1,1,0,0],
  [0,1,2,2,2,2,1,0],
  [1,2,3,3,2,2,2,1],
  [1,2,3,2,2,2,2,1],
  [1,2,2,2,2,3,2,1],
  [1,2,2,2,3,3,2,1],
  [0,1,2,2,2,2,1,0],
  [0,0,1,1,1,1,0,0],
];
const FIREBALL_PALETTE = { 1: '#c060a0', 2: '#e080c0', 3: '#f0c0e0' };

// ================================================================
// SOUND EFFECTS (Web Audio - NES style)
// ================================================================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;
function ensureAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }

function playSound(type) {
  try {
    ensureAudio();
    const c = audioCtx;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    gain.gain.setValueAtTime(0.07, c.currentTime);

    switch(type) {
      case 'jump':
        osc.type = 'square';
        osc.frequency.setValueAtTime(380, c.currentTime);
        osc.frequency.linearRampToValueAtTime(760, c.currentTime + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.18);
        break;
      case 'doublejump':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, c.currentTime);
        osc.frequency.linearRampToValueAtTime(980, c.currentTime + 0.08);
        osc.frequency.linearRampToValueAtTime(1200, c.currentTime + 0.15);
        gain.gain.setValueAtTime(0.05, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.2);
        break;
      case 'coin':
        osc.type = 'square';
        osc.frequency.setValueAtTime(988, c.currentTime);
        osc.frequency.setValueAtTime(1319, c.currentTime + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.18);
        break;
      case 'stomp':
        osc.type = 'square';
        osc.frequency.setValueAtTime(550, c.currentTime);
        osc.frequency.linearRampToValueAtTime(180, c.currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.12);
        break;
      case 'powerup':
        osc.type = 'square';
        osc.frequency.setValueAtTime(523, c.currentTime);
        osc.frequency.setValueAtTime(659, c.currentTime + 0.07);
        osc.frequency.setValueAtTime(784, c.currentTime + 0.14);
        osc.frequency.setValueAtTime(1047, c.currentTime + 0.21);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.35);
        break;
      case 'shrink':
        osc.type = 'square';
        osc.frequency.setValueAtTime(784, c.currentTime);
        osc.frequency.setValueAtTime(523, c.currentTime + 0.08);
        osc.frequency.setValueAtTime(330, c.currentTime + 0.16);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.3);
        break;
      case 'die':
        osc.type = 'square';
        osc.frequency.setValueAtTime(580, c.currentTime);
        osc.frequency.linearRampToValueAtTime(90, c.currentTime + 0.55);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.6);
        break;
      case 'bump':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, c.currentTime);
        osc.frequency.linearRampToValueAtTime(90, c.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.07);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.07);
        break;
      case 'brick':
        osc.type = 'square';
        osc.frequency.setValueAtTime(190, c.currentTime);
        osc.frequency.linearRampToValueAtTime(70, c.currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.1);
        break;
      case 'flagpole':
        osc.type = 'square';
        gain.gain.setValueAtTime(0.05, c.currentTime);
        for (let i = 0; i < 8; i++) osc.frequency.setValueAtTime(380 + i * 75, c.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.7);
        break;
      case 'warning':
        osc.type = 'square';
        gain.gain.setValueAtTime(0.04, c.currentTime);
        osc.frequency.setValueAtTime(440, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.15);
        break;
      case 'gate_slam':
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.08, c.currentTime);
        osc.frequency.setValueAtTime(120, c.currentTime);
        osc.frequency.linearRampToValueAtTime(40, c.currentTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.2);
        break;
      case 'boss_roar':
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.12, c.currentTime);
        osc.frequency.setValueAtTime(100, c.currentTime);
        osc.frequency.linearRampToValueAtTime(200, c.currentTime + 0.15);
        osc.frequency.linearRampToValueAtTime(50, c.currentTime + 0.6);
        gain.gain.linearRampToValueAtTime(0.14, c.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.8);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.8);
        break;
      case 'bosshit':
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.1, c.currentTime);
        osc.frequency.setValueAtTime(250, c.currentTime);
        osc.frequency.linearRampToValueAtTime(60, c.currentTime + 0.2);
        gain.gain.linearRampToValueAtTime(0.12, c.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.35);
        break;
      case 'bossdie':
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.1, c.currentTime);
        osc.frequency.setValueAtTime(350, c.currentTime);
        osc.frequency.linearRampToValueAtTime(25, c.currentTime + 1.2);
        gain.gain.linearRampToValueAtTime(0.12, c.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.5);
        osc.start(c.currentTime); osc.stop(c.currentTime + 1.5);
        break;
      case 'fireball':
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.05, c.currentTime);
        osc.frequency.setValueAtTime(600, c.currentTime);
        osc.frequency.linearRampToValueAtTime(200, c.currentTime + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.15);
        break;
      case 'kick':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(700, c.currentTime);
        osc.frequency.linearRampToValueAtTime(250, c.currentTime + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.1);
        break;
      case '1up':
        osc.type = 'square';
        gain.gain.setValueAtTime(0.06, c.currentTime);
        osc.frequency.setValueAtTime(330, c.currentTime);
        osc.frequency.setValueAtTime(392, c.currentTime + 0.06);
        osc.frequency.setValueAtTime(523, c.currentTime + 0.12);
        osc.frequency.setValueAtTime(659, c.currentTime + 0.18);
        osc.frequency.setValueAtTime(784, c.currentTime + 0.24);
        osc.frequency.setValueAtTime(1047, c.currentTime + 0.30);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.45);
        break;
    }
  } catch(e) {}
}

function startStarMusic() {
  stopStarMusic();
  const notes = [
    523, 587, 659, 698, 784, 698, 784, 880,
    784, 698, 659, 587, 523, 587, 659, 698,
  ];
  let idx = 0;
  function playNote() {
    if (!audioCtx || mario.starPower <= 0) { stopStarMusic(); return; }
    try {
      const c = audioCtx;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.type = 'square';
      gain.gain.setValueAtTime(0.04, c.currentTime);
      osc.frequency.setValueAtTime(notes[idx % notes.length], c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
      osc.start(c.currentTime); osc.stop(c.currentTime + 0.12);
      idx++;
    } catch(e) {}
  }
  playNote();
  starMusicInterval = setInterval(playNote, 120);
}

function stopStarMusic() {
  if (starMusicInterval) { clearInterval(starMusicInterval); starMusicInterval = null; }
}

// ================================================================
// LEVEL BUILDER
// ================================================================
const LEVEL_WIDTH = 540;
const LEVEL_HEIGHT = 15;

function buildLevel() {
  const map = [];
  for (let y = 0; y < LEVEL_HEIGHT; y++) map[y] = new Array(LEVEL_WIDTH).fill(0);

  function ground(x1, x2) {
    for (let x = x1; x <= x2; x++) { map[13][x] = 1; map[14][x] = 1; }
  }
  function addPipe(x, height) {
    const topRow = 13 - height;
    map[topRow][x] = 12;
    map[topRow][x + 1] = 13;
    for (let r = topRow + 1; r <= 12; r++) { map[r][x] = 10; map[r][x + 1] = 11; }
  }
  function stairUp(startX, steps) {
    for (let s = 0; s < steps; s++) {
      for (let y = 12 - s; y <= 12; y++) map[y][startX + s] = 5;
    }
  }
  function stairDown(startX, steps) {
    for (let s = 0; s < steps; s++) {
      for (let y = 12 - (steps - 1 - s); y <= 12; y++) map[y][startX + s] = 5;
    }
  }
  function platform(x1, x2, y) {
    for (let x = x1; x <= x2; x++) map[y][x] = 5;
  }

  // ==========================================================
  // SECTION 1: WHISPERING WOODS (forest) — tiles 0..119
  // Gentle intro: bushes, ? blocks, vines, two short pipes.
  // Every ? block is reachable directly from below in BOTH small
  // and big form — no stacked ?-blocks (which trap big Mario).
  // ==========================================================
  ground(0, 28);
  map[9][12] = 3;                                   // first ? block
  map[9][18] = 2; map[9][19] = 3; map[9][20] = 4; map[9][21] = 2; // brick row + powerup
  map[5][24] = 3;                                   // lone high ? (no row 9 below = clear path)
  // Small gap (29-31) — easy hop
  ground(32, 60);
  map[5][33] = 6;                                   // 1-up high reward (isolated, no row 9 below)
  map[9][35] = 3; map[9][36] = 2; map[9][37] = 3;
  addPipe(44, 2);                                   // small pipe with piranha
  map[9][50] = 2; map[9][51] = 2; map[9][52] = 2;
  map[6][55] = 3;                                   // bonus high ? after brick row (clear column)
  addPipe(57, 3);
  // Mid gap (61-63)
  ground(64, 92);
  // Mossy ruin staircase
  stairUp(66, 3);
  map[9][72] = 3;
  map[9][76] = 2; map[9][77] = 3; map[9][78] = 2;
  // Floating leaf platform — ? at row 5 (sits flush above row 8 platform; both forms can hit)
  platform(82, 86, 8);
  map[5][84] = 3;                                   // big Mario stands flush, jump bonks block (16px clear is exact)
  addPipe(89, 3);
  // Final approach
  ground(94, 120);                                  // up to + including checkpoint tile
  map[9][98] = 3; map[9][99] = 2; map[9][100] = 4; map[9][101] = 2;
  // Pre-checkpoint elevation
  platform(105, 109, 9);
  map[5][107] = 3;                                  // 3-tile rise from platform
  stairUp(112, 4);                                  // gentle stairs into checkpoint

  // ==========================================================
  // SECTION 2: FROSTPEAK PASS (snow) — tiles 121..239
  // Slippery-looking ice, snowdrift platforms, longer jumps.
  // ==========================================================
  ground(120, 138);
  // Frozen pillars (hard blocks)
  for (let y = 11; y <= 12; y++) map[y][125] = 5;
  for (let y = 9; y <= 12; y++) map[y][131] = 5;
  map[9][128] = 3;
  // Ice floe gap (139-142)
  ground(143, 168);
  // Stepped ice platforms
  platform(146, 148, 10);
  platform(150, 153, 8);
  map[5][152] = 3;                                   // row 5 above row 8 platform — big Mario stands flush + jump bonks
  platform(156, 159, 9);
  map[9][156] = 2; map[9][157] = 4; map[9][158] = 2;
  // Big icy gap (169-172) — needs solid jump
  ground(173, 196);
  // Glacier wall + staircase
  for (let y = 8; y <= 12; y++) map[y][175] = 5;     // 1-tile glacier pillar
  // 5-step staircase climbing to row 8. Earlier this was a 4-step stair
  // topping out at row 9, which left the row-5 vault essentially
  // unreachable: from ground level the row-5 block bottom (y=96) sits
  // 88px above big-Mario's head, but a single held-jump only climbs
  // ~71px — meaning the vault required a pixel-perfect double-jump
  // *and* perfect horizontal alignment with no nearby platform to
  // stage from. The extra step at col 182 / row 8 puts Mario's head
  // 8px under the vault, so a single jump from the staircase top
  // comfortably bonks any of the four blocks in both small and big
  // form. Big Mario can still walk under the vault on the ground —
  // row 6 and 7 stay clear.
  stairUp(178, 5);
  // High vault row at row 5 — bricks flank a coin ?-block and a 1-up.
  // Reachable in one jump from the new top step at col 182 row 8.
  map[5][184] = 2; map[5][185] = 3; map[5][187] = 2;
  map[5][186] = 6;                                   // 1-up surprise
  platform(190, 193, 8);
  map[9][191] = 3; map[9][192] = 2;
  // Long crevasse (197-200) — double jump or run
  ground(201, 240);
  // Snow-cap floating platforms approaching checkpoint
  platform(206, 208, 10);
  platform(212, 215, 8);
  map[5][214] = 3;                                   // row 5 above row 8 platform — both forms can stand flush + bonk
  // Hardest stretch: ice bridge with hidden mushroom underneath.
  // Two short ice stubs (cols 220 & 224, rows 6-7) carry a 5-wide bridge
  // at row 6 — the silhouette reads like an upside-down "Π". Below the
  // bridge the space is fully open: Mario can walk under at ground level
  // (rows 11-12) AND a mushroom popped from the hidden ?-block at row 9
  // can actually fall to the ground without getting trapped.
  // Earlier the side walls ran rows 6-10 which made a sealed-box vault
  // — looked nice, but the popped mushroom would oscillate forever
  // between the two interior walls because the chamber was only 3 tiles
  // wide and the walls extended right alongside the ?-block, so the
  // mushroom could never walk off the block edge to fall through the
  // bottom tunnel. Shortening the side stubs preserves the "find the
  // secret" landmark while letting powerups behave normally.
  for (let y = 6; y <= 7; y++) map[y][220] = 5;
  for (let y = 6; y <= 7; y++) map[y][224] = 5;
  platform(220, 224, 6);                             // bridge across the towers
  map[3][222] = 7;                                   // STAR at row 3 — gives big Mario 8px head clearance over row 6 bridge
  map[9][222] = 4;                                   // hidden mushroom ?-block dangling under the bridge
  // Run-up to checkpoint
  map[9][230] = 2; map[9][231] = 3; map[9][232] = 2;
  stairUp(234, 4);

  // ==========================================================
  // SECTION 3: DUSKDUNE EXPANSE (desert) — tiles 240..359
  // Sand pyramids, clay pipes, longer flat sprints with cacti.
  // ==========================================================
  ground(240, 268);
  // Pyramid 1 — symmetric 11-wide triangular pyramid, single-block
  // apex at col 249 / row 7. Base spans cols 244-254 with heights
  // 1,2,3,4,5,6,5,4,3,2,1. We use an ODD base width so the apex
  // lands on a single centred column naturally — earlier even-width
  // bases needed a hand-placed capstone that visibly offset the
  // peak to one side and made the left descending edge look like
  // it was missing a block.
  stairUp(244, 6);
  stairDown(250, 5);
  map[9][255] = 3;
  map[9][258] = 2; map[9][259] = 3; map[9][260] = 4; map[9][261] = 2;
  // Sand gap (269-271)
  ground(272, 300);
  // Clay pipe duo
  addPipe(274, 2);
  addPipe(282, 3);
  // Floating oasis platform
  platform(287, 291, 8);
  map[5][289] = 3;                                   // row 5 above row 8 platform — flush stand + bonk on jump
  // Pyramid 2 (taller) — same odd-width treatment as pyramid 1.
  // 13-wide base (cols 294-306), heights 1..7..1, apex at col 300
  // row 6. Single-tile peak with no patched-on capstone, so the
  // silhouette reads as a clean symmetric triangle.
  stairUp(294, 7);
  stairDown(301, 6);
  ground(301, 326);
  // Mid-section: blocks + cactus row (cacti are background only)
  map[9][308] = 2; map[9][309] = 3; map[9][310] = 2;
  map[5][312] = 6;                                   // 1-up (clear column, no row 9 below = directly hittable)
  // Quicksand gap (327-330)
  ground(331, 360);
  // Final dunes & ? blocks
  platform(334, 337, 10);
  map[9][332] = 3;                                   // ?-block off the platform col so coin/block don't overlap
  map[9][342] = 2; map[9][343] = 3; map[9][344] = 2;
  map[5][346] = 4;                                   // powerup in clear column (no row 9 below)
  addPipe(348, 2);
  // Approach to lava checkpoint
  stairUp(354, 4);

  // ==========================================================
  // SECTION 4: EMBERHEART CALDERA (lava) — tiles 360..479
  // Pure platforming section. Boss has been moved out into its
  // own COSMIC NEXUS section (480..540), so this stretch is now
  // a clean, equally-sized lava biome ending right at tile 480.
  // ==========================================================
  ground(360, 388);
  // Initial obsidian rise
  for (let y = 11; y <= 12; y++) map[y][364] = 5;
  for (let y = 9; y <= 12; y++) map[y][368] = 5;
  map[9][371] = 3; map[9][372] = 2; map[9][373] = 4; map[9][374] = 2;
  map[5][376] = 3;                                   // high ? in clear column (no row 9 below)
  // Mid-size full pyramid (9-7-5-3-1) — answers the desert biome's
  // two big pyramids and visually balances the lava section's
  // broken-top volcano silhouette in the background. Same odd-width
  // treatment as the desert pyramids: stairUp + stairDown produce a
  // clean single-tile apex at col 383 / row 8. Heights: 1,2,3,4,5,
  // 4,3,2,1. The 1-up at col 384 (row 5) hangs in the air directly
  // above the right shoulder of the pyramid, still hittable from on
  // top of the apex. The descending right side acts as a natural
  // launch ramp into lava chasm 1 (cols 389-392), with col 388 as
  // a one-tile breather of flat ground before the gap.
  stairUp(379, 5);                                   // base→apex (cols 379-383)
  stairDown(384, 4);                                 // apex→base (cols 384-387)
  map[4][385] = 6;                                   // 1-up (lava biome's own life reward) — nudged up-and-right off the pyramid's right shoulder so it reads as a separate prize rather than sitting directly above the descending stairs
  // Lava chasm 1 (389-392)
  ground(393, 410);
  // Floating obsidian islands
  platform(395, 397, 10);
  platform(400, 403, 8);
  map[5][402] = 3;                                   // row 5 above row 8 platform
  platform(406, 408, 9);
  map[6][407] = 7;                                   // STAR power-up (row 6 above row 9 platform)
  // Lava chasm 2 (411-413)
  ground(414, 438);
  // Pre-arena obsidian terrain
  map[9][418] = 2; map[9][419] = 3; map[9][420] = 4; map[9][421] = 2;
  stairUp(422, 3);                                   // climb 422-424
  stairDown(425, 3);                                 // descend 425-427
  for (let y = 9; y <= 12; y++) map[y][432] = 5;     // mid pillar
  map[5][435] = 3;                                   // high ? in clear column
  // Lava chasm 3 (439-442)
  ground(443, 460);
  // Floating ember platforms
  platform(446, 449, 8);
  map[5][447] = 3;                                   // ?-block above row 8 platform
  for (let y = 10; y <= 12; y++) map[y][453] = 5;
  for (let y = 8; y <= 12; y++) map[y][457] = 5;
  platform(453, 457, 7);                             // bridge between two pillars
  map[4][455] = 6;                                   // 1-up high above bridge (clear column above)
  // Lava chasm 4 (461-463)
  ground(464, 479);
  // Final lava stretch — bricks + powerup before the cosmic biome border
  map[9][468] = 2; map[9][469] = 3; map[9][470] = 4; map[9][471] = 2;
  stairUp(474, 3);                                   // small rise 474-476
  // 477-479 left flat to merge cleanly into the cosmic approach

  // ==========================================================
  // SECTION 5: COSMIC NEXUS (the small "5th section") — tiles 480..540
  // Universe-themed final showdown: brief approach, pre-boss
  // checkpoint flag (CHECKPOINT_XS index 3), restock powerup,
  // then boss arena, then victory walk to the end flag + castle.
  // ==========================================================
  ground(480, 540);                                  // continuous floor through arena, flag, castle
  // Pre-boss restock powerup (mushroom or flower depending on size).
  // Sits 8 tiles AFTER the checkpoint flag (480) and BEFORE the
  // arena's left wall (495), so the player can grab it on approach.
  map[9][488] = 4;
  // Boss arena: left wall raised dynamically by the intro cutscene.
  // Right wall (BOSS_GATE_X = 510) is permanent — sealed until outro.
  for (let y = 2; y <= 12; y++) map[y][BOSS_GATE_X] = 5;
  // Centre platform inside the arena. The playable interior is an EVEN
  // 14 tiles wide (cols 496..509), so a single-tile platform can never
  // be perfectly centred — it would always lean 1 col one way. A
  // 2-tile platform at cols 502-503 is the smallest shape whose
  // midpoint lands exactly on the arena centre.
  //
  // Symmetry audit (don't change these numbers without re-doing the math):
  //   left wall right-edge  = 496 * 16 = 7936 px
  //   right wall left-edge  = 510 * 16 = 8160 px
  //   interior midpoint     = (7936 + 8160) / 2 = 8048 px
  //   platform left-edge    = 502 * 16 = 8032 px
  //   platform right-edge   = 504 * 16 = 8064 px
  //   platform midpoint     = (8032 + 8064) / 2 = 8048 px ✓
  //   empty cols to left    = 6   (496,497,498,499,500,501)
  //   empty cols to right   = 6   (504,505,506,507,508,509)
  map[9][502] = 2;
  map[9][503] = 2;

  // Victory ascent after boss → flag → castle
  stairUp(514, 6);                                   // cols 514-519 staircase up
  // 520-526 plateau leading to flagpole at 527, castle at 529
  // (flag pulled away from the pyramid so the player can air-dash with
  // a double jump; castle nudged in tight to the flag so it sits front
  // and centre of the viewport during the victory walk)
  // Level extends to 540 so the camera has room behind the castle.

  return map;
}

// ================================================================
// PHYSICS CONSTANTS (tuned for Kirby-like snappy feel)
// ================================================================
const GRAVITY_UP_HOLD = 0.22;
const GRAVITY_UP_RELEASE = 0.50;
const GRAVITY_DOWN = 0.55;
const JUMP_VEL = -5.6;
const MAX_FALL = 6.0;
// Snappier startup so the blob doesn't feel like it has to "rev up" before
// running. Skid stays as a separate, intentional reaction to flipping
// direction — and only when actually flipping (handled in input code below).
const WALK_ACCEL = 0.36;
const RUN_ACCEL = 0.45;
const MAX_WALK = 1.5;
const MAX_RUN = 2.5;
const FRICTION = 0.28;
const AIR_FRICTION = 0.03;
const SKID_DECEL = 0.32;
const COYOTE_FRAMES = 6;
const JUMP_BUFFER_FRAMES = 6;
const LEDGE_GRACE_FRAMES = 6;

const FLAGPOLE_X = 527;
const CASTLE_X = 529;
// Visible respawn flags. Index 0=snow, 1=desert, 2=lava, 3=pre-boss.
// (URL ?checkpoint=0 is the level start, which has no visible flag.)
// Each checkpoint sits exactly at its biome's entry tile so the
// progress bar's tick marks line up perfectly with the colour zones.
const CHECKPOINT_XS = [120, 240, 360, 480];

// ================================================================
// GAME STATE
// ================================================================
let levelMap;
let camera = { x: 0, rx: 0, targetX: 0 };
let prevState = { mx: 0, my: 0, cx: 0 };
let renderAlpha = 0;
let gameState = 'menu';
let paused = false;
let globalTick = 0;
var screenShake = 0;

const keys = {};
let jumpBufferTimer = 0;
let jumpPressed = false;
let jumpHeld = false;

let showScoreboard = false;

// ---- Spectator mode ----
// When a player is eliminated in MP they used to be greeted with a giant
// "ELIMINATED" curtain that hid the rest of the round. Now the camera
// detaches and follows one of the still-running opponents instead, so the
// player can watch how the match plays out. Left/Right arrows cycle the
// spectated target; Tab still pulls up the live scoreboard on top.
//
// `spectatorTargetId` is the player id we're currently following. We keep
// it sticky across frames as long as the target is still alive AND still
// in the room — `ensureSpectatorTarget()` re-picks if either condition
// breaks. `_lastSpectatorPick` is the wall-clock time of the last manual
// cycle, used purely for the HUD "just swapped" flash.
let spectatorTargetId = null;
let _lastSpectatorPick = 0;

function getSpectatableIds() {
  // Other players in the room that are (a) still alive (b) currently
  // sending us snapshots, so the spectator camera has something coherent
  // to follow. Falling back to "any other player in the roster" would
  // let us point the camera at a slot whose blob never appears on screen.
  var list = [];
  for (var i = 0; i < racePlayers.length; i++) {
    var p = racePlayers[i];
    if (!p || !p.id || p.id === myPlayerId) continue;
    if (p.alive === false) continue;
    if (!remoteStates.has(p.id)) continue;
    list.push(p.id);
  }
  return list;
}

function ensureSpectatorTarget() {
  var prev = spectatorTargetId;
  if (spectatorTargetId) {
    var meta = null;
    for (var i = 0; i < racePlayers.length; i++) {
      if (racePlayers[i] && racePlayers[i].id === spectatorTargetId) { meta = racePlayers[i]; break; }
    }
    if (meta && meta.alive !== false && remoteStates.has(spectatorTargetId)) return;
  }
  var ids = getSpectatableIds();
  spectatorTargetId = ids.length ? ids[0] : null;
  if (spectatorTargetId) {
    applyBlockStateToGlobal(spectatorTargetId);
    if (spectatorTargetId !== prev) {
      applyEntityKillsToAll(spectatorTargetId);
      requestSpectatorBlockState();
      requestSpectatorEntityKillState();
    }
  }
}

function cycleSpectator(dir) {
  var ids = getSpectatableIds();
  if (ids.length === 0) { spectatorTargetId = null; return; }
  var idx = ids.indexOf(spectatorTargetId);
  if (idx < 0) {
    spectatorTargetId = ids[0];
  } else {
    spectatorTargetId = ids[(idx + dir + ids.length) % ids.length];
  }
  _lastSpectatorPick = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  applyBlockStateToGlobal(spectatorTargetId);
  applyEntityKillsToAll(spectatorTargetId);
  requestSpectatorBlockState();
  requestSpectatorEntityKillState();
}

// Copy the backing-store block state for `pid` into the global Sets that
// the renderer and collision code read every frame.  Called synchronously
// when the spectator target changes so the very next frame is correct
// (the async requestSpectatorBlockState call just fills any gaps).
function applyBlockStateToGlobal(pid) {
  var bs = _playerBlockStates.get(pid);
  if (!bs) { hitBlocks.clear(); emptyBlocks.clear(); breakBlocks.clear(); return; }
  hitBlocks = new Set(bs.hitBlocks);
  emptyBlocks = new Set(bs.emptyBlocks);
  breakBlocks = new Set(bs.breakBlocks);
}

function requestSpectatorBlockState() {
  if (!ws || !multiplayerMode) return;
  var target = spectatorTargetId;
  if (!target) return;
  ws.emit('get_block_state', { targetId: target }, function(res) {
    if (res && res.ok && res.hitBlocks && spectatorTargetId === target) {
      var bs = _playerBlockStates.get(target);
      if (!bs) {
        bs = { hitBlocks: new Set(), emptyBlocks: new Set(), breakBlocks: new Set() };
        _playerBlockStates.set(target, bs);
      }
      for (var hi = 0; hi < res.hitBlocks.length; hi++) {
        var hk = res.hitBlocks[hi];
        bs.hitBlocks.add(hk);
        hitBlocks.add(hk);
      }
      for (var ei = 0; ei < res.emptyBlocks.length; ei++) {
        var ek = res.emptyBlocks[ei];
        bs.emptyBlocks.add(ek);
        emptyBlocks.add(ek);
      }
      for (var bi = 0; bi < res.breakBlocks.length; bi++) {
        var bk = res.breakBlocks[bi];
        bs.breakBlocks.add(bk);
        breakBlocks.add(bk);
        var bp = bk.split(',');
        var btx = parseInt(bp[0], 10), bty = parseInt(bp[1], 10);
        if (levelMap[bty] && levelMap[bty][btx]) levelMap[bty][btx] = 0;
      }
    }
  });
}

function requestSpectatorEntityKillState() {
  if (!ws || !multiplayerMode) return;
  var target = spectatorTargetId;
  if (!target) return;
  ws.emit('get_entity_kill_state', { targetId: target }, function(res) {
    if (res && res.ok && res.kills && spectatorTargetId === target) {
      var kp = _playerEntityKills.get(target);
      if (!kp) { kp = []; _playerEntityKills.set(target, kp); }
      for (var ki = 0; ki < res.kills.length; ki++) {
        kp.push(res.kills[ki]);
        if (kp.length > 500) kp.shift();
        applyEntityKillToLocal(res.kills[ki]);
      }
    }
  });
}

// Re-initialize the local entity/item/boss list to match what the
// spectated player sees, then apply their stored entity kills.
function applyEntityKillsToAll(pid) {
  if (!pid) return;
  entities = [];
  items = [];
  mapCoins = [];
  marioFireballs = [];
  coinAnims = [];
  particles = [];
  scorePopups = [];
  dustParticles = [];
  boss = null;
  bossFireballs = [];
  bossShockwaves = [];
  bossEncounterActive = false;
  bossIntroPhase = 0;
  bossIntroTimer = 0;
  bossOutroPhase = 0;
  bossOutroTimer = 0;
  spawnEnemies();
  spawnMapCoins();
  spawnBoss();
  var kp = _playerEntityKills.get(pid);
  if (kp) {
    for (var ki = 0; ki < kp.length; ki++) {
      applyEntityKillToLocal(kp[ki]);
    }
  }
}

window.addEventListener('keydown', e => {
  if (e.code === 'Tab') {
    e.preventDefault();
    if (!e.repeat && multiplayerMode && gameState === 'playing') {
      showScoreboard = true;
    }
    return;
  }
  if (e.repeat) return;

  // Spectator cycling: while eliminated in MP we re-purpose Left/Right
  // to swap which opponent the camera follows. Local movement is dead
  // anyway (`updateMario()` early-returns on `eliminated`), so stealing
  // the keys here doesn't fight any real input.
  if (eliminated && multiplayerMode && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
    e.preventDefault();
    cycleSpectator(e.code === 'ArrowRight' ? 1 : -1);
    return;
  }

  keys[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();

  if (e.code === 'Space' || e.code === 'ArrowUp') {
    jumpPressed = true;
    jumpHeld = true;
    jumpBufferTimer = JUMP_BUFFER_FRAMES;
  }

  if ((e.code === 'KeyX' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') && gameState === 'playing' && mario.fire && !mario.dead && !paused) {
    if (fireballCooldown <= 0 && marioFireballs.length < 2) {
      marioFireballs.push({
        x: mario.x + (mario.facing === 1 ? mario.w : -8),
        y: mario.y + (mario.big ? 10 : 6),
        vx: mario.facing * 4,
        vy: -1,
        w: 8, h: 8,
        bounces: 0,
        life: 180,
      });
      fireballCooldown = 15;
      playSound('fireball');
    }
  }

  if (e.code === 'Escape') {
    if (gameState === 'playing') {
      if (paused) resumeGame();
      else pauseGame();
    }
  }

  if (e.code === 'Enter' && gameState === 'win' && !multiplayerMode) {
    lives = 5;
    time = 400;
    checkpointIndex = -1;
    resetLevel();
    gameState = 'playing';
  }
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    jumpHeld = false;
  }
  if (e.code === 'Tab') {
    // Match-end forces the scoreboard up for everyone. Tab toggles
    // it normally otherwise.
    if (!matchEnding) showScoreboard = false;
  }
});

// Robust "stuck input" guard. When the window loses focus (Alt-Tab,
// OS-level shortcut, tab switch, dev-tools open, mobile app switcher,
// etc.) the browser fires `keydown` but often swallows the matching
// `keyup`, leaving the gameplay loop polling a phantom held direction.
// Clearing every input channel the loop reads on any focus-loss event
// stops the blob dead on return. Idempotent — safe to fire multiple
// times per focus transition (blur + visibilitychange often both fire).
function clearAllHeldInputs() {
  for (var k in keys) keys[k] = false;
  jumpHeld = false;
  jumpPressed = false;
  jumpBufferTimer = 0;
  showScoreboard = false;
}
window.addEventListener('blur', clearAllHeldInputs);
document.addEventListener('visibilitychange', function() {
  if (document.hidden) clearAllHeldInputs();
});

function setupMobileControls() {
  const mapping = { mLeft: 'ArrowLeft', mRight: 'ArrowRight', mA: 'Space', mB: 'KeyX' };
  Object.entries(mapping).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', e => {
      e.preventDefault();
      keys[key] = true;
      if (key === 'Space') { jumpPressed = true; jumpHeld = true; jumpBufferTimer = JUMP_BUFFER_FRAMES; }
    });
    el.addEventListener('touchend', e => {
      e.preventDefault();
      keys[key] = false;
      if (key === 'Space') jumpHeld = false;
    });
    // touchcancel fires when the OS/browser interrupts a touch
    // (incoming call, notification, gesture handoff). Without this the
    // button stays "held" after the interruption — same bug class as
    // the desktop stuck-key issue fixed above.
    el.addEventListener('touchcancel', e => {
      e.preventDefault();
      keys[key] = false;
      if (key === 'Space') jumpHeld = false;
    });
  });
}
setupMobileControls();

// ================================================================
// MARIO & GAME OBJECTS
// ================================================================
let mario = {};
let entities = [];
let particles = [];
let coinAnims = [];
let items = [];
let scorePopups = [];
var hudMessage = null;
let score = 0;
let coins = 0;
let lives = 3;
let time = 400;
let timeTimer = 0;
let matchTimeRemaining = 300;
let deathTimer = 0;
let winTimer = 0;
let gameOverTimer = 0;
let flagDescending = false;
// Castle-entry cutscene timer. After flag descent + walk to the castle
// door, this counts up while the blob "enters" the castle (fades out
// in front of the closed gate). gameState flips to 'win' once this
// reaches CASTLE_ENTER_DURATION, so the win card pops only after the
// blob has visually disappeared into the door.
let castleEnterTimer = 0;
const CASTLE_ENTER_DURATION = 32;
let flagY = 0;
let hitBlocks = new Set();
let emptyBlocks = new Set();
let breakBlocks = new Set();
// Per-player block state for spectating. Maps playerId → { hitBlocks: Set, emptyBlocks: Set }.
// Populated from server block_event messages; used by the renderer when eliminated.
var _playerBlockStates = new Map();
let dustParticles = [];
let eliminated = false;
let myPlayerFinished = false; // true in MP when local player finishes the level
let racePlayers = [];
let _playerEntityKills = new Map(); // playerId → [{entity, x, y, killType, shell, deathTimer, flat, remove, bossHp}]
let checkpointIndex = -1;
let mapCoins = [];
let enemiesKilled = 0;
let flagBonus = 0;
let timeBonus = 0;
let boss = null;
let bossFireballs = [];
let bossShockwaves = [];
let marioFireballs = [];
let fireballCooldown = 0;
let starMusicInterval = null;
const BOSS_ARENA_LEFT = 495;
const BOSS_ARENA_TRIGGER = 497;
const BOSS_GATE_X = 510;
let bossEncounterActive = false;
let bossIntroPhase = 0;
let bossIntroTimer = 0;
let bossIntroWallRow = 14;
let bossOutroPhase = 0;
let bossOutroTimer = 0;
let bossOutroWallRow = 2;

function resetMario() {
  const spawnX = checkpointIndex >= 0 ? CHECKPOINT_XS[checkpointIndex] * TILE : 40;
  mario = {
    x: spawnX, y: 12 * TILE,
    vx: 0, vy: 0,
    w: 14, h: 16,
    onGround: true,
    facing: 1,
    frame: 0,
    frameTimer: 0,
    big: false,
    fire: false,
    starPower: 0,
    dead: false,
    invincible: checkpointIndex >= 0 ? 120 : 0,
    coyoteTimer: 0,
    ledgeGraceTimer: 0,
    wasOnGround: false,
    skidding: false,
    crouching: false,
    jumpsUsed: 0,
    doubleJumpAnim: 0,
    landSquash: 0,
  };
}

function resetLevel() {
  levelMap = buildLevel();
  camera.x = checkpointIndex >= 0 ? CHECKPOINT_XS[checkpointIndex] * TILE - VIEW_W / 2 : 0;
  if (camera.x < 0) camera.x = 0;
  camera.rx = camera.x;
  camera.targetX = camera.x;
  prevState.mx = 0;
  prevState.my = 0;
  prevState.cx = 0;
  entities = [];
  particles = [];
  coinAnims = [];
  items = [];
  scorePopups = [];
  hudMessage = null;
  dustParticles = [];
  marioFireballs = [];
  fireballCooldown = 0;
  if (!multiplayerMode) {
    eliminated = false;
    racePlayers = [];
  }
  score = 0;
  coins = 0;
  enemiesKilled = 0;
  flagBonus = 0;
  timeBonus = 0;
  timeTimer = 0;
  matchTimeRemaining = 300;
  deathTimer = 0;
  winTimer = 0;
  flagDescending = false;
  castleEnterTimer = 0;
  flagY = 0;
  hitBlocks = new Set();
  emptyBlocks = new Set();
  breakBlocks = new Set();
  _playerBlockStates.clear();
  _playerEntityKills.clear();
  jumpBufferTimer = 0;
  jumpPressed = false;
  boss = null;
  bossFireballs = [];
  bossShockwaves = [];
  bossEncounterActive = false;
  bossIntroPhase = 0;
  bossIntroTimer = 0;
  bossIntroWallRow = 14;
  bossOutroPhase = 0;
  bossOutroTimer = 0;
  bossOutroWallRow = 2;
  resetMario();
  spawnEnemies();
  spawnMapCoins();
  spawnBoss();
  // Show the current biome banner whenever the level resets.
  const startTx = checkpointIndex >= 0 ? CHECKPOINT_XS[checkpointIndex] + 1 : 1;
  const startBiome = biomeAtTile(startTx);
  hudMessage = { text: startBiome.name, life: 150, maxLife: 150 };
}

function spawnEnemies() {
  // Each biome gets 4 distinct enemy types (skin variants count). Counts
  // are kept moderate so the level never feels crowded — remember the
  // player has a double-jump, so forgiving spacing keeps it fun.
  //
  // SMW-style placement rules followed below:
  //   • At most 3 enemies inside any ~12-column window. Three is fine,
  //     four turns into noise the player can't read.
  //   • Air enemies (swoopers, phantoms) live in their own visual lane,
  //     so a ground+air pair within 3-5 cols still feels readable.
  //   • Each biome gets calm stretches between enemy "groups" so the
  //     player can breathe between encounters instead of being chased
  //     down a conga-line of monsters.
  //   • No two enemies sit on the exact same column, and no two sit
  //     within 1-2 cols of each other (those used to read as a single
  //     overlapping monster).

  // ----- FOREST (0..119): gentle intro — goomba, koopa, piranha, bat -----
  // 7 goombas + 3 koopas + 2 swoopers + 3 piranha pipes = 15 enemies.
  // Earlier the back half had a Goomba-Koopa-Goomba trio at cols
  // 96/100/104 (3 in 9 cols) which read as a wall of enemies; the
  // 104 goomba is gone now and the koopa nudged to 102 to space it.
  [22, 35, 50, 70, 84, 96, 116].forEach(x => {
    entities.push(createGoomba(x * TILE, 12 * TILE));
  });
  [40, 78, 102].forEach(x => entities.push(createKoopa(x * TILE, 12 * TILE)));
  // Forest bat (purple swooper) — adds the 4th distinct type
  [62, 110].forEach(x => entities.push(createSwooper(x * TILE, 6 * TILE)));

  // ----- SNOW (120..239): icy goomba, penguin-koopa, frost-buzzy, snow-owl -----
  // 6G + 4K + 2B + 2S = 14 enemies (down from 17). Three tight trios were
  // dissolved: 156-160-165 (the row 9 G/K/B sandwich), 192-195-200 around
  // the crevasse, and the 225/228/232 finale. Owl moved from 145→142 so
  // it doesn't crowd the goomba on the next ice floe.
  [128, 148, 178, 192, 207, 232].forEach(x => {
    entities.push(createGoomba(x * TILE, 12 * TILE));
  });
  [134, 156, 184, 213].forEach(x => entities.push(createKoopa(x * TILE, 12 * TILE)));
  [165, 225].forEach(x => entities.push(createBuzzyBeetle(x * TILE, 12 * TILE)));
  [142, 200].forEach(x => entities.push(createSwooper(x * TILE, 6 * TILE)));

  // ----- DESERT (240..359): mummy-goomba, cobra-koopa, scarab-buzzy, mirage-phantom -----
  // 6G + 2K + 3B + 2P = 13 enemies (down from 16). Most painful clusters
  // before were the 282/288/290 pipe-buzzy-goomba pile, the 307+308 1-col
  // overlap (felt like a single enemy), the literal G+Ph stacked on
  // col 320, and the 336/340/344 G-K-G triple at the dunes. Phantoms
  // are now at 270 and 328 (moved off 320), and the dune koopa is gone.
  // (col 257 / col 307 sit on flat ground just past the pyramids — the
  // pyramid bases reach cols 254 and 306 respectively.)
  [257, 297, 320, 336, 344, 358].forEach(x => {
    entities.push(createGoomba(x * TILE, 12 * TILE));
  });
  [262, 307].forEach(x => entities.push(createKoopa(x * TILE, 12 * TILE)));
  [288, 314, 350].forEach(x => entities.push(createBuzzyBeetle(x * TILE, 12 * TILE)));
  [270, 328].forEach(x => entities.push(createPhantom(x * TILE, 8 * TILE)));

  // ----- LAVA (360..479): charred-goomba, salamander-koopa, magma-buzzy,
  // firebat-swooper, ember-phantom — full lava section, no boss inside -----
  // 4G + 2K + 2B + 2S + 3Ph = 13 enemies (down from 18). The middle of
  // lava used to be a swamp: SIX enemies between cols 400-418 (B/S/Ph/B/K/G,
  // including a 1-col overlap at 415-416). And the run-out had K 466 + G
  // 467 stacked. Now the cluster at 400-418 is broken (only S 405 + Ph
  // 410 remain in the air lane there, with ground action moved out to a
  // fresh buzzy at 430), and the run-out is just K 466 + S 470.
  [370, 384, 396, 444].forEach(x => entities.push(createGoomba(x * TILE, 12 * TILE)));
  [378, 466].forEach(x => entities.push(createKoopa(x * TILE, 12 * TILE)));
  [430, 450].forEach(x => entities.push(createBuzzyBeetle(x * TILE, 12 * TILE)));
  [405, 470].forEach(x => entities.push(createSwooper(x * TILE, 7 * TILE)));
  [390, 410, 458].forEach(x => entities.push(createPhantom(x * TILE, 8 * TILE)));

  // ----- COSMIC NEXUS (480..540): no enemies in this section. The
  // entire stage is dedicated to the boss fight + post-boss victory
  // walk — no adds, no flying ghost, just you vs. the boss. -----

  // Piranhas in pipes (forest + desert have pipes)
  [[44, 11], [57, 10], [89, 10], [274, 11], [282, 10], [348, 11]].forEach(([px, topRow]) => {
    entities.push(createPiranha(px, topRow));
  });
}

function spawnMapCoins() {
  mapCoins = [];
  // Rule: never place a static coin in the same column as a nearby ?-block
  // (since hitting the box already yields a coin). Coins live in arcs, gaps,
  // platform tops, and clear airspace as collectables along travel paths.
  const coinPositions = [
    // ----- FOREST -----
    [4, 11], [6, 11], [8, 11],
    [15, 11], [16, 11], [17, 11],                   // intro path (extra)
    [29, 9], [30, 8], [31, 9],                      // gap arc
    [44, 8], [45, 8],                               // pipe arc 1 (extra)
    [50, 7], [51, 7], [52, 7],                      // floating arc above brick row
    [61, 9], [62, 8], [63, 9],                      // pipe gap arc
    [73, 11], [74, 11],                             // ground stretch (extra)
    [82, 6], [83, 6], [85, 6], [86, 6],             // leaf platform top (skip col 84 — has ?-block)
    [98, 11], [99, 11],                             // ground (extra)
    [105, 7], [106, 7], [108, 7],                   // platform top (skip col 107 — has ?-block)
    [113, 9], [114, 8], [115, 7],                   // staircase climb
    // ----- SNOW -----
    [122, 11], [123, 11], [124, 11],
    [129, 11], [132, 11],                           // ice path (extra; col 131 has frozen pillar)
    [139, 9], [140, 8], [141, 9],                   // floe gap arc
    [150, 6], [151, 6], [153, 6],                   // ice platform top (skip col 152 — has ?-block)
    [169, 8], [170, 7], [171, 8],                   // big crevasse arc
    [180, 9], [181, 8],                             // arc up the glacier staircase (cols 178-181)
    [197, 9], [198, 8], [199, 8], [200, 9],         // long crevasse arc
    [212, 6], [213, 6], [215, 6],                   // platform top (skip col 214 — has ?-block)
    [220, 5], [221, 5], [223, 5], [224, 5],         // tower bridge (skip col 222 — has STAR block)
    [221, 10], [223, 10],                           // hidden coins inside the ice vault (col 222 has the mushroom ?-block)
    [233, 11], [234, 11],                           // approach to checkpoint (extra)
    // ----- DESERT -----
    // Pyramid coins: side coin at the base + a "peak" coin floating
    // one tile above the apex block. Pyramid 1 apex is now at col 249
    // row 7 (single-tile peak), pyramid 2 apex at col 300 row 6.
    [244, 11], [249, 6],                            // pyramid 1 (base + apex peak)
    [256, 11], [257, 11],                           // sand path (extra)
    [269, 9], [270, 8], [271, 9],                   // sand gap arc
    [287, 6], [288, 6], [290, 6], [291, 6],         // oasis platform top (skip col 289 — has ?-block)
    [294, 11], [300, 5],                            // pyramid 2 (base + apex peak)
    [306, 11], [307, 11], [308, 11],                // post-pyramid coin trail (shifted +1 col since pyramid base now reaches col 306)
    [318, 11], [319, 11],                           // sand path (extra)
    [327, 9], [328, 8], [329, 8], [330, 9],         // quicksand gap arc
    [334, 8], [335, 8], [337, 8],                   // platform top (skip col 336 if reused, kept clear)
    [352, 11], [353, 11],                           // approach to lava (extra)
    // ----- LAVA -----
    [364, 9], [368, 7],                             // obsidian rises
    [383, 7],                                       // mid-size lava pyramid apex peak (apex tile at row 8)
    [389, 9], [390, 9], [391, 9], [392, 9],         // lava chasm 1
    [400, 6], [401, 6], [403, 6],                   // floating island (skip col 402 — has ?-block)
    [411, 9], [412, 9], [413, 9],                   // lava chasm 2
    [415, 11], [416, 11],                           // path stretch
    [424, 8], [425, 7], [426, 8],                   // arc over small hill
    [432, 8], [433, 8],                             // pillar arc (skip col 432 has hard block)
    [439, 9], [440, 9], [441, 9], [442, 9],         // lava chasm 3
    [446, 7], [448, 7],                             // ember platform top (skip 447 — has ?-block)
    [453, 6], [454, 6], [456, 6],                   // bridge between pillars (skip 455 — 1up block)
    [461, 9], [462, 9], [463, 9],                   // lava chasm 4
    [465, 11], [472, 11], [473, 11],                // final stretch (skip ?-blocks at 468-471)
    // ----- COSMIC NEXUS -----
    // Intentionally NO coins anywhere in the universe section. The
    // entire stage is the boss climax + victory walk: the only pickup
    // is the pre-boss restock ?-block at col 488 (mushroom/flower).
    // Keeping it coin-free preserves the awe-inspiring, magnificent
    // galactic atmosphere.
  ];
  coinPositions.forEach(([tx, ty]) => {
    // Safety net: if a coin lands inside a solid tile (e.g. a multi-tile
    // pillar or staircase), keep walking up until we find clear air.
    // Caps at 4 rows to avoid spawning a coin floating absurdly high
    // if the source data is badly broken.
    let bumps = 0;
    while (bumps < 4 && levelMap[ty] && levelMap[ty][tx]) { ty--; bumps++; }
    mapCoins.push({ x: tx * TILE + 4, y: ty * TILE, collected: false });
  });
}

function spawnBoss() {
  boss = {
    x: (BOSS_GATE_X - 3) * TILE, y: -40,
    vx: -0.5, vy: 0,
    w: 28, h: 32,
    hp: 3, alive: true, dying: false, deathTimer: 0,
    jumpTimer: 0, fireTimer: 0, slamTimer: 0, dashTimer: 0,
    slamming: false,
    dashPhase: 0, dashDir: 1, meleeCooldown: 0, meleeAnim: 0,
    nextJumpAt: 110 + Math.random() * 70,
    nextFireAt: 160 + Math.random() * 80,
    nextSlamAt: 160 + Math.random() * 60,
    nextDashAt: 220 + Math.random() * 80,
    frame: 0, frameTimer: 0,
    invincible: 0,
    arenaLeft: (BOSS_ARENA_LEFT + 1) * TILE,
    arenaRight: (BOSS_GATE_X - 1) * TILE,
    onGround: false,
    hidden: true,
  };
}

function onBossDefeated() {
  bossOutroPhase = 1;
  bossOutroTimer = 0;
  bossOutroWallRow = 2;
}

function updateBossIntro() {
  bossIntroTimer++;

  // Freeze Mario completely during the entire cutscene
  mario.vx = 0;
  mario.vy = 0;
  mario.frame = 0;
  mario.frameTimer = 0;
  mario.doubleJumpAnim = 0;
  mario.skidding = false;

  if (bossIntroPhase === 1) {
    // Brief pause before walls start rising
    if (bossIntroTimer >= 15) {
      bossIntroPhase = 2;
      bossIntroTimer = 0;
      bossIntroWallRow = 12;
    }
  } else if (bossIntroPhase === 2) {
    if (bossIntroTimer % 3 === 0 && bossIntroWallRow >= 2) {
      levelMap[bossIntroWallRow][BOSS_ARENA_LEFT] = 5;
      bossIntroWallRow--;
      screenShake = 1.5;
      playSound('gate_slam');
    }
    if (bossIntroWallRow < 2) {
      bossIntroPhase = 3;
      bossIntroTimer = 0;
    }
  } else if (bossIntroPhase === 3) {
    if (bossIntroTimer === 10 && boss) {
      boss.hidden = false;
      boss.y = 2 * TILE;
      boss.vy = 0;
    }
    if (boss && !boss.hidden && boss.onGround && bossIntroTimer >= 30) {
      if (!boss._landed) {
        boss._landed = true;
        screenShake = 8;
        playSound('boss_roar');
      }
    }
    if (bossIntroTimer >= 80) {
      bossIntroPhase = 0;
      bossEncounterActive = true;
      if (boss) delete boss._landed;
    }
  }

  // Camera smoothly pans to arena
  const arenaCamX = BOSS_ARENA_LEFT * TILE;
  camera.x += (arenaCamX - camera.x) * 0.12;
  if (Math.abs(arenaCamX - camera.x) < 0.5) camera.x = arenaCamX;
  camera.targetX = camera.x;
  if (camera.x < 0) camera.x = 0;
  const maxCam = LEVEL_WIDTH * TILE - VIEW_W;
  if (camera.x > maxCam) camera.x = maxCam;
}

function updateBossOutro() {
  bossOutroTimer++;
  const mh = mario.big ? 24 : 16;

  if (bossOutroPhase === 1) {
    mario.vx = 0;
    if (bossOutroTimer === 1) {
      screenShake = 10;
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 / 12) * i;
        dustParticles.push({
          x: (BOSS_GATE_X - 3) * TILE + 14 + Math.cos(angle) * 6,
          y: 10 * TILE + 16 + Math.sin(angle) * 6,
          vx: Math.cos(angle) * 1.5,
          vy: Math.sin(angle) * 1.2 - 0.5,
          life: 25, maxLife: 25,
        });
      }
    }
    if (bossOutroTimer >= 80) {
      bossOutroPhase = 2;
      bossOutroTimer = 0;
    }
  } else if (bossOutroPhase === 2) {
    if (bossOutroTimer % 3 === 0 && bossOutroWallRow <= 12) {
      levelMap[bossOutroWallRow][BOSS_GATE_X] = 0;
      levelMap[bossOutroWallRow][BOSS_ARENA_LEFT] = 0;
      bossOutroWallRow++;
      screenShake = 1.5;
      playSound('brick');
      for (let w = 0; w < 2; w++) {
        const wallX = w === 0 ? BOSS_GATE_X : BOSS_ARENA_LEFT;
        for (let d = 0; d < 3; d++) {
          particles.push({
            type: 'debris',
            x: wallX * TILE + Math.random() * TILE,
            y: (bossOutroWallRow - 1) * TILE + Math.random() * TILE,
            vx: (wallX === BOSS_GATE_X ? 1 : -1) * (1 + Math.random() * 2),
            vy: -2 - Math.random() * 3,
            life: 30,
          });
        }
      }
    }
    if (bossOutroWallRow > 12) {
      bossOutroPhase = 0;
      bossEncounterActive = false;
    }
  }

  // Freeze Mario during outro
  mario.vx = 0;
  mario.frame = 0;
  mario.frameTimer = 0;
  mario.doubleJumpAnim = 0;
  mario.skidding = false;

  mario.vy += GRAVITY_DOWN;
  if (mario.vy > MAX_FALL) mario.vy = MAX_FALL;
  mario.y += mario.vy;
  mario.onGround = false;
  let vCol = tileCollision(mario.x + 2, mario.y, mario.w - 4, mh);
  if (vCol) {
    if (mario.vy > 0) {
      mario.y = vCol.ty * TILE - mh;
      mario.onGround = true;
    } else {
      mario.y = (vCol.ty + 1) * TILE;
    }
    mario.vy = 0;
  }

  const arenaCamX = BOSS_ARENA_LEFT * TILE;
  camera.x += (arenaCamX - camera.x) * 0.08;
  if (Math.abs(arenaCamX - camera.x) < 0.5) camera.x = arenaCamX;
  camera.targetX = camera.x;
  if (camera.x < 0) camera.x = 0;
  const maxCam = LEVEL_WIDTH * TILE - VIEW_W;
  if (camera.x > maxCam) camera.x = maxCam;
}

function createGoomba(x, y) {
  return {
    type: 'goomba', x, y, vx: -0.35, vy: 0,
    w: 16, h: 16, alive: true, flat: false, flatTimer: 0,
    frame: 0, frameTimer: 0,
    biome: biomeIdAtX(x),
  };
}

function createKoopa(x, y) {
  return {
    type: 'koopa', x, y: y - 8, vx: -0.4, vy: 0,
    w: 16, h: 24, alive: true, shell: false, shellMoving: false,
    frame: 0, frameTimer: 0,
    biome: biomeIdAtX(x),
  };
}

function createBuzzyBeetle(x, y) {
  return {
    type: 'buzzy', x, y, vx: -0.6, vy: 0,
    w: 16, h: 16, alive: true, flat: false, flatTimer: 0,
    frame: 0, frameTimer: 0,
    biome: biomeIdAtX(x),
  };
}

function createPiranha(pipeX, pipeTopY) {
  return {
    type: 'piranha', x: pipeX * TILE + 6, y: pipeTopY * TILE,
    vx: 0, vy: 0, w: 18, h: 20,
    alive: true, frame: 0, frameTimer: 0,
    baseY: pipeTopY * TILE, emergeOffset: 0, emergeDir: -1,
    pipeX: pipeX, waitTimer: 0,
    biome: biomeIdAtX(pipeX * TILE),
  };
}

function createSwooper(x, y) {
  return {
    type: 'swooper', x, y, vx: -0.7, vy: 0,
    w: 14, h: 14, alive: true,
    frame: 0, frameTimer: 0,
    baseY: y, swoopTick: Math.random() * 100,
    biome: biomeIdAtX(x),
  };
}

function createPhantom(x, y) {
  return {
    type: 'phantom', x, y, vx: 0.4, vy: 0,
    w: 14, h: 14, alive: true, flat: false, flatTimer: 0,
    frame: 0, frameTimer: 0,
    baseY: y, floatTick: Math.random() * 100,
    biome: biomeIdAtX(x),
  };
}

function addScorePopup(x, y, pts) {
  scorePopups.push({ x, y, text: String(pts), life: 50, vy: -0.8 });
}

const ENEMY_POINTS = { goomba: 100, koopa: 200, buzzy: 300, piranha: 400, swooper: 250, phantom: 300, boss: 5000 };

// ================================================================
// COLLISION
// ================================================================
function getTile(tx, ty) {
  if (tx < 0 || tx >= LEVEL_WIDTH || ty < 0 || ty >= LEVEL_HEIGHT) return 0;
  if (eliminated && breakBlocks.has(tx + ',' + ty)) return 0;
  return levelMap[ty][tx];
}

function isSolid(tile) {
  return tile >= 1 && tile <= 13;
}

function tileCollision(x, y, w, h) {
  const left = Math.floor(x / TILE);
  const right = Math.floor((x + w - 1) / TILE);
  const top = Math.floor(y / TILE);
  const bottom = Math.floor((y + h - 1) / TILE);

  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (isSolid(getTile(tx, ty))) {
        return { tx, ty, tile: getTile(tx, ty) };
      }
    }
  }
  return null;
}

function hitBlock(tx, ty) {
  const key = `${tx},${ty}`;
  const tile = getTile(tx, ty);

  if (tile === 3 || tile === 4 || tile === 6 || tile === 7) {
    if (emptyBlocks.has(key)) {
      playSound('bump');
      return;
    }
    emptyBlocks.add(key);
    emitBlockEvent('empty', key);
    if (tile === 3) {
      score += 200;
      coins++;
      coinAnims.push({ x: tx * TILE + 4, y: ty * TILE - 16, vy: -3.5, life: 35 });
      addScorePopup(tx * TILE, ty * TILE - 16, 200);
      playSound('coin');
    } else if (tile === 6) {
      lives++;
      addScorePopup(tx * TILE, ty * TILE - 16, '1UP');
      playSound('1up');
    } else if (tile === 7) {
      items.push({
        type: 'star',
        x: tx * TILE, y: ty * TILE - TILE,
        vx: 1.2, vy: -2,
        w: 16, h: 16,
        emerging: true, emergeY: ty * TILE,
        active: true,
      });
    } else {
      items.push({
        type: mario.big ? 'flower' : 'mushroom',
        x: tx * TILE, y: ty * TILE - TILE,
        vx: mario.big ? 0 : 1.0, vy: 0,
        w: 16, h: 16,
        emerging: true, emergeY: ty * TILE,
        active: true,
      });
    }
    hitBlocks.add(key);
    emitBlockEvent('hit', key);
    particles.push({ x: tx * TILE, y: ty * TILE, type: 'bump', timer: 8, origY: ty * TILE });
    playSound('bump');
  } else if (tile === 2) {
    if (mario.big) {
      levelMap[ty][tx] = 0;
      emitBlockEvent('break', key);
      screenShake = 2;
      playSound('brick');
      for (let i = 0; i < 4; i++) {
        particles.push({
          type: 'debris',
          x: tx * TILE + (i % 2) * 8,
          y: ty * TILE + Math.floor(i / 2) * 8,
          vx: (i % 2 === 0 ? -1.5 : 1.5) + (Math.random() - 0.5),
          vy: -3.5 - Math.random() * 1.5,
          life: 45,
        });
      }
      score += 50;
    } else {
      hitBlocks.add(key);
      emitBlockEvent('hit', key);
      particles.push({ x: tx * TILE, y: ty * TILE, type: 'bump', timer: 8, origY: ty * TILE });
      playSound('bump');
    }
  } else if (tile === 5) {
    playSound('bump');
  }

  var bx1 = tx * TILE, bx2 = bx1 + TILE, bTop = ty * TILE;
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (!it.active || it.emerging) continue;
    if (it.x + it.w > bx1 && it.x < bx2 &&
        it.y + it.h >= bTop && it.y + it.h <= bTop + 2) {
      it.vy = -4;
      it.vx = -it.vx;
    }
  }
}

// ================================================================
// UPDATE: MARIO
// ================================================================
function updateMario() {
  if (eliminated) return;

  if (mario.dead) {
    deathTimer++;
    if (deathTimer < 18) mario.vy = -4.5;
    mario.vy += GRAVITY_DOWN * 0.6;
    mario.y += mario.vy;
    if (deathTimer > 100) {
      lives--;
      gameOverTimer = 0;
      if (lives <= 0) {
        if (multiplayerMode) {
          eliminated = true;
          writePlayerDied();
          checkpointIndex = -1;
        } else {
          checkpointIndex = -1;
          gameState = 'gameover';
        }
      } else if (multiplayerMode) {
        // MP: skip life-lost card — respawn immediately
        gameState = 'playing';
        resetLevel();
      } else {
        gameState = 'lifeLost';
      }
    }
    return;
  }

  if (flagDescending) {
    winTimer++;
    // Phase A — slide down the flagpole until feet touch the ground row.
    if (mario.y < 12 * TILE) {
      mario.vy = 1.8;
      mario.y += mario.vy;
      if (mario.y >= 12 * TILE) mario.y = 12 * TILE;
    } else {
      // Phase B — walk right toward the castle door.
      // Door center sits at (CASTLE_X * TILE) + 40 (door inner half-width
      // 8 + door inset 32). Subtract 8 so mario.x lands the blob's
      // 16-px body squarely centred under the arch.
      mario.facing = 1;
      const doorEntryX = (CASTLE_X * TILE) + 32;
      if (mario.x < doorEntryX && castleEnterTimer === 0) {
        mario.vx = 1.5;
        mario.x += mario.vx;
        if (mario.x >= doorEntryX) mario.x = doorEntryX;
      } else {
        // Phase C — entering the castle. Hold position under the arch
        // and let drawMario fade the blob out (see castleEnterTimer
        // alpha block in drawMario). Once fully faded, flip to 'win'.
        mario.x = doorEntryX;
        mario.vx = 0;
        castleEnterTimer++;
      }
    }
    if (castleEnterTimer >= CASTLE_ENTER_DURATION) {
      if (!multiplayerMode && timeBonus === 0 && time > 0) {
        timeBonus = time * 50;
        score += timeBonus;
      }
      if (multiplayerMode) {
        writePlayerFinished();
        myPlayerFinished = true;
        eliminated = true;
        flagDescending = false;
      } else {
        gameState = 'win';
      }
    }
    if (multiplayerMode) {
      writeProgress();
    }
    return;
  }

  if (bossIntroPhase > 0) {
    updateBossIntro();
    return;
  }

  if (bossOutroPhase > 0) {
    updateBossOutro();
    return;
  }

  // Crouch (Big Mario only)
  const wantCrouch = keys['ArrowDown'] && mario.big && mario.onGround;
  mario.crouching = wantCrouch;

  // Horizontal input
  const running = keys['KeyX'] || keys['ShiftLeft'] || keys['ShiftRight'];
  const maxSpeed = running ? MAX_RUN : MAX_WALK;
  const accel = running ? RUN_ACCEL : WALK_ACCEL;

  if (mario.crouching) {
    // Slide with low friction — preserves momentum from running
    const slideFric = 0.06;
    if (mario.vx > 0) mario.vx = Math.max(0, mario.vx - slideFric);
    else if (mario.vx < 0) mario.vx = Math.min(0, mario.vx + slideFric);
    if (Math.abs(mario.vx) < 0.08) mario.vx = 0;
    mario.skidding = false;
  } else {
    const wantRight = keys['ArrowRight'];
    const wantLeft = keys['ArrowLeft'];

    mario.skidding = false;
    if (wantRight) {
      if (mario.vx < 0 && mario.onGround) {
        mario.vx += SKID_DECEL;
        mario.skidding = true;
      } else {
        mario.vx = Math.min(mario.vx + accel, maxSpeed);
      }
      mario.facing = 1;
    } else if (wantLeft) {
      if (mario.vx > 0 && mario.onGround) {
        mario.vx -= SKID_DECEL;
        mario.skidding = true;
      } else {
        mario.vx = Math.max(mario.vx - accel, -maxSpeed);
      }
      mario.facing = -1;
    } else {
      const fric = mario.onGround ? FRICTION : AIR_FRICTION;
      if (mario.vx > 0) mario.vx = Math.max(0, mario.vx - fric);
      else mario.vx = Math.min(0, mario.vx + fric);
      if (Math.abs(mario.vx) < 0.05) mario.vx = 0;
    }

    // Clamp to max speed (handles switching from run to walk)
    if (Math.abs(mario.vx) > maxSpeed && mario.onGround) {
      mario.vx = mario.vx > 0 ? Math.max(maxSpeed, mario.vx - FRICTION) : Math.min(-maxSpeed, mario.vx + FRICTION);
    }
  }

  // Coyote time tracking
  if (mario.onGround) {
    mario.coyoteTimer = COYOTE_FRAMES;
    mario.jumpsUsed = 0;
  } else if (mario.coyoteTimer > 0) {
    mario.coyoteTimer--;
  }

  // Ledge grace: brief hover when walking off an edge.
  // Counts down each airborne frame; vy is held at 0 during the window
  // so the player doesn't instantly drop. Cleared on jump or if ground
  // is present directly below (lets the ground-snap handle that case).
  if (mario.onGround) {
    mario.ledgeGraceTimer = LEDGE_GRACE_FRAMES;
  } else if (mario.ledgeGraceTimer > 0) {
    var feetTY = Math.floor((mario.y + mario.h) / TILE);
    var leftTX = Math.floor((mario.x + 2) / TILE);
    var rightTX = Math.floor((mario.x + mario.w - 3) / TILE);
    var groundBelow = false;
    for (var gt = leftTX; gt <= rightTX; gt++) {
      if (isSolid(getTile(gt, feetTY))) { groundBelow = true; break; }
    }
    if (groundBelow) {
      mario.ledgeGraceTimer = 0;
    } else {
      mario.ledgeGraceTimer--;
    }
  }

  if (mario.doubleJumpAnim > 0) mario.doubleJumpAnim--;
  if (mario.landSquash > 0) mario.landSquash--;

  // Jump buffer countdown
  if (jumpBufferTimer > 0) jumpBufferTimer--;

  // Jump
  const canFirstJump = mario.onGround || mario.coyoteTimer > 0;
  const canDoubleJump = !mario.onGround && mario.jumpsUsed <= 1 && mario.coyoteTimer <= 0;
  const wantJump = jumpPressed || jumpBufferTimer > 0;

  if (wantJump && canFirstJump && mario.vy >= 0) {
    mario.vy = JUMP_VEL;
    mario.onGround = false;
    mario.coyoteTimer = 0;
    mario.ledgeGraceTimer = 0;
    mario.jumpsUsed = 1;
    jumpBufferTimer = 0;
    playSound('jump');
    dustParticles.push(
      { x: mario.x + 3, y: mario.y + mario.h, vx: -0.3, vy: -0.2, life: 10, maxLife: 10 },
      { x: mario.x + mario.w - 3, y: mario.y + mario.h, vx: 0.3, vy: -0.2, life: 10, maxLife: 10 },
    );
  } else if (jumpPressed && canDoubleJump) {
    mario.vy = JUMP_VEL * 0.82;
    mario.jumpsUsed = 2;
    mario.ledgeGraceTimer = 0;
    mario.doubleJumpAnim = 20;
    jumpBufferTimer = 0;
    playSound('jump');
    for (var di = 0; di < 6; di++) {
      var angle = (Math.PI * 2 / 6) * di;
      dustParticles.push({
        x: mario.x + mario.w / 2 + Math.cos(angle) * 4,
        y: mario.y + mario.h * 0.6,
        vx: Math.cos(angle) * 0.6,
        vy: Math.sin(angle) * 0.4 + 0.3,
        life: 12, maxLife: 12,
      });
    }
  }

  jumpPressed = false;

  // Ledge grace: hold vy at 0 while the grace window is open so the
  // player briefly hovers at the edge instead of instantly dropping.
  if (mario.ledgeGraceTimer > 0 && !mario.onGround) {
    mario.vy = 0;
  }

  // Gravity (dual system)
  if (mario.vy < 0) {
    mario.vy += jumpHeld ? GRAVITY_UP_HOLD : GRAVITY_UP_RELEASE;
  } else {
    mario.vy += GRAVITY_DOWN;
  }
  if (mario.vy > MAX_FALL) mario.vy = MAX_FALL;

  // Horizontal movement + collision
  mario.x += mario.vx;
  if (mario.x < 0) mario.x = 0;
  if (mario.x < camera.x) mario.x = camera.x;
  const mh = mario.big ? 24 : 16;

  // Trigger boss intro cutscene when Mario walks past the trigger point
  if (!bossEncounterActive && bossIntroPhase === 0 && boss && boss.alive && mario.x >= BOSS_ARENA_TRIGGER * TILE) {
    bossIntroPhase = 1;
    bossIntroTimer = 0;
  }

  // Clamp Mario inside the boss arena (between walls, not on them)
  if (bossEncounterActive) {
    const arenaLeftPx = (BOSS_ARENA_LEFT + 1) * TILE;
    const arenaRightPx = BOSS_GATE_X * TILE - mario.w;
    if (mario.x < arenaLeftPx) { mario.x = arenaLeftPx; mario.vx = 0; }
    if (mario.x > arenaRightPx) { mario.x = arenaRightPx; mario.vx = 0; }
  }

  let hCol = tileCollision(mario.x + 1, mario.y, mario.w - 2, mh);
  if (hCol) {
    if (mario.vx > 0) mario.x = hCol.tx * TILE - mario.w;
    else if (mario.vx < 0) mario.x = (hCol.tx + 1) * TILE;
    mario.vx = 0;
  }

  // Vertical movement + collision
  mario.wasOnGround = mario.onGround;
  mario.y += mario.vy;
  mario.onGround = false;

  let vCol = tileCollision(mario.x + 2, mario.y, mario.w - 4, mh);
  if (vCol) {
    if (mario.vy > 0) {
      mario.y = vCol.ty * TILE - mh;
      mario.vy = 0;
      mario.onGround = true;
      if (!mario.wasOnGround) {
        // Short squash so it doesn't override the run animation when the
        // player is already holding a direction at the moment of landing.
        mario.landSquash = 4;
        dustParticles.push(
          { x: mario.x + mario.w / 2 - 2, y: mario.y + mh, vx: -0.3, vy: -0.25, life: 8, maxLife: 8 },
          { x: mario.x + mario.w / 2 + 2, y: mario.y + mh, vx: 0.3, vy: -0.25, life: 8, maxLife: 8 },
        );
      }
    } else if (mario.vy < 0) {
      mario.y = (vCol.ty + 1) * TILE;
      mario.vy = 0;
      hitBlock(vCol.tx, vCol.ty);
    }
  }

  // Ground snap: prevent onGround flicker from sub-tile gravity
  if (!mario.onGround && mario.vy >= 0 && mario.vy < 2) {
    const feetTileY = Math.floor((mario.y + mh) / TILE);
    const leftTX = Math.floor((mario.x + 2) / TILE);
    const rightTX = Math.floor((mario.x + mario.w - 3) / TILE);
    for (let tx = leftTX; tx <= rightTX; tx++) {
      if (isSolid(getTile(tx, feetTileY))) {
        mario.y = feetTileY * TILE - mh;
        mario.vy = 0;
        mario.onGround = true;
        break;
      }
    }
  }

  // Pit death — trigger as soon as Mario fully clears the bottom of the
  // visible screen. Mark it as a pit fall so mariodie() bypasses the
  // size-shrink-and-recover branch (otherwise big/fire Mario would just
  // shrink mid-air, stay invincible for ~2s, and only THEN actually die,
  // which the player perceives as a "fall that lasts forever").
  if (mario.y > VIEW_H) {
    mario.pitDeath = true;
    mariodie();
  }

  // Animation (only animate when actually moving)
  if (!mario.onGround) {
    mario.frame = 0;
  } else if (mario.skidding) {
    mario.frame = 0;
    if (globalTick % 3 === 0) {
      var skidMh = mario.big ? 24 : 16;
      dustParticles.push({
        x: mario.x + mario.w / 2 + mario.facing * -3,
        y: mario.y + skidMh,
        vx: mario.vx * 0.15,
        vy: -0.3 - Math.random() * 0.4,
        life: 8 + Math.random() * 4, maxLife: 12,
      });
    }
  } else if (mario.vx !== 0 && Math.abs(mario.vx) > 0.1) {
    mario.frameTimer++;
    const animSpeed = Math.max(4, 14 - Math.abs(mario.vx) * 3);
    if (mario.frameTimer > animSpeed) {
      mario.frameTimer = 0;
      mario.frame = (mario.frame + 1) % 3;
    }
  } else {
    mario.frame = 0;
    mario.frameTimer = 0;
  }

  if (mario.onGround && Math.abs(mario.vx) > 2.0 && globalTick % 4 === 0 && !mario.dead) {
    var sprintMh = mario.big ? 24 : 16;
    dustParticles.push({
      x: mario.x + mario.w / 2 - mario.facing * 3,
      y: mario.y + sprintMh,
      vx: -mario.vx * 0.08 + (Math.random() - 0.5) * 0.2,
      vy: -0.2 - Math.random() * 0.3,
      life: 6 + Math.random() * 4, maxLife: 10,
    });
  }

  // Camera (smooth lerp, float precision kept for tracking).
  //
  // We track an integer-rounded mario.x rather than the raw float. Sub-
  // pixel precision buys nothing — `camera.rx` is `Math.floor(camera.x)`
  // at render time anyway — and the raw float carries multiplicative-
  // friction residuals (mario.vx asymptotes to 0 but never reaches it),
  // so an "idle" mario actually creeps mario.x by ~0.001 px/frame.
  // Without rounding, those residuals walk camera.targetX across an
  // integer boundary every few seconds, the whole screen shifts by 1
  // px, and remote ghost blobs (whose world coords are now perfectly
  // stable thanks to the sender-side idle latch) appear to "tick" or
  // briefly clip the screen-edge cull check and vanish for a frame.
  if (bossEncounterActive) {
    const arenaCamX = BOSS_ARENA_LEFT * TILE;
    camera.x += (arenaCamX - camera.x) * 0.15;
    if (Math.abs(arenaCamX - camera.x) < 0.5) camera.x = arenaCamX;
    camera.targetX = camera.x;
  } else {
    camera.targetX = Math.round(mario.x) - VIEW_W / 2 + 16;
    if (camera.targetX < camera.x) camera.targetX = camera.x;
    camera.x += (camera.targetX - camera.x) * 0.1;
    if (Math.abs(camera.targetX - camera.x) < 0.5) camera.x = camera.targetX;
  }
  if (camera.x < 0) camera.x = 0;
  const maxCam = LEVEL_WIDTH * TILE - VIEW_W;
  if (camera.x > maxCam) camera.x = maxCam;

  // Invincibility
  if (mario.invincible > 0) mario.invincible--;
  if (mario.starPower > 0) {
    mario.starPower--;
    if (mario.starPower <= 0) stopStarMusic();
    if (globalTick % 2 === 0) {
      dustParticles.push({
        x: mario.x + mario.w / 2 + (Math.random() - 0.5) * 8,
        y: mario.y + (mario.big ? 12 : 8) + (Math.random() - 0.5) * 6,
        vx: -mario.vx * 0.2 + (Math.random() - 0.5) * 0.3,
        vy: -0.3 - Math.random() * 0.3,
        life: 10 + Math.random() * 6, maxLife: 16, sparkle: true,
      });
    }
  }

  // Timer
  if (!multiplayerMode) {
    timeTimer++;
    if (timeTimer >= 36) {
      timeTimer = 0;
      time--;
      if (time <= 10 && time > 0) playSound('warning');
      if (time <= 0) mariodie();
    }
  }

  // Checkpoints
  for (let ci = 0; ci < CHECKPOINT_XS.length; ci++) {
    if (ci > checkpointIndex && mario.x >= CHECKPOINT_XS[ci] * TILE) {
      checkpointIndex = ci;
      playSound('powerup');
      // Show the biome the player is entering (checkpoint marks the start of a new biome).
      const enteringBiome = biomeAtTile(CHECKPOINT_XS[ci] + 1);
      hudMessage = { text: 'ENTERING ' + enteringBiome.name + '!', life: 150, maxLife: 150 };
    }
  }

  // Map coin collection
  const mh2 = mario.big ? 24 : 16;
  mapCoins.forEach(c => {
    if (c.collected) return;
    if (mario.x + mario.w > c.x && mario.x < c.x + 8 &&
        mario.y + mh2 > c.y && mario.y < c.y + 8) {
      c.collected = true;
      coins++;
      score += 200;
      coinAnims.push({ x: c.x, y: c.y - 8, vy: -3, life: 25 });
      addScorePopup(c.x, c.y - 12, 200);
      for (var sp = 0; sp < 5; sp++) {
        var sa = Math.random() * Math.PI * 2;
        var sv = 0.5 + Math.random() * 1.2;
        dustParticles.push({
          x: c.x + 4, y: c.y + 4,
          vx: Math.cos(sa) * sv, vy: Math.sin(sa) * sv - 0.5,
          life: 12 + Math.random() * 6, maxLife: 18, sparkle: true,
        });
      }
      playSound('coin');
    }
  });

  // Flagpole collision
  if (!flagDescending && mario.x >= (FLAGPOLE_X - 1) * TILE) {
    flagDescending = true;
    winTimer = 0;
    mario.vx = 0;
    mario.vy = 0;
    flagY = mario.y;
    flagBonus = Math.round(Math.max(0, (12 * TILE - mario.y)) * 5);
    score += flagBonus;
    playSound('flagpole');
  }

  // Multiplayer progress
  if (multiplayerMode && gameState === 'playing') {
    writeProgress();
  }
}

function mariodie() {
  // A pit fall is ALWAYS instant death regardless of power-up state — the
  // player is already past the bottom of the screen and there's nothing
  // visible to "shrink and recover" to.
  if (mario.pitDeath) {
    mario.fire = false;
    mario.crouching = false;
    mario.big = false;
    mario.h = 16;
    mario.invincible = 0;
    mario.dead = true;
    mario.starPower = 0;
    stopStarMusic();
    mario.vy = 0; // skip the bounce-up — would feel like an extra fake fall
    deathTimer = 80; // jump straight to the end of the death anim
    screenShake = 3;
    playSound('die');
    return;
  }
  if (mario.invincible > 0) return;
  if (mario.fire) {
    mario.fire = false;
    mario.invincible = 120;
    screenShake = 2.5;
    playSound('shrink');
    return;
  }
  if (mario.big) {
    mario.crouching = false;
    mario.big = false;
    mario.invincible = 120;
    mario.h = 16;
    screenShake = 2.5;
    playSound('shrink');
    return;
  }
  mario.dead = true;
  mario.starPower = 0;
  stopStarMusic();
  mario.vy = -5;
  deathTimer = 0;
  screenShake = 4;
  playSound('die');
}

// ================================================================
// UPDATE: ENTITIES
// ================================================================
function updateEntities() {
  entities.forEach(e => {
    if (!e.alive && e.deathTimer) {
      e.deathTimer--;
      if (e.deathTimer <= 0) e.remove = true;
      return;
    }
    if (!e.alive && (e.type === 'goomba' || e.type === 'buzzy' || e.type === 'swooper' || e.type === 'phantom') && e.flat) {
      e.flatTimer--;
      if (e.flatTimer <= 0) e.remove = true;
      return;
    }
    if (!e.alive) return;

    // Piranha plants have special AI
    if (e.type === 'piranha') {
      if (e.x > camera.x + VIEW_W + 48 || e.x < camera.x - 80) return;
      e.frameTimer++;
      if (e.frameTimer > 12) { e.frameTimer = 0; e.frame = (e.frame + 1) % 2; }

      if (e.waitTimer > 0) {
        e.waitTimer--;
        if (e.waitTimer <= 0) {
          e.emergeDir = e.emergeOffset < -10 ? 1 : -1;
        }
      } else {
        e.emergeOffset += e.emergeDir * 0.8;
        if (e.emergeOffset < -20) { e.emergeOffset = -20; e.emergeDir = 0; e.waitTimer = 50; }
        if (e.emergeOffset >= 0) { e.emergeOffset = 0; e.emergeDir = 0; e.waitTimer = 60; }
      }
      e.y = e.baseY + e.emergeOffset;

      if (mario.dead || flagDescending) return;
      if (e.emergeOffset >= 0) return;
      const mx = mario.x + 2, mw = mario.w - 4;
      const mh = mario.big ? (mario.crouching ? 16 : 24) : 16;
      const my = mario.big && mario.crouching ? mario.y + 8 : mario.y;
      const visH = Math.abs(e.emergeOffset);
      if (mario.starPower > 0 && mx < e.x + e.w && mx + mw > e.x && my < e.y + visH && my + mh > e.y) {
        const pts = ENEMY_POINTS.piranha;
        e.alive = false; e.remove = true;
        score += pts; enemiesKilled++;
        addScorePopup(e.x, e.y - 8, pts);
        playSound('stomp');
        sendEntityKill({ entity: 'piranha', x: Math.round(e.x), y: Math.round(e.y), killType: 'star', remove: true });
        return;
      }
      if (mario.invincible > 0) return;
      if (mx < e.x + e.w && mx + mw > e.x && my < e.y + visH && my + mh > e.y) {
        mariodie();
      }
      return;
    }

    if (e.x > camera.x + VIEW_W + 48 || e.x < camera.x - 80) return;

    // Hard barrier: no flying enemies are allowed inside the cosmic
    // boss section (tiles 480+). The arena is reserved for the boss
    // alone — any lava-section drifter that wanders past the boundary
    // gets immediately removed.
    if ((e.type === 'phantom' || e.type === 'swooper') && e.x >= BIOME_BOUNDS[3] * TILE - 8) {
      e.alive = false;
      e.remove = true;
      return;
    }

    // Swooper: sine-wave flying enemy, no gravity
    if (e.type === 'phantom') {
      e.floatTick += 0.04;
      e.x += e.vx;
      e.y = e.baseY + Math.sin(e.floatTick) * 12;
      e.frameTimer++;
      if (e.frameTimer > 60 + Math.random() * 80) {
        e.frameTimer = 0;
        e.vx = -e.vx;
      }
      if (e.x < camera.x - 80) e.x = camera.x + VIEW_W + 32;
      if (e.x > camera.x + VIEW_W + 80) e.x = camera.x - 32;
    } else if (e.type === 'swooper') {
      e.swoopTick += 0.08;
      e.x += e.vx;
      e.y = e.baseY + Math.sin(e.swoopTick) * 24;
      e.frameTimer++;
      if (e.frameTimer > 10) { e.frameTimer = 0; e.frame = (e.frame + 1) % 2; }
      if (e.x < camera.x - 80) { e.x = camera.x + VIEW_W + 48; e.baseY = (6 + Math.random() * 4) * TILE; }
    } else {

    e.vy += GRAVITY_DOWN;
    if (e.vy > MAX_FALL) e.vy = MAX_FALL;

    e.x += e.vx;
    let hc = tileCollision(e.x + 2, e.y, e.w - 4, e.h);
    if (hc) {
      e.vx = -e.vx;
      e.x = e.vx > 0 ? (hc.tx + 1) * TILE : hc.tx * TILE - e.w;
    }

    e.y += e.vy;
    let vc = tileCollision(e.x + 2, e.y, e.w - 4, e.h);
    if (vc) {
      if (e.vy > 0) { e.y = vc.ty * TILE - e.h; e.vy = 0; }
      else { e.y = (vc.ty + 1) * TILE; e.vy = 0; }
    }

    if (e.y > LEVEL_HEIGHT * TILE + 32) e.remove = true;

    if (e.kickGrace > 0) e.kickGrace--;

    e.frameTimer++;
    if (e.frameTimer > 14) { e.frameTimer = 0; e.frame = (e.frame + 1) % 2; }
    } // end of non-swooper else

    if (mario.dead || flagDescending) return;

    const mx = mario.x + 2, mw = mario.w - 4;
    const mh = mario.big ? (mario.crouching ? 16 : 24) : 16;
    const my = mario.big && mario.crouching ? mario.y + 8 : mario.y;

    if (mario.starPower > 0 && mx < e.x + e.w && mx + mw > e.x && my < e.y + e.h && my + mh > e.y) {
      const pts = ENEMY_POINTS[e.type] || 100;
      e.alive = false;
      e.remove = true;
      score += pts;
      enemiesKilled++;
      addScorePopup(e.x, e.y - 8, pts);
      playSound('stomp');
      sendEntityKill({ entity: e.type, x: Math.round(e.x), y: Math.round(e.y), killType: 'star', remove: true });
      return;
    }

    if (mx < e.x + e.w && mx + mw > e.x && my < e.y + e.h && my + mh > e.y) {
      if (e.type === 'koopa' && e.shell && !e.shellMoving) {
        e.shellMoving = true;
        e.kickGrace = 12;
        e.vx = mario.x < e.x ? 3.5 : -3.5;
        score += 100;
        mario.vy = -3.5;
        mario.jumpsUsed = 1;
        addScorePopup(e.x, e.y - 8, 100);
        playSound('stomp');
        return;
      }
      if (e.type === 'koopa' && e.shell && e.shellMoving && e.kickGrace > 0) {
        return;
      }
      if (mario.vy > 0 && my + mh - e.y < 10) {
        const pts = ENEMY_POINTS[e.type] || 100;
        playSound('stomp');
        if (e.type === 'goomba' || e.type === 'buzzy' || e.type === 'swooper' || e.type === 'phantom') {
          e.alive = false;
          e.vx = 0;
          score += pts;
          for (var si = 0; si < 4; si++) {
            var eLife = 10 + Math.floor(Math.random() * 6);
            dustParticles.push({
              x: e.x + e.w / 2 + (Math.random() - 0.5) * 8,
              y: e.y + e.h * 0.5,
              vx: (Math.random() - 0.5) * 1.2,
              vy: -Math.random() * 1.5 - 0.5,
              life: eLife, maxLife: eLife,
            });
          }
          enemiesKilled++;
          addScorePopup(e.x, e.y - 8, pts);
          var swooperOrPhantom = e.type === 'swooper' || e.type === 'phantom';
          if (swooperOrPhantom) {
            e.remove = true;
          } else {
            e.flat = true;
            e.flatTimer = 30;
          }
          sendEntityKill({ entity: e.type, x: Math.round(e.x), y: Math.round(e.y), killType: 'stomp', remove: swooperOrPhantom, flat: !swooperOrPhantom });
        } else if (e.type === 'koopa') {
          if (!e.shell) {
            e.shell = true;
            e.shellMoving = false;
            e.vx = 0;
            e.h = 16;
            e.y += 8;
            score += pts;
            enemiesKilled++;
            addScorePopup(e.x, e.y - 8, pts);
            sendEntityKill({ entity: 'koopa', x: Math.round(e.x), y: Math.round(e.y), killType: 'stomp', shell: true });
          } else if (e.shellMoving) {
            e.shellMoving = false;
            e.vx = 0;
          } else {
            e.shellMoving = true;
            e.vx = mario.x < e.x ? 3.5 : -3.5;
          }
        }
        mario.vy = -4.5;
        mario.jumpsUsed = 1;
      } else if (mario.invincible <= 0) {
        mariodie();
      }
    }
  });

  entities.forEach(shell => {
    if (shell.type !== 'koopa' || !shell.shell || !shell.shellMoving || !shell.alive) return;
    entities.forEach(other => {
      if (other === shell || !other.alive) return;
      if (other.type === 'piranha') return;
      if (shell.x < other.x + other.w && shell.x + shell.w > other.x &&
          shell.y < other.y + other.h && shell.y + shell.h > other.y) {
        if (other.type === 'buzzy') {
          other.vx = shell.vx > 0 ? 1.5 : -1.5;
          other.vy = -3;
          shell.vx = -shell.vx;
          return;
        }
        const pts = ENEMY_POINTS[other.type] || 100;
        other.alive = false;
        other.remove = true;
        score += pts;
        enemiesKilled++;
        addScorePopup(other.x, other.y - 8, pts);
        sendEntityKill({ entity: other.type, x: Math.round(other.x), y: Math.round(other.y), killType: 'shell', remove: true });
      }
    });
  });

  // Shell vs boss
  if (boss && boss.alive && boss.invincible <= 0) {
    entities.forEach(shell => {
      if (shell.type !== 'koopa' || !shell.shell || !shell.shellMoving || !shell.alive) return;
      if (shell.x < boss.x + boss.w && shell.x + shell.w > boss.x &&
          shell.y < boss.y + boss.h && shell.y + shell.h > boss.y) {
        boss.hp--;
        boss.invincible = 60;
        boss.slamming = false;
        boss.meleeAnim = 0;
        if (boss.dashPhase > 0) { boss.dashPhase = 0; boss.dashTimer = 0; }
        shell.alive = false;
        shell.remove = true;
        screenShake = 4;
        if (boss.hp <= 0) {
          boss.alive = false;
          boss.dying = true;
          boss.vy = -5;
          boss.deathTimer = 0;
          score += ENEMY_POINTS.boss;
          addScorePopup(boss.x, boss.y - 16, ENEMY_POINTS.boss);
          enemiesKilled++;
          screenShake = 8;
          playSound('bossdie');
          onBossDefeated();
          sendEntityKill({ entity: 'boss', x: Math.round(boss.x), y: Math.round(boss.y), killType: 'boss_shell', bossHp: 0 });
        } else {
          playSound('bosshit');
          addScorePopup(boss.x, boss.y - 8, 500);
          score += 500;
          boss.vx = (shell.x < boss.x ? 1 : -1) * 1.5;
          sendEntityKill({ entity: 'boss', x: Math.round(boss.x), y: Math.round(boss.y), killType: 'boss_shell', bossHp: boss.hp });
        }
      }
    });
  }

  entities = entities.filter(e => !e.remove);
}

// ================================================================
// UPDATE: BOSS
// ================================================================
function updateBoss() {
  // Update fireballs regardless of boss state
  bossFireballs = bossFireballs.filter(f => {
    f.x += f.vx;
    f.vy += 0.08;
    f.y += f.vy;
    const fc = tileCollision(f.x, f.y, 8, 8);
    if (fc && f.vy > 0) { f.y = fc.ty * TILE - 8; f.vy = -3; }
    f.life--;
    if (f.life <= 0 || f.x < camera.x - 32 || f.x > camera.x + VIEW_W + 32) return false;
    if (!mario.dead && mario.invincible <= 0) {
      const mh = mario.big ? 24 : 16;
      if (mario.x + mario.w > f.x && mario.x < f.x + 8 &&
          mario.y + mh > f.y && mario.y < f.y + 8) {
        mariodie();
      }
    }
    return true;
  });

  // Update shockwaves
  bossShockwaves = bossShockwaves.filter(w => {
    w.x += w.vx;
    w.life--;
    if (w.life <= 0) return false;
    if (!mario.dead && mario.invincible <= 0) {
      const mh = mario.big ? (mario.crouching ? 16 : 24) : 16;
      const my = mario.big && mario.crouching ? mario.y + 8 : mario.y;
      const waveH = 14 * (w.life / w.maxLife);
      const waveTop = w.y - waveH;
      if (mario.x + mario.w > w.x - 6 && mario.x < w.x + 6 &&
          my + mh > waveTop && my + mh <= w.y + 4) {
        mariodie();
      }
    }
    return true;
  });

  if (!boss) return;

  if (boss.dying) {
    boss.deathTimer++;
    boss.vy += GRAVITY_DOWN;
    boss.y += boss.vy;
    if (boss.deathTimer > 120) boss = null;
    return;
  }

  if (!boss.alive) return;
  if (boss.hidden) return;

  if (bossIntroPhase > 0) {
    boss.vy += GRAVITY_DOWN;
    if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
    boss.y += boss.vy;
    let bc = tileCollision(boss.x, boss.y, boss.w, boss.h);
    if (bc && boss.vy > 0) { boss.y = bc.ty * TILE - boss.h; boss.vy = 0; boss.onGround = true; }
    return;
  }

  // Only activate boss when Mario is near the arena
  if (Math.abs(mario.x - boss.x) > VIEW_W * 1.5) return;

  if (boss.invincible > 0) boss.invincible--;

  // Gravity
  boss.vy += GRAVITY_DOWN;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;

  // Rage mode: faster when low HP
  var bossRage = boss.hp <= 1;
  var bossSpeed = bossRage ? 0.8 : 0.5;

  // Horizontal movement - chase Mario slightly (disabled during dash)
  if (boss.invincible <= 0 && boss.dashPhase === 0) {
    var chaseStr = bossRage ? 0.01 : 0.004;
    if (mario.x < boss.x) boss.vx -= chaseStr;
    else boss.vx += chaseStr;
    if (boss.vx > bossSpeed) boss.vx = bossSpeed;
    if (boss.vx < -bossSpeed) boss.vx = -bossSpeed;
  }

  // Dash charge movement
  if (boss.dashPhase === 2) {
    var dashSpeed = bossRage ? 3.5 : 2.8;
    boss.vx = boss.dashDir * dashSpeed;
  } else if (boss.dashPhase === 3) {
    boss.vx *= 0.88;
  }

  boss.x += boss.vx;
  if (boss.x <= boss.arenaLeft) { boss.x = boss.arenaLeft; boss.vx = Math.abs(boss.vx); }
  if (boss.x + boss.w >= boss.arenaRight) { boss.x = boss.arenaRight - boss.w; boss.vx = -Math.abs(boss.vx); }

  // Vertical
  boss.y += boss.vy;
  boss.onGround = false;
  const bc = tileCollision(boss.x + 2, boss.y, boss.w - 4, boss.h);
  if (bc) {
    if (boss.vy > 0) {
      boss.y = bc.ty * TILE - boss.h; boss.vy = 0; boss.onGround = true;
      if (boss.slamming) {
        boss.slamming = false;
        screenShake = Math.max(screenShake, 6);
        playSound('gate_slam');
        const groundY = bc.ty * TILE;
        const waveCx = boss.x + boss.w / 2;
        bossShockwaves.push({ x: waveCx, y: groundY, vx: -1.8, life: 12, maxLife: 12 });
        bossShockwaves.push({ x: waveCx, y: groundY, vx: 1.8, life: 12, maxLife: 12 });
        for (let i = 0; i < 8; i++) {
          var slamLife = 20 + Math.random() * 15;
          dustParticles.push({
            x: waveCx + (Math.random() - 0.5) * 20,
            y: groundY - Math.random() * 4,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 2.5,
            life: slamLife, maxLife: slamLife,
          });
        }
      } else if (bossRage) {
        screenShake = Math.max(screenShake, 1.0);
      }
    }
    else { boss.y = (bc.ty + 1) * TILE; boss.vy = 0; }
  }

  // --- Abilities: timers ALWAYS advance, but only trigger when not invincible ---
  var bossCanAct = boss.invincible <= 0;

  // Melee cooldown/anim always tick
  if (boss.meleeCooldown > 0) boss.meleeCooldown--;
  if (boss.meleeAnim > 0) boss.meleeAnim--;

  // All timers advance every frame (even during flinch) so abilities charge up
  boss.jumpTimer++;
  boss.fireTimer++;
  if (boss.dashPhase === 0 && !boss.slamming) boss.slamTimer++;
  if (boss.dashPhase === 0 && !boss.slamming) boss.dashTimer++;

  // Active dash phases always advance (even during flinch so boss isn't stuck mid-dash)
  if (boss.dashPhase > 0) {
    boss.dashTimer++;
    if (boss.dashPhase === 1 && boss.dashTimer > 30) {
      boss.dashPhase = 2;
      boss.dashTimer = 0;
      playSound('boss_roar');
      screenShake = Math.max(screenShake, 2);
    } else if (boss.dashPhase === 2 && boss.dashTimer > 25) {
      boss.dashPhase = 3;
      boss.dashTimer = 0;
    } else if (boss.dashPhase === 3 && boss.dashTimer > 20) {
      boss.dashPhase = 0;
      boss.dashTimer = 0;
    }
  }

  // --- Trigger abilities only when bossCanAct ---

  // Jump
  if (bossCanAct && boss.dashPhase === 0 && !boss.slamming &&
      boss.onGround && boss.jumpTimer > boss.nextJumpAt) {
    boss.vy = bossRage ? -7.5 : -6.5;
    boss.jumpTimer = 0;
    boss.nextJumpAt = bossRage ? 70 + Math.random() * 40 : 110 + Math.random() * 70;
  }

  // Ground pound slam
  if (bossCanAct && boss.dashPhase === 0 && !boss.slamming &&
      boss.onGround && boss.slamTimer > boss.nextSlamAt) {
    boss.slamming = true;
    boss.slamTimer = 0;
    boss.nextSlamAt = bossRage ? 120 + Math.random() * 50 : 160 + Math.random() * 60;
    boss.vy = bossRage ? -(10 + Math.random() * 4) : -(9 + Math.random() * 3.5);
    boss.jumpTimer = 0;
  }

  // Dash attack (trigger)
  if (bossCanAct && boss.dashPhase === 0 && !boss.slamming &&
      boss.onGround && boss.dashTimer > boss.nextDashAt) {
    boss.dashPhase = 1;
    boss.dashTimer = 0;
    boss.nextDashAt = bossRage ? 180 + Math.random() * 60 : 220 + Math.random() * 80;
    boss.dashDir = mario.x < boss.x ? -1 : 1;
    boss.vx = 0;
  }

  // Melee swipe when Mario gets close
  var distToMario = Math.abs((mario.x + mario.w / 2) - (boss.x + boss.w / 2));
  if (bossCanAct && distToMario < 35 && boss.meleeCooldown <= 0 && boss.onGround &&
      boss.dashPhase === 0 && !boss.slamming && !mario.dead && mario.invincible <= 0) {
    boss.meleeAnim = 15;
    boss.meleeCooldown = bossRage ? 50 : 75;
    screenShake = Math.max(screenShake, 1.5);
    playSound('bump');
    const meleeDir = mario.x < boss.x ? -1 : 1;
    const mh = mario.big ? (mario.crouching ? 16 : 24) : 16;
    const my = mario.big && mario.crouching ? mario.y + 8 : mario.y;
    const meleeX = boss.x + boss.w / 2 + meleeDir * 20;
    if (Math.abs(mario.x + mario.w / 2 - meleeX) < 20 && my + mh > boss.y + 4 && my < boss.y + boss.h) {
      mariodie();
    }
  }

  // Throw fireballs
  if (bossCanAct && boss.fireTimer > boss.nextFireAt) {
    boss.fireTimer = 0;
    boss.nextFireAt = bossRage ? 120 + Math.random() * 60 : 160 + Math.random() * 80;
    const dir = mario.x < boss.x ? -1 : 1;
    var fbSpeed = (bossRage ? 1.2 : 0.9) + Math.random() * 1.4;
    const fbX = boss.x + (dir > 0 ? boss.w : -8);
    const fbY = boss.y + 10;
    const dx = mario.x - fbX;
    const dy = mario.y - fbY;
    const dist = Math.max(Math.abs(dx), 1);
    var aimSpread = (Math.random() - 0.5) * 2.0;
    var aimVy = (dy / dist) * fbSpeed * 0.5 - 0.8 + aimSpread;
    bossFireballs.push({
      x: fbX,
      y: fbY,
      vx: dir * fbSpeed + (Math.random() - 0.5) * 0.4,
      vy: Math.min(aimVy, -0.3),
      life: 150,
    });
    if (Math.random() < (bossRage ? 0.45 : 0.3)) {
      var fb2Speed = (bossRage ? 1.0 : 0.7) + Math.random() * 1.2;
      var aim2Spread = (Math.random() - 0.5) * 2.5;
      bossFireballs.push({
        x: fbX,
        y: boss.y + 14,
        vx: dir * fb2Speed + (Math.random() - 0.5) * 0.5,
        vy: Math.min(aimVy - 0.8 + aim2Spread, -1.0),
        life: 150,
      });
    }
    playSound('fireball');
  }

  // Animation
  boss.frameTimer++;
  if (boss.frameTimer > 16) { boss.frameTimer = 0; boss.frame = (boss.frame + 1) % 2; }

  // Collision with Mario
  if (mario.dead || flagDescending) return;
  const mx = mario.x + 2, mw = mario.w - 4;
  const mh = mario.big ? (mario.crouching ? 16 : 24) : 16;
  const my = mario.big && mario.crouching ? mario.y + 8 : mario.y;

  if (mario.starPower > 0 && boss.invincible <= 0 &&
      mx < boss.x + boss.w && mx + mw > boss.x && my < boss.y + boss.h && my + mh > boss.y) {
    boss.hp -= 5;
    boss.invincible = 60;
    boss.slamming = false;
    boss.meleeAnim = 0;
    if (boss.dashPhase > 0) { boss.dashPhase = 0; boss.dashTimer = 0; }
    if (boss.hp <= 0) {
      boss.alive = false; boss.dying = true; boss.vy = -5; boss.deathTimer = 0;
      score += ENEMY_POINTS.boss; addScorePopup(boss.x, boss.y - 16, ENEMY_POINTS.boss);
      enemiesKilled++; playSound('bossdie');
      onBossDefeated();
      sendEntityKill({ entity: 'boss', x: Math.round(boss.x), y: Math.round(boss.y), killType: 'boss_star', bossHp: 0 });
    } else {
      playSound('bosshit'); addScorePopup(boss.x, boss.y - 8, 500); score += 500;
      sendEntityKill({ entity: 'boss', x: Math.round(boss.x), y: Math.round(boss.y), killType: 'boss_star', bossHp: boss.hp });
    }
    return;
  }

  if (mx < boss.x + boss.w && mx + mw > boss.x && my < boss.y + boss.h && my + mh > boss.y) {
    if (mario.vy > 0 && my + mh - boss.y < 12 && boss.invincible <= 0) {
      boss.hp--;
      boss.invincible = 60;
      boss.slamming = false;
      boss.meleeAnim = 0;
      if (boss.dashPhase > 0) { boss.dashPhase = 0; boss.dashTimer = 0; }
      mario.vy = -7;
      mario.jumpsUsed = 1;
      mario.invincible = Math.max(mario.invincible, 60);
      screenShake = 5;
      if (boss.hp <= 0) {
        boss.alive = false;
        boss.dying = true;
        boss.vy = -5;
        boss.deathTimer = 0;
        score += ENEMY_POINTS.boss;
        addScorePopup(boss.x, boss.y - 16, ENEMY_POINTS.boss);
        enemiesKilled++;
        screenShake = 8;
        playSound('bossdie');
        onBossDefeated();
        sendEntityKill({ entity: 'boss', x: Math.round(boss.x), y: Math.round(boss.y), killType: 'boss_stomp', bossHp: 0 });
      } else {
        playSound('bosshit');
        addScorePopup(boss.x, boss.y - 8, 500);
        score += 500;
        boss.vx = (mario.x < boss.x ? 1 : -1) * 1.5;
        sendEntityKill({ entity: 'boss', x: Math.round(boss.x), y: Math.round(boss.y), killType: 'boss_stomp', bossHp: boss.hp });
      }
    } else if (mario.invincible <= 0 && boss.invincible <= 0) {
      mariodie();
    }
  }
}

// ================================================================
// UPDATE: ITEMS
// ================================================================
function updateItems() {
  items.forEach(item => {
    if (!item.active) return;
    if (item.emerging) {
      item.y -= 0.8;
      if (item.y <= item.emergeY - TILE) item.emerging = false;
      return;
    }

    item.vy += GRAVITY_DOWN;
    if (item.vy > MAX_FALL) item.vy = MAX_FALL;
    item.x += item.vx;
    let hc = tileCollision(item.x, item.y, item.w, item.h);
    if (hc) item.vx = -item.vx;
    item.y += item.vy;
    let vc = tileCollision(item.x, item.y, item.w, item.h);
    if (vc && item.vy > 0) {
      item.y = vc.ty * TILE - item.h;
      item.vy = item.type === 'star' ? -4.5 : 0;
    }
    if (item.y > LEVEL_HEIGHT * TILE) { item.active = false; return; }

    if (mario.dead) return;
    const mh = mario.big ? 24 : 16;
    if (mario.x + mario.w > item.x && mario.x < item.x + item.w &&
        mario.y + mh > item.y && mario.y < item.y + item.h) {
      if (item.type === 'mushroom') {
        if (!mario.big) {
          mario.big = true;
          mario.h = 24;
          mario.y -= 8;
        }
        score += 1000;
        addScorePopup(item.x, item.y - 8, 1000);
        playSound('powerup');
      } else if (item.type === 'flower') {
        if (!mario.big) {
          mario.big = true;
          mario.h = 24;
          mario.y -= 8;
        }
        mario.fire = true;
        score += 1000;
        addScorePopup(item.x, item.y - 8, 1000);
        playSound('powerup');
      } else if (item.type === 'star') {
        mario.starPower = 480;
        mario.invincible = 480;
        score += 1000;
        addScorePopup(item.x, item.y - 8, 1000);
        startStarMusic();
      }
      item.active = false;
    }
  });
  items = items.filter(i => i.active);
}

// ================================================================
// UPDATE: MARIO FIREBALLS
// ================================================================
function updateMarioFireballs() {
  if (fireballCooldown > 0) fireballCooldown--;

  marioFireballs.forEach(fb => {
    fb.x += fb.vx;
    fb.vy += 0.25;
    fb.y += fb.vy;
    fb.life--;

    if (fb.life <= 0 || fb.x < camera.rx - 32 || fb.x > camera.rx + VIEW_W + 32) {
      fb.remove = true;
      return;
    }

    const tx = Math.floor((fb.x + 4) / TILE);
    const ty = Math.floor((fb.y + 8) / TILE);
    const tile = getTile(tx, ty);
    if (tile && tile !== 10) {
      fb.y = (ty - 1) * TILE;
      fb.vy = -3.5;
      fb.bounces++;
      if (fb.bounces > 5) fb.remove = true;
    }

    const wallTxR = Math.floor((fb.x + 8) / TILE);
    const wallTxL = Math.floor(fb.x / TILE);
    const wallTy = Math.floor((fb.y + 4) / TILE);
    const wallR = getTile(wallTxR, wallTy);
    const wallL = getTile(wallTxL, wallTy);
    if ((wallR && wallR !== 10 && fb.vx > 0) || (wallL && wallL !== 10 && fb.vx < 0)) {
      fb.remove = true;
      return;
    }

    entities.forEach(e => {
      if (!e.alive) return;
      // Piranhas hiding fully inside their pipe (offset >= 0) aren't
      // visible on screen, so it would feel unfair to hit them through
      // the pipe. Any other state (emerging, out, retracting) is fair game.
      if (e.type === 'piranha' && e.emergeOffset >= 0) return;
      if (fb.x + fb.w > e.x && fb.x < e.x + e.w &&
          fb.y + fb.h > e.y && fb.y < e.y + e.h) {
        // Every enemy type dies to a fireball — previously buzzy beetles
        // were "fireproof" (classic SMB behaviour) but that left the
        // fire-flower feeling inconsistent, so now every ground and air
        // enemy is hittable.
        const pts = ENEMY_POINTS[e.type] || 100;
        e.alive = false;
        e.deathTimer = 18;
        e.vx = 0;
        e.vy = 0;
        score += pts;
        enemiesKilled++;
        addScorePopup(e.x, e.y - 8, pts);
        fb.remove = true;
        sendEntityKill({ entity: e.type, x: Math.round(e.x), y: Math.round(e.y), killType: 'fireball', deathTimer: 18 });
        for (var fi = 0; fi < 8; fi++) {
          var fLife = 8 + Math.floor(Math.random() * 8);
          dustParticles.push({
            x: e.x + e.w / 2 + (Math.random() - 0.5) * 12,
            y: e.y + e.h * 0.5 + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 2.5,
            vy: -Math.random() * 2 - 1,
            life: fLife, maxLife: fLife,
            color: ['#ff6600', '#ff9900', '#ffcc00', '#ff3300'][Math.floor(Math.random() * 4)],
          });
        }
      }
    });

    if (boss && boss.alive && boss.invincible <= 0 && !fb.remove) {
      if (fb.x + fb.w > boss.x && fb.x < boss.x + boss.w &&
          fb.y + fb.h > boss.y && fb.y < boss.y + boss.h) {
        boss.hp--;
        boss.invincible = 60;
        boss.slamming = false;
        boss.meleeAnim = 0;
        if (boss.dashPhase > 0) { boss.dashPhase = 0; boss.dashTimer = 0; }
        fb.remove = true;
        screenShake = 3;
        playSound('bosshit');
        if (boss.hp <= 0) {
          boss.alive = false;
          boss.dying = true;
          boss.deathTimer = 0;
          boss.vy = -5;
          score += ENEMY_POINTS.boss;
          addScorePopup(boss.x, boss.y - 16, ENEMY_POINTS.boss);
          enemiesKilled++;
          screenShake = 8;
          playSound('bossdie');
          onBossDefeated();
          sendEntityKill({ entity: 'boss', x: Math.round(boss.x), y: Math.round(boss.y), killType: 'boss_fireball', bossHp: 0 });
        } else {
          addScorePopup(boss.x, boss.y - 8, 500);
          score += 500;
          boss.vx = (fb.x < boss.x ? 1 : -1) * 1.5;
          sendEntityKill({ entity: 'boss', x: Math.round(boss.x), y: Math.round(boss.y), killType: 'boss_fireball', bossHp: boss.hp });
        }
      }
    }
  });

  marioFireballs = marioFireballs.filter(fb => !fb.remove);
}

// ================================================================
// UPDATE: PARTICLES
// ================================================================
function updateParticles() {
  particles.forEach(p => {
    if (p.type === 'bump') { p.timer--; if (p.timer <= 0) p.remove = true; }
    if (p.type === 'debris') {
      p.x += p.vx; p.y += p.vy; p.vy += GRAVITY_DOWN;
      p.life--; if (p.life <= 0) p.remove = true;
    }
  });
  particles = particles.filter(p => !p.remove);

  coinAnims.forEach(c => { c.y += c.vy; c.vy += 0.25; c.life--; });
  coinAnims = coinAnims.filter(c => c.life > 0);

  scorePopups.forEach(p => { p.y += p.vy; p.life--; });
  scorePopups = scorePopups.filter(p => p.life > 0);

  if (hudMessage) {
    hudMessage.life--;
    if (hudMessage.life <= 0) hudMessage = null;
  }

  dustParticles.forEach(d => {
    d.x += d.vx; d.y += d.vy; d.life--;
  });
  dustParticles = dustParticles.filter(d => d.life > 0);

  for (const m of ambientMotes) {
    m.x += m.vx;
    m.y += m.vy;
    if (m.y < 20) { m.y = 210; m.x = camera.x + Math.random() * VIEW_W; }
  }
}

// ================================================================
// SPECTATOR CAMERA
// ================================================================
// Detached camera used while the local player is eliminated. Locks onto
// the interpolated world position of `spectatorTargetId` (a remote blob)
// and lerps toward it the same way the live camera lerps toward Mario.
// If no target is available (last opponent left, target died, etc.) we
// freeze in place rather than snapping to the world origin — a stable
// last-known view is friendlier than the camera teleporting.
// ----------------------------------------------------------------
// Phantom collider for spectator mode.
//
// While the local player is eliminated and watching a remote player,
// this runs a lightweight "ghost mario" collision pass against the
// LOCAL world using the spectated player's interpolated position
// (sourced from the same Hermite-sampled snapshot stream that drives
// the spectator camera and remote-blob rendering). Coins, items, and
// stomp-killable enemies vanish locally as the spectated player
// walks over / lands on them, so spectator view feels like a real
// live broadcast instead of a ghost flying past frozen props.
//
// Side-effect free for other players: no score, no sound, no entity
// state propagated over the wire. Purely cosmetic local state
// mutation. It's a best-effort approximation — local entity
// positions and the spectated player's actual interactions can drift
// (each client simulates entities independently), but for typical
// match lengths the parity is convincing because:
//   • coins are static positions identical across clients,
//   • items don't wander far before being grabbed,
//   • enemies are deterministic patrollers spawned from the same
//     map data on every client.
//
// Conservative kill rules so we don't over-promise:
//   • coins / items: any AABB overlap → consume locally.
//   • piranha plants: overlap while emerged → kill (matches game).
//   • other enemies: only kill on a stomp (player coming down on
//     top: vy>0 AND player's bottom near enemy's top), OR while
//     the spectated player has star power (overlap = kill).
//   • koopas without stomp/star: leave alone (spectated player
//     would have died side-on, and we don't want to falsely
//     "shellify" a koopa they actually just walked past).
function updateSpectatorInteractions() {
  if (!eliminated || !spectatorTargetId) return;
  if (gameState !== 'playing') return;
  var rs = remoteStates.get(spectatorTargetId);
  if (!rs || !rs.snaps || rs.snaps.length === 0) return;
  var nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  var s = _sampleRemoteAt(rs.snaps, nowMs - REMOTE_INTERP_MS);
  if (!s || s.dead) return;

  var px = s.x;
  var py = s.y;
  var pw = 16;
  var ph = (s.size >= 1) ? 24 : 16;
  var pvy = s.vy || 0;
  var hasStar = !!s.star;

  // ---- Map coins (passive pickups, always collect on overlap) ----
  for (var ci = 0; ci < mapCoins.length; ci++) {
    var c = mapCoins[ci];
    if (c.collected) continue;
    if (px + pw > c.x && px < c.x + 8 && py + ph > c.y && py < c.y + 8) {
      c.collected = true;
      coinAnims.push({ x: c.x, y: c.y - 8, vy: -3, life: 25 });
    }
  }

  // ---- Items (mushroom/flower/star, always consume on overlap) ----
  for (var ki = 0; ki < items.length; ki++) {
    var it = items[ki];
    if (!it.active || it.emerging) continue;
    if (px + pw > it.x && px < it.x + it.w && py + ph > it.y && py < it.y + it.h) {
      it.active = false;
      for (var ip = 0; ip < 4; ip++) {
        var ia = Math.random() * Math.PI * 2;
        var iv = 0.4 + Math.random() * 0.8;
        dustParticles.push({
          x: it.x + it.w / 2, y: it.y + it.h / 2,
          vx: Math.cos(ia) * iv, vy: Math.sin(ia) * iv - 0.5,
          life: 10, maxLife: 14, sparkle: true,
        });
      }
    }
  }

  // ---- Enemies (kill on stomp, star, or piranha emerged overlap) ----
  for (var ji = 0; ji < entities.length; ji++) {
    var e = entities[ji];
    if (!e.alive) continue;

    var ey = e.y;
    var eh = e.h;
    if (e.type === 'piranha') {
      if (e.emergeOffset >= 0) continue; // tucked into the pipe
      eh = Math.abs(e.emergeOffset);
    }

    if (px + pw <= e.x || px >= e.x + e.w || py + ph <= ey || py >= ey + eh) continue;

    var stomped = pvy > 0 && (py + ph - ey) < 10;
    if (!hasStar && !stomped && e.type !== 'piranha') continue;

    if (e.type === 'goomba' || e.type === 'buzzy' || e.type === 'swooper' ||
        e.type === 'phantom' || e.type === 'piranha') {
      e.alive = false;
      if (e.type === 'piranha') e.remove = true;
      e.vx = 0;
      for (var sp = 0; sp < 4; sp++) {
        var sa = Math.random() * Math.PI * 2;
        var sv = 0.5 + Math.random() * 1.0;
        dustParticles.push({
          x: e.x + e.w / 2, y: ey + eh * 0.5,
          vx: Math.cos(sa) * sv, vy: Math.sin(sa) * sv - 0.5,
          life: 10, maxLife: 14, sparkle: false,
        });
      }
    } else if (e.type === 'koopa') {
      // Only retract on stomp/star — never on a side-on overlap.
      if (!e.shell) {
        e.shell = true;
        e.shellMoving = false;
        e.vx = 0;
      }
    }
  }
}

function updateSpectatorCamera() {
  ensureSpectatorTarget();

  var targetX = null;
  if (spectatorTargetId) {
    var rs = remoteStates.get(spectatorTargetId);
    if (rs) {
      var nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      var s = _sampleRemoteAt(rs.snaps, nowMs - REMOTE_INTERP_MS);
      if (s) {
        // Center the followed blob horizontally (their sprite is ~14px
        // wide so +7 puts the blob's mid-line on the screen midline).
        targetX = Math.round(s.x) - VIEW_W / 2 + 7;
      }
    }
  }

  if (targetX !== null) {
    camera.targetX = targetX;
    camera.x += (camera.targetX - camera.x) * 0.15;
    if (Math.abs(camera.targetX - camera.x) < 0.5) camera.x = camera.targetX;
  }
  // Clamp inside level bounds either way (target lerp OR frozen view).
  if (camera.x < 0) camera.x = 0;
  var maxCam = LEVEL_WIDTH * TILE - VIEW_W;
  if (camera.x > maxCam) camera.x = maxCam;
}

// ================================================================
// MAIN UPDATE
// ================================================================
function update() {
  if (gameState === 'gameover') {
    gameOverTimer++;
    if (gameOverTimer > 180) {
      gameState = 'menu';
      emit('quit_to_menu');
    }
    return;
  }
  if (gameState === 'lifeLost') {
    gameOverTimer++;
    if (gameOverTimer > 120) {
      gameState = 'playing';
      resetLevel();
    }
    return;
  }
  if (gameState !== 'playing' || paused) return;
  globalTick++;
  if (screenShake > 0) screenShake *= 0.8;
  if (multiplayerMode && roomStartTime > 0) {
    var prevMTR = matchTimeRemaining;
    matchTimeRemaining = Math.max(0, Math.ceil(roomMatchDuration - (Date.now() - roomStartTime) / 1000));
    if (matchTimeRemaining <= 30 && matchTimeRemaining > 0 && matchTimeRemaining !== prevMTR && matchTimeRemaining % 2 === 0) {
      playSound('warning');
    }
    if (matchTimeRemaining <= 0 && !matchEnding) {
      matchEnding = true;
    }
  }
  // When the match enters its closing phase the scoreboard is forced
  // up for everyone — alive, eliminated, or finished — so the final
  // standings are always visible right before the results screen.
  if (matchEnding && multiplayerMode) {
    showScoreboard = true;
  }
  if (eliminated) {
    // Suppress sendEntityKill while spectating — kills are attributed
    // by the real player's entity_kill messages over the wire, not by
    // the spectator's local collision sim.
    var _savedMP = multiplayerMode;
    multiplayerMode = false;

    // Save mario state so entity/boss AI can temporarily read the
    // spectated player's position, then restore afterward.
    var _savedMX = mario.x, _savedMY = mario.y, _savedMD = mario.dead;
    var _savedMI = mario.invincible, _savedMS = mario.starPower;
    var _savedMVy = mario.vy, _savedMB = mario.big, _savedMF = mario.fire;
    var _savedMC = mario.crouching;

    if (spectatorTargetId) {
      var _rs = remoteStates.get(spectatorTargetId);
      if (_rs && _rs.snaps.length > 0) {
        var _n = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        var _s = _sampleRemoteAt(_rs.snaps, _n - REMOTE_INTERP_MS);
        if (_s && !_s.dead) {
          mario.x = _s.x;
          mario.y = _s.y;
          mario.dead = false;
          mario.invincible = 9999;
          mario.starPower = _s.star || 0;
          mario.vy = _s.vy || 0;
          mario.big = (_s.size || 0) >= 1;
          mario.fire = (_s.size || 0) >= 2;
          mario.crouching = false;
        }
      }
    }

    // World keeps simulating so spectator view feels alive.
    updateEntities();
    updateBoss();
    updateItems();
    updateMarioFireballs();
    updateParticles();

    // Restore local mario state
    mario.x = _savedMX; mario.y = _savedMY; mario.dead = _savedMD;
    mario.invincible = _savedMI; mario.starPower = _savedMS;
    mario.vy = _savedMVy; mario.big = _savedMB; mario.fire = _savedMF;
    mario.crouching = _savedMC;

    multiplayerMode = _savedMP;

    // Apply the spectated player's block state to the global Sets every
    // frame so the renderer and collision code always see the correct
    // hit/empty/break state.  This covers the period between the async
    // requestSpectatorBlockState() callback and any delayed real-time
    // block_event messages, and provides a guaranteed frame-by-frame
    // fallback regardless of network timing.
    if (spectatorTargetId) applyBlockStateToGlobal(spectatorTargetId);

    // Phantom collider pass: the spectated remote player picks up
    // local coins / items and stomp-kills local enemies they touch,
    // so the spectator camera shows real interactions instead of a
    // ghost flying through frozen pickups. See updateSpectatorInteractions
    // header for the conservative kill rules and design rationale.
    updateSpectatorInteractions();
    updateSpectatorCamera();
    return;
  }
  updateMario();
  updateEntities();
  updateBoss();
  updateItems();
  updateMarioFireballs();
  updateParticles();
  // Stream local position/animation to the room. The function is
  // self-throttled and self-gated (no-op in single player or when
  // eliminated), so calling it unconditionally here is safe and
  // ensures opponents see death animations and flag descents too.
  sendPlayerState();
}

// ================================================================
// RENDERING
// ================================================================
function drawTile(x, y, tile) {
  const sx = x - camera.rx;
  if (sx < -TILE || sx > VIEW_W + TILE) return;
  const tileX = Math.floor(x / TILE);
  const tileY = Math.floor(y / TILE);
  const B = biomeAtTile(tileX);
  const sxI = sx | 0;
  const yI  = y | 0;

  switch (tile) {
    case 1: {
      const isSurface = tileY === 13 || (tileY > 0 && (!levelMap[tileY - 1] || levelMap[tileY - 1][tileX] === 0));
      bx.drawImage(getTileSprite(1, B, isSurface ? 'surface' : 'body'), sxI, yI);
      break;
    }
    case 2: {
      if (!eliminated || !breakBlocks.has(tileX + ',' + tileY)) {
        bx.drawImage(getTileSprite(2, B), sxI, yI);
      }
      break;
    }
    case 3: case 4: case 6: case 7: {
      const key = tileX + ',' + tileY;
      if (emptyBlocks.has(key)) {
        bx.drawImage(getTileSprite(tile, B, 'empty'), sxI, yI);
        break;
      }
      // Pulsing additive halo (cached radial sprite, no per-frame gradient).
      const glow = Math.sin(globalTick * 0.08) * 0.3 + 0.7;
      const glowAlpha = glow * (tile === 7 ? 0.20 : 0.12);
      const glowCol = tile === 7 ? '#c8a8f0' : tile === 6 ? '#80d0e8' : (B.id === 3 ? '#ffb060' : '#f0d868');
      bx.save();
      bx.globalAlpha = glowAlpha;
      bx.drawImage(getBlockGlowSprite(glowCol), sxI - 6, yI - 6);
      bx.restore();
      bx.drawImage(getTileSprite(tile, B), sxI, yI);
      // Tiny inner shimmer (cheap fillRect, no allocation).
      bx.fillStyle = 'rgba(255,255,255,' + (glow * 0.14).toFixed(3) + ')';
      bx.fillRect(sxI + 2, yI + 2, TILE - 4, TILE - 4);
      break;
    }
    case 5: {
      bx.drawImage(getTileSprite(5, B), sxI, yI);
      break;
    }
    case 10: bx.drawImage(getTileSprite(10, B), sxI, yI); break;
    case 11: bx.drawImage(getTileSprite(11, B), sxI, yI); break;
    case 12: bx.drawImage(getTileSprite(12, B), sxI - 2, yI); break;
    case 13: bx.drawImage(getTileSprite(13, B), sxI, yI); break;
  }
}

// Stable per-tile decoration RNG (tile-position based, no allocations)
function tileRand(seed, salt) {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function drawBackground() {
  // ----- SKY GRADIENT (smooth crossfade between adjacent biomes) -----
  const blend = biomeBlendInfo(camera.rx);
  const A = blend.from, B = blend.to, T01 = blend.t;
  const inTransition = (A !== B);
  // Cache the per-biome static sky gradient. Only the transition path needs
  // to allocate a fresh one each frame (because the lerp moves continuously).
  let skyGrad;
  if (!inTransition) {
    skyGrad = _staticSkyGrads[A.id];
    if (!skyGrad) {
      skyGrad = bx.createLinearGradient(0, 0, 0, VIEW_H);
      for (let i = 0; i < 6; i++) skyGrad.addColorStop(i / 5, A.sky[i]);
      _staticSkyGrads[A.id] = skyGrad;
    }
  } else {
    skyGrad = bx.createLinearGradient(0, 0, 0, VIEW_H);
    for (let i = 0; i < 6; i++) {
      skyGrad.addColorStop(i / 5, lerpColor(A.sky[i], B.sky[i], T01));
    }
  }
  bx.fillStyle = skyGrad;
  bx.fillRect(0, 0, VIEW_W, VIEW_H);

  // ----- Atmospheric tint per biome (drawn twice during transitions) -----
  function drawBiomeAtmosphere(Bm, a) {
    if (a <= 0.005) return;
    bx.save();
    bx.globalAlpha = a;
    if (Bm.id === 0) {
      const glowG = _cachedGrad('atmo_forestGlow', function() {
        const g = bx.createRadialGradient(VIEW_W * 0.78, VIEW_H * 0.18, 0, VIEW_W * 0.78, VIEW_H * 0.18, VIEW_W * 0.65);
        g.addColorStop(0, 'rgba(255,240,180,0.20)');
        g.addColorStop(0.4, 'rgba(200,240,160,0.08)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        return g;
      });
      bx.fillStyle = glowG; bx.fillRect(0, 0, VIEW_W, VIEW_H);
    } else if (Bm.id === 1) {
      const auG = _cachedGrad('atmo_snowAurora', function() {
        const g = bx.createLinearGradient(0, 0, 0, VIEW_H * 0.6);
        g.addColorStop(0, 'rgba(180,220,255,0.10)');
        g.addColorStop(1, 'rgba(180,220,255,0)');
        return g;
      });
      bx.fillStyle = auG; bx.fillRect(0, 0, VIEW_W, VIEW_H * 0.6);
      // Moon stays at a screen-fixed position so it doesn't pop on/off-screen
      const moonX = VIEW_W * 0.78;
      const moonY = 32;
      const mG = _cachedGrad('atmo_snowMoon', function() {
        const g = bx.createRadialGradient(VIEW_W * 0.78, 32, 1, VIEW_W * 0.78, 32, 14);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.5, '#dde8f4');
        g.addColorStop(1, 'rgba(220,232,244,0)');
        return g;
      });
      bx.fillStyle = mG; bx.beginPath(); bx.arc(moonX, moonY, 14, 0, Math.PI * 2); bx.fill();
    } else if (Bm.id === 2) {
      const sunX = 50, sunY = 36;
      const sG = _cachedGrad('atmo_desertSun', function() {
        const g = bx.createRadialGradient(50, 36, 1, 50, 36, 30);
        g.addColorStop(0, '#fff8c8');
        g.addColorStop(0.4, '#fbd070');
        g.addColorStop(1, 'rgba(240,160,80,0)');
        return g;
      });
      bx.fillStyle = sG; bx.fillRect(0, 0, VIEW_W, VIEW_H);
      bx.fillStyle = '#fff8c8'; bx.beginPath(); bx.arc(sunX, sunY, 11, 0, Math.PI * 2); bx.fill();
      bx.fillStyle = 'rgba(120,40,10,0.6)';
      bx.fillRect(sunX - 4, sunY - 2, 1, 2);
      bx.fillRect(sunX + 3, sunY - 2, 1, 2);
      bx.beginPath();
      bx.arc(sunX, sunY + 2, 3, 0.2, Math.PI - 0.2);
      bx.strokeStyle = 'rgba(120,40,10,0.6)';
      bx.lineWidth = 0.8;
      bx.stroke();
    } else if (Bm.id === 3) {
      const vG = _cachedGrad('atmo_lavaGlow', function() {
        const g = bx.createRadialGradient(VIEW_W * 0.5, VIEW_H * 0.95, 5, VIEW_W * 0.5, VIEW_H * 0.95, VIEW_W * 0.7);
        g.addColorStop(0, 'rgba(255,140,40,0.22)');
        g.addColorStop(0.5, 'rgba(220,60,20,0.12)');
        g.addColorStop(1, 'rgba(80,0,10,0)');
        return g;
      });
      bx.fillStyle = vG; bx.fillRect(0, 0, VIEW_W, VIEW_H);
    } else if (Bm.id === 4) {
      // Cosmic Nexus: pure pixel-art deep space.
      // Layers (back -> front):
      //   1. Far starfield (slow parallax, includes Milky Way dust band)
      //   2. Planets (anchored to arena center, gentle parallax + bob)
      //   3. Nebula clusters (anchored to arena, slow drift)
      //   4. Twinkling foreground stars (fixed positions, animated alpha)
      //   5. Occasional shooting star streak
      //
      // Planets/nebulas are anchored RELATIVE TO THE BOSS ARENA camera
      // position so that when the camera locks for the fight they all
      // sit in pre-chosen "scenery slots" between the arena walls. The
      // small approach/exit walks just nudge them with light parallax.
      const cs = getCosmicSprites();
      const baseAlpha = bx.globalAlpha;
      const ARENA_CAM_X = BOSS_ARENA_LEFT * TILE; // = 7920 (camera.x at fight)
      const relCam = camera.rx - ARENA_CAM_X;

      // ---- 1. STARFIELD ----
      // Tile the wide starfield sprite horizontally with slow parallax.
      const sf = cs.starfield;
      let sfOffset = (camera.rx * 0.08) % sf.width;
      if (sfOffset < 0) sfOffset += sf.width;
      bx.drawImage(sf, -sfOffset, 0);
      if (-sfOffset + sf.width < VIEW_W) {
        bx.drawImage(sf, -sfOffset + sf.width, 0);
      }

      // ---- 2. PLANETS + ASTEROIDS ----
      // Each anchorX is a screen coord that's where the body appears
      // when the camera is locked at the arena. Visible arena interior
      // spans screen x = 16 .. 240 (the rest is the wall tiles).
      function drawPlanetSprite(p, anchorX, anchorY, parallax, phase, bobAmp) {
        const px = anchorX - relCam * parallax;
        const py = anchorY + Math.sin(globalTick * 0.005 + phase) * (bobAmp || 1.0);
        bx.drawImage(p.canvas, Math.round(px - p.w / 2), Math.round(py - p.h / 2));
      }
      function drawAsteroidSprite(a, anchorX, anchorY, parallax, driftSpd, spinPhase) {
        const ax = anchorX - relCam * parallax + Math.sin(globalTick * driftSpd + spinPhase) * 4;
        const ay = anchorY + Math.cos(globalTick * driftSpd * 0.7 + spinPhase) * 2;
        bx.drawImage(a.canvas, Math.round(ax - a.w / 2), Math.round(ay - a.h / 2));
      }
      // Showcase: big ringed gas giant high up just right of centre.
      drawPlanetSprite(cs.planetRinged, 148, 54,  0.06, 0,    1.0);
      // Mid-distance blue ice planet on the right side.
      drawPlanetSprite(cs.planetBlue,   208, 116, 0.10, 1,    1.3);
      // Small green planet upper-left for variety
      drawPlanetSprite(cs.planetGreen,  44,  46,  0.12, 2.2,  0.8);
      // Small rocky moon lower-left
      drawPlanetSprite(cs.planetRocky,  72,  146, 0.13, 2,    1.0);
      // Asteroids — slow drift, scattered in foreground depth
      drawAsteroidSprite(cs.asteroid1, 100, 80,  0.18, 0.008, 0.0);
      drawAsteroidSprite(cs.asteroid2, 184, 90,  0.20, 0.011, 1.4);
      drawAsteroidSprite(cs.asteroid3, 30,  108, 0.22, 0.013, 2.7);
      drawAsteroidSprite(cs.asteroid2, 224, 70,  0.16, 0.009, 3.5);

      // ---- 3. NEBULA CLUSTERS ----
      function drawNebulaSprite(sprite, anchorX, anchorY, parallax, driftSpd, phase) {
        const nx = anchorX - relCam * parallax + Math.sin(globalTick * driftSpd) * 3;
        const ny = anchorY + Math.sin(globalTick * 0.006 + phase) * 1.5;
        bx.drawImage(sprite, Math.round(nx - sprite.width / 2), Math.round(ny - sprite.height / 2));
      }
      // Three nebulas distributed across the upper sky, all visible during
      // the fight, anchored between the walls.
      drawNebulaSprite(cs.nebulaPurple, 86,  30, 0.04, 0.012, 0);
      drawNebulaSprite(cs.nebulaBlue,   188, 38, 0.06, 0.009, 1.7);
      drawNebulaSprite(cs.nebulaPink,   128, 88, 0.05, 0.006, 2.9);

      // ---- 4. TWINKLING FOREGROUND STARS ----
      // Twelve fixed-position stars whose alpha pulses on a sine; uses
      // tile-deterministic positions so they're stable but distinct.
      const twinkleCount = 14;
      bx.fillStyle = '#ffffff';
      for (let i = 0; i < twinkleCount; i++) {
        const seed = i * 73 + 11;
        const tx = ((seed * 9301 + 49297) % 233280) / 233280;
        const ty = (((seed + 1) * 9301 + 49297) % 233280) / 233280;
        const px = (tx * VIEW_W) | 0;
        const py = (ty * VIEW_H * 0.55) | 0;
        const phase = i * 0.7;
        const a = 0.35 + 0.55 * Math.max(0, Math.sin(globalTick * 0.06 + phase));
        bx.globalAlpha = baseAlpha * a;
        bx.fillRect(px, py, 1, 1);
        // Cross-flare at peak brightness
        if (a > 0.75) {
          bx.globalAlpha = baseAlpha * (a - 0.5);
          bx.fillRect(px - 1, py, 1, 1);
          bx.fillRect(px + 1, py, 1, 1);
          bx.fillRect(px, py - 1, 1, 1);
          bx.fillRect(px, py + 1, 1, 1);
        }
      }
      bx.globalAlpha = baseAlpha;

      // ---- 5. SHOOTING STARS ----
      _updateShootingStar();
      for (let si = 0; si < _shootingStars.length; si++) {
        const ss = _shootingStars[si];
        if (!ss.active) continue;
        const sx = ss.x | 0;
        const sy = ss.y | 0;
        // Fade in/out over life
        const lifeT = ss.life / ss.max;
        const fade = lifeT < 0.18 ? lifeT / 0.18 : (lifeT > 0.82 ? (1 - lifeT) / 0.18 : 1);
        bx.globalAlpha = baseAlpha * fade;
        // Trail — 14 pixel tapered comet tail with subtle colour shift
        // from white-hot head to soft purple tip (matches cosmic theme).
        const dirX = Math.sign(ss.vx) || 1;
        const slope = ss.vy / Math.abs(ss.vx);
        const tailLen = 14;
        for (let t = 1; t < tailLen; t++) {
          const a = 1 - (t / tailLen);
          // Interpolate white -> lavender along tail
          const r = Math.round(255 - (255 - 200) * (t / tailLen));
          const g = Math.round(255 - (255 - 170) * (t / tailLen));
          const b = 255;
          bx.fillStyle = `rgba(${r},${g},${b},${(a * 0.9).toFixed(3)})`;
          bx.fillRect(sx - dirX * t, sy - Math.round(t * slope), 1, 1);
          // Occasional second-pixel "puff" near the head for thickness
          if (t < 4) bx.fillRect(sx - dirX * t, sy - Math.round(t * slope) - 1, 1, 1);
        }
        // Bright head + cross-flare
        bx.fillStyle = '#ffffff';
        bx.fillRect(sx, sy, 1, 1);
        bx.fillStyle = 'rgba(255,255,255,0.85)';
        bx.fillRect(sx + dirX, sy, 1, 1);
        bx.fillRect(sx, sy - 1, 1, 1);
        bx.fillRect(sx, sy + 1, 1, 1);
        // Outer glow ring
        bx.fillStyle = 'rgba(220,200,255,0.4)';
        bx.fillRect(sx + dirX * 2, sy, 1, 1);
        bx.fillRect(sx, sy - 2, 1, 1);
        bx.fillRect(sx, sy + 2, 1, 1);
        bx.globalAlpha = baseAlpha;
      }
    }
    bx.restore();
  }
  drawBiomeAtmosphere(A, inTransition ? (1 - T01) : 1);
  if (inTransition) drawBiomeAtmosphere(B, T01);

  // ----- STARS (dark biomes only); fade in/out across transitions -----
  // Snow + Lava get a sparse twinkle field. Cosmic Nexus gets a denser
  // multi-coloured field where each star's hue cycles through the four
  // kingdom signatures (forest green, snow blue, desert gold, lava
  // orange) — visualising "the universe fight" the user described.
  const COSMIC_KINGDOM_COLORS = ['#7fd06a', '#a0d8ff', '#ffd07a', '#ff8a40'];
  function drawStarsForBiome(Bm, a) {
    if (a <= 0.005) return;
    if (Bm.id !== 1 && Bm.id !== 3 && Bm.id !== 4) return;
    const isCosmic = (Bm.id === 4);
    // Cosmic uses the FULL height of the sky (not just the upper half)
    // and twinkles much harder.
    const yLimit = isCosmic ? VIEW_H * 0.95 : VIEW_H * 0.5;
    for (let i = 0; i < BG_STARS.length; i++) {
      const star = BG_STARS[i];
      const span = VIEW_W + 40;
      let starSx = (star.tx * TILE - camera.rx * (isCosmic ? 0.05 : 0.08)) % span;
      const starSxW = ((starSx % span) + span) % span - 20;
      const starSy = star.ty * VIEW_H;
      if (starSy > yLimit) continue;
      const twinkle = Math.sin(globalTick * 0.04 * star.speed + star.phase);
      let baseAlpha = a * (0.20 + (twinkle * 0.5 + 0.5) * 0.55);
      let col;
      if (isCosmic) {
        // Each star permanently locked to one of 4 kingdom colours,
        // chosen deterministically so they don't shimmer between hues.
        col = COSMIC_KINGDOM_COLORS[i & 3];
        baseAlpha *= 1.25;
      } else {
        col = Bm.id === 3 ? '#ffd0a0' : '#e8e0fc';
      }
      bx.save();
      bx.globalAlpha = Math.min(1, baseAlpha);
      bx.fillStyle = col;
      bx.beginPath();
      bx.arc(starSxW, starSy, star.size * (isCosmic ? 1.15 : 1), 0, Math.PI * 2);
      bx.fill();
      if (star.size > 0.9 && twinkle > 0.6) {
        bx.globalAlpha = a * (twinkle - 0.6) * 1.2;
        bx.fillStyle = isCosmic ? col : '#fff';
        bx.fillRect(starSxW - 2, starSy - 0.3, 4, 0.6);
        bx.fillRect(starSxW - 0.3, starSy - 2, 0.6, 4);
      }
      bx.restore();
    }
  }
  drawStarsForBiome(A, inTransition ? (1 - T01) : 1);
  if (inTransition) drawStarsForBiome(B, T01);

  const GY = 13 * TILE;
  const T = TILE;
  const totalLen = LEVEL_WIDTH * T;
  const camTxLeft = Math.floor(camera.rx / T);
  const camTxRight = Math.ceil((camera.rx + VIEW_W) / T);

  // ====================================================
  // FAR PARALLAX MOUNTAINS / DUNES / VOLCANOES (single biome,
  // crossfaded with previous biome during transitions)
  // ====================================================
  function drawHillsForBiome(Bm, a) {
    if (a <= 0.005) return;
    if (Bm.id === 4) return; // Cosmic Nexus has nebulas instead of hills
    bx.save();
    bx.globalAlpha = a;
    // Wide buffer so big hills (radius up to ~128px) don't pop at edges
    const startTx = Math.floor((camera.rx * 0.4) / T) - 12;
    const endTx = Math.floor((camera.rx * 0.4 + VIEW_W) / T) + 12;
    for (let tx = startTx; tx < endTx; tx++) {
      if (((tx % 6) + 6) % 6 !== 0) continue;
      const sx = Math.floor(tx * T - camera.rx * 0.4);
      const rTiles = 4 + (((tx % 5) + 5) % 5);
      const r = rTiles * T;
      if (sx + r < -40 || sx - r > VIEW_W + 40) continue;
      // Stamp the pre-rendered hill sprite. Hill is centered at sx, base at GY + r*0.4.
      const sprite = getHillSprite(Bm, rTiles);
      const drawX = Math.round(sx - sprite.hcxOffset);
      const drawY = Math.round((GY + r * 0.4) - sprite.hillBaseOffset);
      bx.drawImage(sprite.canvas, drawX, drawY);
      // Desert pyramid silhouette every 4th hill — kept as a live draw because
      // it interacts with GY (the world ground line), not the sprite-local one.
      if (Bm.id === 2 && (tx / 6) % 4 === 0) {
        const px = sx + 6;
        const pH = 38, pW = 60;
        bx.fillStyle = lerpColor(Bm.hillCol2, '#5a2a18', 0.35);
        bx.beginPath();
        bx.moveTo(px, GY - pH);
        bx.lineTo(px + pW / 2, GY);
        bx.lineTo(px - pW / 2, GY);
        bx.closePath();
        bx.fill();
        bx.fillStyle = 'rgba(255,220,150,0.25)';
        bx.beginPath();
        bx.moveTo(px, GY - pH);
        bx.lineTo(px + pW / 2, GY);
        bx.lineTo(px, GY);
        bx.closePath();
        bx.fill();
      }
    }
    bx.restore();
  }
  drawHillsForBiome(A, inTransition ? (1 - T01) : 1);
  if (inTransition) drawHillsForBiome(B, T01);

  // ====================================================
  // CLOUDS / SNOW CLOUDS / ASH CLOUDS (parallax 0.2)
  // ====================================================
  const cloudR = 10;
  function drawCloudsForBiome(Bm, a) {
    if (a <= 0.005) return;
    if (Bm.id === 4) return; // Cosmic Nexus draws nebulas in atmosphere instead
    bx.save();
    bx.globalAlpha = a;
    const startTx = Math.floor((camera.rx * 0.2) / T) - 8;
    const endTx = Math.floor((camera.rx * 0.2 + VIEW_W) / T) + 8;
    for (let tx = startTx; tx < endTx; tx++) {
      if (((tx % 9) + 9) % 9 !== 0) continue;
      const sx = Math.floor(tx * T - camera.rx * 0.2);
      const cy = (2 + (((tx % 4) + 4) % 4)) * T;
      const bumps = 2 + (Math.abs(tx) % 3);
      const spacing = cloudR * 1.5;
      const totalW = (bumps - 1) * spacing + cloudR * 2;
      if (sx + totalW < -60 || sx > VIEW_W + 60) continue;
      bx.save();
      bx.globalAlpha = a * 0.20;
      bx.fillStyle = '#000';
      for (let i = 0; i < bumps; i++) {
        const ccx = sx + i * spacing + cloudR;
        bx.beginPath();
        bx.arc(ccx + 1.5, cy + cloudR + 1.5, cloudR, Math.PI, 0, false);
        bx.fill();
      }
      bx.restore();
      const cloudGradKey = 'cloudBump_' + Bm.id;
      const cGrad = _cachedGrad(cloudGradKey, function() {
        const g = bx.createRadialGradient(-2, -cloudR * 0.3, cloudR * 0.1, 0, 0, cloudR);
        g.addColorStop(0, Bm.cloudCol);
        g.addColorStop(0.6, Bm.cloudCol);
        g.addColorStop(1, Bm.cloudShade);
        return g;
      });
      for (let i = 0; i < bumps; i++) {
        const ccx = sx + i * spacing + cloudR;
        bx.save();
        bx.translate(ccx, cy + cloudR);
        bx.fillStyle = cGrad;
        bx.beginPath();
        bx.arc(0, 0, cloudR, Math.PI, 0, false);
        bx.fill();
        bx.restore();
      }
      bx.fillStyle = Bm.cloudShade;
      bx.fillRect(sx, cy + cloudR, totalW, 2);
      if (Bm.id === 3) {
        bx.save();
        bx.globalAlpha = a * 0.25;
        bx.fillStyle = 'rgba(255,80,40,1)';
        bx.fillRect(sx, cy + cloudR, totalW, 2);
        bx.restore();
      }
    }
    bx.restore();
  }
  drawCloudsForBiome(A, inTransition ? (1 - T01) : 1);
  if (inTransition) drawCloudsForBiome(B, T01);

  // ====================================================
  // PIT DEPTH SHADOW
  // Make precipices (gaps in the ground) clearly visible by drawing a
  // dark vertical fade in every pit column, so the player never misses a
  // fall hazard. Drawn AFTER hills/clouds so it sits in front of distant
  // parallax (which would otherwise camouflage the gap), but BEFORE the
  // level tiles so the ground edges still look crisp.
  for (let tx = camTxLeft - 1; tx < camTxRight + 1; tx++) {
    if (tx < 0 || tx >= LEVEL_WIDTH) continue;
    if (getTile(tx, 13) !== 0) continue; // only pit columns
    if (tx >= BOSS_ARENA_LEFT - 1 && tx <= BOSS_GATE_X + 1) continue;
    const PitBm = biomeAtTile(tx);
    const psx = Math.floor(tx * T - camera.rx);
    const pitTop = GY; // top of the missing ground row
    // Lava biome already has a glowing magma bed in pits — don't darken
    // those (the bright orange itself signals "danger here"). For every
    // other biome, paint a soft dark wash so the gap reads as a void.
    if (PitBm.id !== 3) {
      // Same vertical span / colours every column — cache once per session.
      if (!_pitDepthGrad) {
        _pitDepthGrad = bx.createLinearGradient(0, pitTop, 0, VIEW_H);
        _pitDepthGrad.addColorStop(0, 'rgba(8,4,18,0.40)');
        _pitDepthGrad.addColorStop(0.55, 'rgba(8,4,18,0.62)');
        _pitDepthGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
      }
      bx.fillStyle = _pitDepthGrad;
      bx.fillRect(psx, pitTop, T, VIEW_H - pitTop);
    }
    // Cliff face highlight on the inside of adjacent ground tiles so the
    // edge is unmistakable in EVERY biome (including lava).
    if (getTile(tx - 1, 13) !== 0) {
      bx.fillStyle = PitBm.id === 3 ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.55)';
      bx.fillRect(psx, pitTop, 1, T * 1.2);
    }
    if (getTile(tx + 1, 13) !== 0) {
      bx.fillStyle = PitBm.id === 3 ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.55)';
      bx.fillRect(psx + T - 1, pitTop, 1, T * 1.2);
    }
  }

  // ====================================================
  // GROUND-LEVEL FOREGROUND DECORATIONS per biome
  // (bushes / drifts / cacti / lava bubbles)
  // ====================================================
  for (let tx = camTxLeft - 6; tx < camTxRight + 6; tx++) {
    if (tx < 0 || tx >= LEVEL_WIDTH) continue;
    const Bm = biomeAtTile(tx);
    const sx = Math.floor(tx * T - camera.rx);
    // skip if no ground here OR a tile sits on top
    if (getTile(tx, 13) === 0) continue;
    if (getTile(tx, 12) !== 0) continue;
    if (tx >= BOSS_ARENA_LEFT - 1 && tx <= BOSS_GATE_X + 1) continue;
    if (tx >= FLAGPOLE_X - 3) continue;
    // Don't draw decorations next to a pit — they'd visually bleed over the
    // gap and hide the precipice. Keeps cliff edges crisp and readable.
    const pitLeft = getTile(tx - 1, 13) === 0;
    const pitRight = getTile(tx + 1, 13) === 0;
    if (pitLeft || pitRight) continue;

    // Each biome decoration uses deterministic spacing
    const r = tileRand(tx, Bm.id);
    if (Bm.id === 0) {
      // Forest bushes (every ~10 tiles), small rocks/mushrooms scattered
      //
      // Arc chord positioning note:
      // A filled `arc(cx, cy, r, PI, 0)` fills pixels whose center sits
      // ABOVE the chord. Placing the chord on the pixel grid line GY
      // means the last bush pixel row is GY-1, and the ground tile
      // takes over at GY — touching, no gap. Earlier code used GY-1 as
      // the chord, which left pixel row GY-1 unfilled (the chord line
      // itself isn't rasterised) and exposed a 1-px strip of hill/sky
      // between every bush and the grass. Same logic for the mushroom
      // cap chord (must match the top of the stem, not sit 1px above).
      if (tx % 11 === 3 && r > 0.2) {
        const bumps = 1 + Math.floor(r * 3);
        const bushGradKey = 'bushBump_' + Bm.id;
        const buGrad = _cachedGrad(bushGradKey, function() {
          const g = bx.createRadialGradient(-2, -5, 1, 0, 0, 9);
          g.addColorStop(0, Bm.bushHi);
          g.addColorStop(0.55, Bm.bushMid);
          g.addColorStop(1, Bm.bushLo);
          return g;
        });
        for (let i = 0; i < bumps; i++) {
          const bcx = sx + i * 14 + 8;
          if (bcx < -20 || bcx > VIEW_W + 20) continue;
          bx.save();
          bx.translate(bcx, GY);
          bx.fillStyle = buGrad;
          bx.beginPath();
          bx.arc(0, 0, 9, Math.PI, 0, false);
          bx.fill();
          bx.restore();
          // Highlight
          bx.fillStyle = 'rgba(255,255,255,0.18)';
          bx.beginPath();
          bx.arc(bcx - 2, GY - 5, 2.5, 0, Math.PI * 2);
          bx.fill();
        }
      } else if (tx % 17 === 5) {
        // Tiny purple mushroom (theme accent!)
        if (sx > -10 && sx < VIEW_W + 10) {
          const mcx = sx + 8;
          bx.fillStyle = '#fcfcfc';
          bx.fillRect(mcx - 1, GY - 4, 2, 4);
          bx.fillStyle = Bm.accent;
          bx.beginPath();
          bx.arc(mcx, GY - 4, 4, Math.PI, 0, false);
          bx.fill();
          bx.fillStyle = '#fcfcfc';
          bx.fillRect(mcx - 2, GY - 6, 1, 1);
          bx.fillRect(mcx + 1, GY - 5, 1, 1);
        }
      }
    } else if (Bm.id === 1) {
      // Snow drifts and tiny pines
      if (tx % 7 === 2) {
        const dcx = sx + 8;
        if (dcx > -20 && dcx < VIEW_W + 20) {
          // Drift
          bx.fillStyle = 'rgba(255,255,255,0.95)';
          bx.beginPath();
          bx.ellipse(dcx, GY + 1, 12, 4, 0, Math.PI, 0, false);
          bx.fill();
          bx.fillStyle = 'rgba(180,210,240,0.55)';
          bx.fillRect(dcx - 12, GY + 1, 24, 1.5);
        }
      } else if (tx % 13 === 6) {
        // Snow-laden pine tree
        const pcx = sx + 8;
        if (pcx > -20 && pcx < VIEW_W + 20) {
          // Trunk
          bx.fillStyle = Bm.trunk;
          bx.fillRect(pcx - 1, GY - 14, 2, 14);
          // Foliage triangles
          for (let i = 0; i < 3; i++) {
            const ty = GY - 14 - i * 5;
            const tw = 8 - i * 2;
            bx.fillStyle = '#264e2e';
            bx.beginPath();
            bx.moveTo(pcx - tw, ty + 5);
            bx.lineTo(pcx, ty - 1);
            bx.lineTo(pcx + tw, ty + 5);
            bx.closePath();
            bx.fill();
            bx.fillStyle = '#fcfcfc';
            bx.beginPath();
            bx.moveTo(pcx - tw, ty + 5);
            bx.lineTo(pcx - tw + 1, ty + 4);
            bx.lineTo(pcx, ty + 1);
            bx.lineTo(pcx + tw - 1, ty + 4);
            bx.lineTo(pcx + tw, ty + 5);
            bx.closePath();
            bx.fill();
          }
        }
      }
    } else if (Bm.id === 2) {
      // Cacti and palm trees and sun-bleached bones
      if (tx % 9 === 4) {
        // Cactus
        const ccx = sx + 8;
        if (ccx > -20 && ccx < VIEW_W + 20) {
          bx.fillStyle = '#3e8a4a';
          bx.fillRect(ccx - 2, GY - 14, 4, 14);
          // Arms
          bx.fillRect(ccx - 6, GY - 10, 4, 2);
          bx.fillRect(ccx - 6, GY - 12, 2, 4);
          bx.fillRect(ccx + 2, GY - 8, 4, 2);
          bx.fillRect(ccx + 4, GY - 11, 2, 4);
          // Spines
          bx.fillStyle = '#fcfcc8';
          bx.fillRect(ccx - 3, GY - 12, 1, 1);
          bx.fillRect(ccx + 2, GY - 9, 1, 1);
          bx.fillRect(ccx - 1, GY - 6, 1, 1);
          // Highlight
          bx.fillStyle = 'rgba(255,255,255,0.2)';
          bx.fillRect(ccx - 2, GY - 14, 1, 14);
          // Flower (purple accent)
          bx.fillStyle = Bm.accent;
          bx.beginPath();
          bx.arc(ccx, GY - 14, 1.5, 0, Math.PI * 2);
          bx.fill();
        }
      } else if (tx % 15 === 7) {
        // Palm tree
        const pcx = sx + 8;
        if (pcx > -20 && pcx < VIEW_W + 20) {
          // Curved trunk
          bx.fillStyle = '#7a4818';
          bx.fillRect(pcx - 1, GY - 18, 2, 18);
          bx.fillStyle = '#a06830';
          bx.fillRect(pcx, GY - 18, 1, 18);
          // Fronds
          bx.fillStyle = '#3a8048';
          for (let a = 0; a < 6; a++) {
            const angle = -Math.PI / 2 + (a - 2.5) * 0.45;
            const len = 10;
            const ex = pcx + Math.cos(angle) * len;
            const ey = GY - 18 + Math.sin(angle) * len;
            bx.beginPath();
            bx.moveTo(pcx, GY - 18);
            bx.lineTo(ex - 1, ey);
            bx.lineTo(ex + 1, ey + 1);
            bx.lineTo(pcx + 1, GY - 17);
            bx.closePath();
            bx.fill();
          }
          // Coconut
          bx.fillStyle = '#3a1808';
          bx.beginPath();
          bx.arc(pcx + 2, GY - 16, 1.5, 0, Math.PI * 2);
          bx.fill();
        }
      } else if (tx % 23 === 12) {
        // Tiny dune speck
        bx.fillStyle = 'rgba(160,100,40,0.55)';
        bx.fillRect(sx + 4, GY - 1, 8, 1);
      }
    } else if (Bm.id === 3) {
      // Lava: rock pillars + glowing lava bubbles in front of ground
      if (tx % 9 === 3) {
        const rcx = sx + 8;
        if (rcx > -20 && rcx < VIEW_W + 20) {
          // Obsidian pillar silhouette
          bx.fillStyle = '#1a0a0a';
          bx.beginPath();
          bx.moveTo(rcx - 5, GY);
          bx.lineTo(rcx - 3, GY - 9);
          bx.lineTo(rcx, GY - 12);
          bx.lineTo(rcx + 4, GY - 8);
          bx.lineTo(rcx + 5, GY);
          bx.closePath();
          bx.fill();
          // Hot crack
          bx.fillStyle = 'rgba(255,120,30,0.85)';
          bx.fillRect(rcx - 1, GY - 10, 1, 6);
        }
      } else if (tx % 6 === 1) {
        // Lava bubble in foreground (animated)
        const bcx = sx + 8;
        const bob = Math.sin(globalTick * 0.08 + tx) * 1.2;
        if (bcx > -10 && bcx < VIEW_W + 10) {
          bx.fillStyle = 'rgba(255,140,40,0.55)';
          bx.beginPath();
          bx.arc(bcx, GY + 1 + bob, 2.0, 0, Math.PI * 2);
          bx.fill();
          bx.fillStyle = 'rgba(255,220,140,0.85)';
          bx.beginPath();
          bx.arc(bcx - 0.5, GY + 0.5 + bob, 0.8, 0, Math.PI * 2);
          bx.fill();
        }
      }
    } else if (Bm.id === 4) {
      // Cosmic Nexus: floating kingdom-coloured sparks rising from the
      // obsidian floor — one per ground column, hue cycled per tile so
      // the four kingdom colours alternate down the corridor.
      if (tx % 2 === 0) {
        const scx = sx + 8;
        if (scx > -10 && scx < VIEW_W + 10) {
          const hue = COSMIC_KINGDOM_COLORS[(tx >> 1) & 3];
          const lift = (Math.sin(globalTick * 0.05 + tx * 0.7) + 1) * 5; // 0..10 px lift
          const fade = 0.45 + Math.sin(globalTick * 0.05 + tx * 0.7 + 1.2) * 0.25;
          bx.save();
          bx.globalAlpha = Math.max(0, fade);
          bx.fillStyle = hue;
          bx.beginPath();
          bx.arc(scx, GY - 1 - lift, 1.1, 0, Math.PI * 2);
          bx.fill();
          // Faint trail dot beneath
          bx.globalAlpha = Math.max(0, fade) * 0.45;
          bx.fillRect(scx - 0.5, GY - 1 - lift * 0.45, 1, 1);
          bx.restore();
        }
      }
      // Rare obsidian shard silhouette
      if (tx % 13 === 4) {
        const rcx = sx + 8;
        if (rcx > -20 && rcx < VIEW_W + 20) {
          bx.fillStyle = '#1a0a18';
          bx.beginPath();
          bx.moveTo(rcx - 4, GY);
          bx.lineTo(rcx - 1, GY - 10);
          bx.lineTo(rcx + 3, GY - 6);
          bx.lineTo(rcx + 5, GY);
          bx.closePath();
          bx.fill();
          // Purple void crack
          bx.fillStyle = 'rgba(220,160,255,0.75)';
          bx.fillRect(rcx, GY - 8, 1, 6);
        }
      }
    }
  }

  // ====================================================
  // BIOME-SPECIFIC AMBIENT PARTICLES (snow / sand / embers / leaves)
  // Stable seeds (no camera-based reseed) so they don't teleport while walking.
  // ====================================================
  function drawParticlesForBiome(Bm, a) {
    if (a <= 0.005) return;
    const part = Bm.particle;
    for (let i = 0; i < part.count; i++) {
      const seed = i + Bm.id * 113 + 7;
      const r1 = tileRand(seed, 1);
      const r2 = tileRand(seed, 2);
      const r3 = tileRand(seed, 3);
      const sx = Math.floor((r1 * (VIEW_W * 1.4)) - VIEW_W * 0.2);
      const baseY = r2 * VIEW_H * 0.85;
      const sz = part.sizeMin + r3 * (part.sizeMax - part.sizeMin);
      if (part.kind === 'snow') {
        const drift = (globalTick * (0.4 + r3 * 0.5)) % VIEW_H;
        const px = sx + Math.sin(globalTick * 0.04 + i) * 3;
        const py = (baseY + drift) % VIEW_H;
        bx.save();
        bx.globalAlpha = a * 0.6;
        bx.fillStyle = '#fcfcfc';
        bx.beginPath();
        bx.arc(px, py, sz, 0, Math.PI * 2);
        bx.fill();
        bx.restore();
      } else if (part.kind === 'sand') {
        const drift = (globalTick * (0.7 + r3 * 0.6)) % (VIEW_W + 40);
        const px = ((sx + drift) % (VIEW_W + 40)) - 20;
        const py = baseY + Math.sin(globalTick * 0.03 + i) * 2;
        bx.save();
        bx.globalAlpha = a * 0.45;
        bx.fillStyle = part.color;
        bx.fillRect(px, py, sz, sz);
        bx.restore();
      } else if (part.kind === 'ember') {
        const rise = (globalTick * (0.5 + r3 * 0.7)) % (VIEW_H + 20);
        const px = sx + Math.sin(globalTick * 0.05 + i) * 2;
        const py = (VIEW_H - rise + baseY * 0.2) % VIEW_H;
        bx.save();
        bx.globalAlpha = a * 0.7 * (0.5 + 0.5 * Math.sin(globalTick * 0.1 + i));
        bx.fillStyle = part.color;
        bx.beginPath();
        bx.arc(px, py, sz, 0, Math.PI * 2);
        bx.fill();
        bx.globalAlpha = a * 0.25;
        bx.fillStyle = '#ff8040';
        bx.beginPath();
        bx.arc(px, py, sz * 2, 0, Math.PI * 2);
        bx.fill();
        bx.restore();
      } else if (part.kind === 'leaf') {
        const drift = (globalTick * (0.4 + r3 * 0.4)) % VIEW_H;
        const sway = Math.sin(globalTick * 0.05 + i) * 5;
        const px = sx + sway;
        const py = (baseY + drift) % VIEW_H;
        bx.save();
        bx.globalAlpha = a * 0.55;
        bx.fillStyle = part.color;
        bx.beginPath();
        bx.ellipse(px, py, sz * 1.2, sz * 0.6, sway * 0.05, 0, Math.PI * 2);
        bx.fill();
        bx.restore();
      }
    }
  }
  drawParticlesForBiome(A, inTransition ? (1 - T01) : 1);
  if (inTransition) drawParticlesForBiome(B, T01);

  // Lava-only: glowing magma bed under the ground row (visible in gaps).
  // Drawn now (during drawBackground) so subsequent drawLevel ground tiles cover it,
  // letting it show only where the level has no ground tile (ie. in pits).
  // Faded smoothly during desert<->lava transitions to avoid pop-in.
  function drawLavaBed(a) {
    if (a <= 0.005) return;
    bx.save();
    bx.globalAlpha = a;
    const lavaTop = GY;
    const lavaH = TILE * 2;
    if (!_lavaBedGrad) {
      _lavaBedGrad = bx.createLinearGradient(0, lavaTop, 0, lavaTop + lavaH);
      _lavaBedGrad.addColorStop(0, '#fff0a0');
      _lavaBedGrad.addColorStop(0.18, '#ffb050');
      _lavaBedGrad.addColorStop(0.55, '#e04018');
      _lavaBedGrad.addColorStop(1, '#5a1010');
    }
    bx.fillStyle = _lavaBedGrad;
    bx.fillRect(0, lavaTop, VIEW_W, lavaH);
    bx.fillStyle = 'rgba(255,255,200,0.65)';
    for (let xx = 0; xx < VIEW_W; xx += 3) {
      const yy = lavaTop + Math.sin(globalTick * 0.10 + xx * 0.18) * 1.4;
      bx.fillRect(xx, yy, 3, 1);
    }
    bx.fillStyle = 'rgba(255,200,80,0.35)';
    for (let xx = 0; xx < VIEW_W; xx += 6) {
      const yy = lavaTop + 3 + Math.sin(globalTick * 0.07 + xx * 0.10) * 1.0;
      bx.fillRect(xx, yy, 4, 1);
    }
    bx.restore();
  }
  let lavaA = 0;
  if (B.id === 3) lavaA = inTransition ? T01 : 1;
  else if (A.id === 3 && inTransition) lavaA = 1 - T01;
  drawLavaBed(lavaA);
}

function drawMario() {
  if (mario.invincible > 0) {
    const blinkRate = mario.invincible > 120 ? 8 : 3;
    if (Math.floor(mario.invincible / blinkRate) % 3 === 0) return;
  }

  // Castle-entry fade: while castleEnterTimer is counting up, the blob
  // is "stepping into" the castle door. Fade alpha to 0 over the
  // entry duration so the blob disappears smoothly into the gate
  // before the win card appears. Skip drawing entirely once fully
  // faded so we don't waste a draw call on an invisible blob.
  let castleAlpha = 1;
  if (castleEnterTimer > 0) {
    castleAlpha = Math.max(0, 1 - castleEnterTimer / CASTLE_ENTER_DURATION);
    if (castleAlpha <= 0) return;
  }

  const px = Math.floor(mario.x - camera.rx);
  const py = Math.floor(mario.y);
  const dir = mario.facing;
  const isBig = mario.big;

  // Wrap entire body draw in a save/restore so the entry fade can
  // dial down the entire blob (body + eyes + smile + feet) uniformly
  // without per-shape alpha plumbing.
  bx.save();
  if (castleAlpha < 1) bx.globalAlpha *= castleAlpha;

  // Blob body slightly bigger and a touch rounder for a more "huggable" silhouette.
  // Big body radius nudged from 9.5 → 9.0 for a slightly less bulky big-blob;
  // cy bumped 0.5 px down so feet still rest on the ground (body bottom = cy + rY).
  const bodyR = isBig ? 9.0 : 6.85;
  const cx = px + 7;
  const cy = isBig ? py + 11.5 : py + 7;

  let sqX = 1.0, sqY = 1.0, bounceY = 0;

  // ----- Boss cutscene freeze -----
  // During the boss intro/outro the gameplay update loop early-returns
  // and just zeroes mario.vx/vy. But `globalTick` keeps incrementing,
  // so any sin-driven animation below (idle breathing, in-air stretch,
  // double-jump spin, etc.) would still play and make the blob look
  // like it's twitching while it should be completely still.
  // Force a neutral, perfectly-static pose for the entire cutscene.
  const inBossCutscene = (bossIntroPhase > 0 || bossOutroPhase > 0);
  if (inBossCutscene) {
    // Skip every animation branch — render the blob as a still statue.
  } else if (mario.dead) {
    sqX = 1.25; sqY = 0.7;
  } else if (mario.doubleJumpAnim > 0) {
    var djt = (20 - mario.doubleJumpAnim) / 20;
    // Smoother spin curve (uses ease in/out instead of raw sine) so the
    // squash feels graceful rather than jittery.
    var spinPhase = djt * Math.PI * 2;
    var spin = Math.sin(spinPhase) * 0.14;
    sqX = 0.86 + spin;
    sqY = 1.14 - spin;
  } else if (!mario.onGround) {
    // Subtle in-air stretch; lerp a little with vy so a fast fall stretches
    // a touch more than a hover (more natural).
    var airStretch = Math.max(-1, Math.min(1, mario.vy * 0.18));
    sqX = 0.90 - airStretch * 0.04;
    sqY = 1.10 + airStretch * 0.05;
  } else if (mario.landSquash > 0) {
    var landT = mario.landSquash / 4;
    var landE = landT * landT * (3 - 2 * landT); // smoothstep ease
    sqX = 1.0 + 0.18 * landE;
    sqY = 1.0 - 0.13 * landE;
    bounceY = bodyR * 0.12 * landE;
  } else if (mario.skidding) {
    sqX = 1.12; sqY = 0.9;
  } else if (mario.crouching && isBig) {
    sqX = 1.3; sqY = 0.65;
    bounceY = bodyR * (1 - sqY);
  } else if (Math.abs(mario.vx) > 0.15) {
    // Smoother run cycle: cosine drives the squash so the body looks like
    // it lands and pushes off instead of just oscillating up & down.
    var walkSpeed = 0.20 + Math.abs(mario.vx) * 0.085;
    const t = globalTick * walkSpeed;
    var intensity = Math.min(1, Math.abs(mario.vx) / 2.5);
    var bAmp = 0.85 + intensity * 0.75;
    bounceY = Math.sin(t) * bAmp;
    var sqAmp = 0.06 * intensity;
    sqX = 1.0 + Math.cos(t) * sqAmp;
    sqY = 1.0 - Math.cos(t) * sqAmp;
  } else {
    // Idle: completely static pose, like classic 2D Mario standing
    // still. The blink animation (further down) handles the "alive"
    // feel without making the body float / wobble.
    sqX = 1.0; sqY = 1.0; bounceY = 0;
  }

  let bodyCol, shadCol, feetCol, highCol;
  if (mario.starPower > 0) {
    const phase = Math.floor(globalTick / 2) % 4;
    const bCols = ['#c0a8e8','#ffd060','#ff80b0','#80e8b0'];
    const sCols = ['#9880c0','#cc9930','#cc4070','#48b880'];
    const fCols = ['#6040c0','#aa7020','#993050','#288858'];
    const hCols = ['#e0d0f8','#fff0a0','#ffc0d8','#c0f8d8'];
    bodyCol = bCols[phase]; shadCol = sCols[phase]; feetCol = fCols[phase]; highCol = hCols[phase];
  } else if (mario.fire) {
    bodyCol = '#fcfcfc'; shadCol = '#d0c8e0'; feetCol = '#ff6848'; highCol = '#fcfcfc';
  } else {
    const c = getColorOption(mySelectedColor);
    bodyCol = c.hat; shadCol = c.overalls; feetCol = c.brown; highCol = c.skin;
  }

  const bcy = cy + bounceY;
  const rX = bodyR * sqX;
  const rY = bodyR * sqY;

  // Body silhouette (dark backplate, slight offset for grounded depth)
  bx.fillStyle = shadCol;
  bx.beginPath();
  bx.ellipse(cx - 1, bcy + 0.5, rX + 1, rY + 1, 0, 0, Math.PI * 2);
  bx.fill();

  const bodyGrad = bx.createRadialGradient(
    cx + rX * 0.22, bcy - rY * 0.2, rX * 0.08,
    cx - rX * 0.08, bcy + rY * 0.08, rX * 1.05
  );
  bodyGrad.addColorStop(0, highCol);
  bodyGrad.addColorStop(0.45, bodyCol);
  bodyGrad.addColorStop(1, shadCol);
  bx.fillStyle = bodyGrad;
  bx.beginPath();
  bx.ellipse(cx + 0.3, bcy, rX, rY, 0, 0, Math.PI * 2);
  bx.fill();

  bx.save();
  bx.globalAlpha = 0.4;
  bx.fillStyle = '#fcfcfc';
  bx.beginPath();
  bx.ellipse(cx + rX * 0.22, bcy - rY * 0.32, rX * 0.32, rY * 0.2, -0.4, 0, Math.PI * 2);
  bx.fill();
  bx.globalAlpha = 0.15;
  bx.beginPath();
  bx.ellipse(cx + rX * 0.15, bcy - rY * 0.18, rX * 0.55, rY * 0.4, -0.3, 0, Math.PI * 2);
  bx.fill();
  bx.restore();

  const eyeScale = isBig ? 1.5 : 1.0;
  const eyeOff = dir * 1.2;
  const eyeY = bcy - rY * 0.18;
  const eye1X = cx + eyeOff - 0.5;
  const eye2X = cx + eyeOff + 3.2 * eyeScale;
  const eyeR = 2.8 * eyeScale;
  const pupilR = 1.3 * eyeScale;

  if (!mario.dead) {
    // Periodic blink: closes for 4 frames every ~6 seconds. Provides
    // a small life signal without animating body position/scale.
    var blinkPhase = globalTick % 360;
    var blinking = blinkPhase < 4;

    if (blinking) {
      bx.fillStyle = '#202030';
      bx.fillRect(eye1X - eyeR + 0.5, eyeY - 0.5, eyeR * 2 - 1, 1.2);
      bx.fillRect(eye2X - eyeR + 0.5, eyeY - 0.5, eyeR * 2 - 1, 1.2);
    } else {
      bx.fillStyle = '#fcfcfc';
      bx.beginPath();
      bx.arc(eye1X, eyeY, eyeR, 0, Math.PI * 2);
      bx.fill();
      bx.beginPath();
      bx.arc(eye2X, eyeY, eyeR, 0, Math.PI * 2);
      bx.fill();

      bx.fillStyle = '#101020';
      const pupOff = dir * 0.7;
      bx.beginPath();
      bx.arc(eye1X + pupOff, eyeY + 0.3, pupilR, 0, Math.PI * 2);
      bx.fill();
      bx.beginPath();
      bx.arc(eye2X + pupOff, eyeY + 0.3, pupilR, 0, Math.PI * 2);
      bx.fill();

      const shineR = 0.6 * eyeScale;
      bx.fillStyle = '#fcfcfc';
      bx.beginPath();
      bx.arc(eye1X + pupOff - 0.4, eyeY - 0.5, shineR, 0, Math.PI * 2);
      bx.fill();
      bx.beginPath();
      bx.arc(eye2X + pupOff - 0.4, eyeY - 0.5, shineR, 0, Math.PI * 2);
      bx.fill();
    }

    const smileX = (eye1X + eye2X) / 2 + dir * 0.8;
    const smileY = eyeY + eyeR + 1.0 * eyeScale;
    bx.strokeStyle = '#202030';
    bx.lineWidth = 0.8;
    bx.lineCap = 'round';
    bx.beginPath();
    bx.arc(smileX, smileY, 1.5 * eyeScale, 0.15, Math.PI - 0.15);
    bx.stroke();
    bx.lineCap = 'butt';
  } else {
    bx.strokeStyle = '#202030';
    bx.lineWidth = 1.0;
    bx.lineCap = 'round';
    const xEyeY = bcy - rY * 0.1;
    const xr = 2.0;
    [cx - 1.5, cx + 3].forEach(function(ex) {
      bx.beginPath();
      bx.moveTo(ex - xr, xEyeY - xr);
      bx.lineTo(ex + xr, xEyeY + xr);
      bx.moveTo(ex + xr, xEyeY - xr);
      bx.lineTo(ex - xr, xEyeY + xr);
      bx.stroke();
    });
    bx.lineCap = 'butt';
  }

  const footW = isBig ? 4.0 : 3.0;
  const footH = isBig ? 2.8 : 2.0;
  const feetY = bcy + rY;

  function drawFoot(fx, fy, fw, fh, angle) {
    const fGrad = bx.createRadialGradient(fx, fy - fh * 0.3, 0, fx, fy, fw);
    fGrad.addColorStop(0, feetCol);
    fGrad.addColorStop(1, shadCol);
    bx.fillStyle = fGrad;
    bx.beginPath();
    bx.ellipse(fx, fy, fw, fh, angle || 0, 0, Math.PI * 2);
    bx.fill();
  }

  if (mario.dead) {
    drawFoot(cx - rX * 0.5, feetY + 1, footW, footH, -0.3);
    drawFoot(cx + rX * 0.5, feetY + 1, footW, footH, 0.3);
  } else if (!mario.onGround) {
    drawFoot(cx - 2, feetY - 0.5, footW * 0.8, footH * 0.7, 0);
    drawFoot(cx + 2, feetY - 0.5, footW * 0.8, footH * 0.7, 0);
  } else if (Math.abs(mario.vx) > 0.3 && !mario.crouching) {
    const phase = mario.frame % 3;
    const stride = isBig ? 4 : 3;
    let f1 = 0, f2 = 0;
    if (phase === 0) { f1 = -stride; f2 = stride * 0.6; }
    else if (phase === 2) { f1 = stride * 0.6; f2 = -stride; }
    drawFoot(cx - 3 + f1 * dir, feetY + 0.5, footW, footH, 0);
    drawFoot(cx + 3 + f2 * dir, feetY + 0.5, footW, footH, 0);
  } else {
    drawFoot(cx - 3, feetY + 0.5, footW, footH, 0);
    drawFoot(cx + 3, feetY + 0.5, footW, footH, 0);
  }

  if (mario.doubleJumpAnim > 0 && !mario.dead) {
    var djProg = (20 - mario.doubleJumpAnim) / 20;
    var eased = 1 - Math.pow(1 - djProg, 3);
    var ringR = bodyR * (0.8 + eased * 2.0);
    var ringAlpha = (1 - eased) * 0.38;
    var ringY = feetY + djProg * 3;
    bx.save();
    bx.globalAlpha = ringAlpha;
    var ringGrad = bx.createRadialGradient(cx, ringY, ringR * 0.3, cx, ringY, ringR);
    ringGrad.addColorStop(0, 'rgba(255,255,255,0)');
    ringGrad.addColorStop(0.6, (highCol || '#e0d0f8'));
    ringGrad.addColorStop(1, 'rgba(255,255,255,0)');
    bx.strokeStyle = ringGrad;
    bx.lineWidth = (2.0 - eased * 1.5) * (isBig ? 1.2 : 1);
    bx.beginPath();
    bx.ellipse(cx, ringY, ringR, ringR * 0.4, 0, 0, Math.PI * 2);
    bx.stroke();
    bx.restore();
  }

  // Close the castle-entry alpha wrapper opened at the top of drawMario.
  bx.restore();
}

function drawEntities() {
  entities.forEach(e => {
    if (!e.alive && !e.flat && !e.deathTimer) return;
    if (!e.alive && e.deathTimer && (e.deathTimer % 4 < 2)) return;
    const sx = Math.floor(e.x - camera.rx);
    if (sx < -TILE || sx > VIEW_W + TILE) return;

    if (e.type === 'goomba') {
      var gPal = GOOMBA_PALETTE_BY_BIOME[e.biome | 0] || GOOMBA_PALETTE;
      drawPixels(bx, sx, Math.floor(e.y), e.flat ? GOOMBA_FLAT : GOOMBA_SPRITE, gPal, e.frame === 1);
      // Subtle ember/snow flecks for the lava/snow variants — keeps the
      // section ID readable without changing the silhouette.
      if (e.biome === 3 && !e.flat) {
        var ge = (globalTick * 0.18) % 6;
        bx.fillStyle = 'rgba(255,180,60,0.6)';
        bx.fillRect(sx + 4, Math.floor(e.y) - ge, 1, 1);
        bx.fillRect(sx + 11, Math.floor(e.y) - (ge + 3) % 6, 1, 1);
      } else if (e.biome === 1 && !e.flat) {
        bx.fillStyle = 'rgba(255,255,255,0.85)';
        bx.fillRect(sx + 5, Math.floor(e.y) + 1, 1, 1);
        bx.fillRect(sx + 9, Math.floor(e.y) + 2, 1, 1);
      }
    } else if (e.type === 'koopa') {
      var ey = Math.floor(e.y);
      var ecx = sx + 8;
      var kPal = KOOPA_SHELL_BY_BIOME[e.biome | 0] || KOOPA_SHELL_BY_BIOME[0];
      if (e.shell) {
        // Shell mode (h=16): ground at ey+16, center shell at ey+10
        var shCy = ey + 10;
        var shGrad = bx.createRadialGradient(ecx + 1, shCy - 1, 1, ecx, shCy, 7);
        shGrad.addColorStop(0, kPal.hi);
        shGrad.addColorStop(0.6, kPal.mid);
        shGrad.addColorStop(1, kPal.lo);
        bx.fillStyle = shGrad;
        bx.beginPath();
        bx.ellipse(ecx, shCy, 7, 5.5, 0, 0, Math.PI * 2);
        bx.fill();
        bx.fillStyle = 'rgba(255,255,255,0.15)';
        bx.beginPath();
        bx.ellipse(ecx + 1, shCy - 2, 3, 2, -0.3, 0, Math.PI * 2);
        bx.fill();
        bx.fillStyle = kPal.lo;
        bx.beginPath();
        bx.ellipse(ecx, shCy + 4, 7, 1.5, 0, 0, Math.PI * 2);
        bx.fill();
        if (e.shellMoving) {
          var spinPhase = globalTick * 0.5;
          bx.strokeStyle = kPal.lo;
          bx.lineWidth = 0.8;
          bx.beginPath();
          bx.arc(ecx + Math.cos(spinPhase) * 3, shCy, 2, 0, Math.PI * 2);
          bx.stroke();
        }
      } else {
        // Walking koopa (h=24): ground at ey+24
        var kdir = e.vx > 0 ? 1 : -1;
        var kbob = Math.sin(globalTick * 0.2) * 0.5;
        var groundY = ey + 24;
        // Feet
        var fWalk = Math.sin(globalTick * 0.25);
        bx.fillStyle = '#d0c0e0';
        bx.beginPath();
        bx.ellipse(ecx - 3 + fWalk * 2, groundY - 2 + kbob, 2.5, 1.5, 0, 0, Math.PI * 2);
        bx.fill();
        bx.beginPath();
        bx.ellipse(ecx + 3 - fWalk * 2, groundY - 2 + kbob, 2.5, 1.5, 0, 0, Math.PI * 2);
        bx.fill();
        // Shell (on back)
        var shellCy = groundY - 10 + kbob;
        var ksGrad = bx.createRadialGradient(ecx - kdir, shellCy - 1, 1, ecx - kdir, shellCy, 8);
        ksGrad.addColorStop(0, kPal.hi);
        ksGrad.addColorStop(0.6, kPal.mid);
        ksGrad.addColorStop(1, kPal.lo);
        bx.fillStyle = ksGrad;
        bx.beginPath();
        bx.ellipse(ecx - kdir, shellCy, 7, 6, 0, 0, Math.PI * 2);
        bx.fill();
        bx.save();
        bx.globalAlpha = 0.2;
        bx.fillStyle = '#c0d0f0';
        bx.beginPath();
        bx.ellipse(ecx - kdir + 1, shellCy - 3, 3, 2, -0.3, 0, Math.PI * 2);
        bx.fill();
        bx.restore();
        bx.strokeStyle = kPal.lo;
        bx.lineWidth = 0.6;
        bx.beginPath();
        bx.moveTo(ecx - kdir, shellCy - 5);
        bx.lineTo(ecx - kdir, shellCy + 5);
        bx.stroke();
        // Head
        var headX = ecx + kdir * 6;
        var headY = shellCy - 7 + kbob;
        var hGrad = bx.createRadialGradient(headX, headY, 0.5, headX, headY + 1, 4);
        hGrad.addColorStop(0, kPal.head);
        hGrad.addColorStop(0.7, kPal.head);
        hGrad.addColorStop(1, kPal.headLo);
        bx.fillStyle = hGrad;
        bx.beginPath();
        bx.ellipse(headX, headY, 3.5, 3.5, 0, 0, Math.PI * 2);
        bx.fill();
        // Eye
        bx.fillStyle = '#fff';
        bx.beginPath();
        bx.arc(headX + kdir * 1.5, headY - 1, 1.5, 0, Math.PI * 2);
        bx.fill();
        bx.fillStyle = '#1a1a2e';
        bx.beginPath();
        bx.arc(headX + kdir * 2, headY - 0.8, 0.7, 0, Math.PI * 2);
        bx.fill();
      }
    } else if (e.type === 'buzzy') {
      var bPal = BUZZY_PALETTE_BY_BIOME[e.biome | 0] || BUZZY_PALETTE;
      drawPixels(bx, sx, Math.floor(e.y), e.flat ? BUZZY_FLAT : BUZZY_SPRITE, bPal, e.frame === 1);
    } else if (e.type === 'swooper') {
      if (e.flat) return;
      var swPal = SWOOPER_COLORS_BY_BIOME[e.biome | 0] || SWOOPER_COLORS_BY_BIOME[0];
      var scx = sx + 7, scy = Math.floor(e.y) + 7;
      var wt = (e.swoopTick || 0) * 4;
      var wingFlap = Math.sin(wt);

      // Left wing (rounded ellipse)
      bx.fillStyle = swPal.wing;
      bx.beginPath();
      bx.ellipse(scx - 8, scy - 1 + wingFlap * 4, 5, 2.5 + wingFlap, -0.3 + wingFlap * 0.3, 0, Math.PI * 2);
      bx.fill();
      // Right wing (rounded ellipse)
      bx.beginPath();
      bx.ellipse(scx + 8, scy - 1 + wingFlap * 4, 5, 2.5 + wingFlap, 0.3 - wingFlap * 0.3, 0, Math.PI * 2);
      bx.fill();

      // Body
      var swGrad = bx.createRadialGradient(scx + 1, scy - 1, 1, scx, scy, 6);
      swGrad.addColorStop(0, swPal.bodyHi);
      swGrad.addColorStop(0.7, swPal.bodyMid);
      swGrad.addColorStop(1, swPal.bodyLo);
      bx.fillStyle = swGrad;
      bx.beginPath();
      bx.ellipse(scx, scy, 5, 4.5, 0, 0, Math.PI * 2);
      bx.fill();

      // Ears
      bx.fillStyle = swPal.bodyMid;
      bx.beginPath();
      bx.moveTo(scx - 3, scy - 4);
      bx.lineTo(scx - 5, scy - 8);
      bx.lineTo(scx - 1, scy - 4);
      bx.closePath();
      bx.fill();
      bx.beginPath();
      bx.moveTo(scx + 3, scy - 4);
      bx.lineTo(scx + 5, scy - 8);
      bx.lineTo(scx + 1, scy - 4);
      bx.closePath();
      bx.fill();
      // Lava-variant: trailing ember sparks behind the firebat
      if (e.biome === 3) {
        for (var ie = 0; ie < 2; ie++) {
          var ephase = (globalTick * 0.15 + ie * 1.7) % 1;
          var ealpha = 1 - ephase;
          bx.save();
          bx.globalAlpha = ealpha * 0.7;
          bx.fillStyle = ie === 0 ? '#ffd060' : '#ff8030';
          bx.beginPath();
          bx.arc(scx - (e.vx > 0 ? 6 : -6) - ephase * 6, scy + 1, 1.2 - ephase, 0, Math.PI * 2);
          bx.fill();
          bx.restore();
        }
      }

      // Eyes - glowing
      bx.fillStyle = '#fcf0a0';
      bx.beginPath();
      bx.ellipse(scx - 2, scy - 1, 1.8, 1.4, 0, 0, Math.PI * 2);
      bx.fill();
      bx.beginPath();
      bx.ellipse(scx + 2, scy - 1, 1.8, 1.4, 0, 0, Math.PI * 2);
      bx.fill();
      // Pupils
      bx.fillStyle = '#1a0a28';
      bx.beginPath();
      bx.ellipse(scx - 2, scy - 0.5, 0.7, 1, 0, 0, Math.PI * 2);
      bx.fill();
      bx.beginPath();
      bx.ellipse(scx + 2, scy - 0.5, 0.7, 1, 0, 0, Math.PI * 2);
      bx.fill();

      // Tiny fangs
      bx.fillStyle = '#e0d0f0';
      bx.beginPath();
      bx.moveTo(scx - 1.5, scy + 2);
      bx.lineTo(scx - 1, scy + 4);
      bx.lineTo(scx - 0.5, scy + 2);
      bx.closePath();
      bx.fill();
      bx.beginPath();
      bx.moveTo(scx + 0.5, scy + 2);
      bx.lineTo(scx + 1, scy + 4);
      bx.lineTo(scx + 1.5, scy + 2);
      bx.closePath();
      bx.fill();
    } else if (e.type === 'phantom') {
      if (e.flat) return;
      var phPal = PHANTOM_COLORS_BY_BIOME[e.biome | 0] || PHANTOM_COLORS_BY_BIOME[0];
      var pcx = sx + 7, pcy = Math.floor(e.y) + 6;
      var pTick = (e.floatTick || 0);
      var pAlpha = 0.85 + Math.sin(pTick * 1.5) * 0.1;
      var pdir = e.vx > 0 ? 1 : -1;
      var tailWave = Math.sin(pTick * 2.5);

      bx.save();
      bx.globalAlpha = pAlpha;

      var phGrad = bx.createRadialGradient(pcx + 1, pcy - 2, 1, pcx, pcy + 1, 8);
      phGrad.addColorStop(0, phPal.hi);
      phGrad.addColorStop(0.5, phPal.mid);
      phGrad.addColorStop(1, phPal.lo);
      bx.fillStyle = phGrad;
      bx.beginPath();
      bx.arc(pcx, pcy - 1, 7, Math.PI, 0, false);
      bx.lineTo(pcx + 7, pcy + 4);
      bx.lineTo(pcx + 4.5, pcy + 2 + tailWave);
      bx.lineTo(pcx + 2, pcy + 5 + tailWave * 0.5);
      bx.lineTo(pcx, pcy + 2 - tailWave * 0.5);
      bx.lineTo(pcx - 2, pcy + 5 - tailWave * 0.5);
      bx.lineTo(pcx - 4.5, pcy + 2 - tailWave);
      bx.lineTo(pcx - 7, pcy + 4);
      bx.closePath();
      bx.fill();

      bx.save();
      bx.globalAlpha = 0.25;
      bx.fillStyle = '#fcfcfc';
      bx.beginPath();
      bx.ellipse(pcx + 1.5, pcy - 4, 3, 2, -0.3, 0, Math.PI * 2);
      bx.fill();
      bx.restore();

      var armX = pcx + pdir * 6;
      var armY = pcy + 1 + Math.sin(pTick * 2) * 1;
      bx.fillStyle = '#d8d0e8';
      bx.beginPath();
      bx.ellipse(armX, armY, 2.5, 1.8, pdir * 0.4, 0, Math.PI * 2);
      bx.fill();

      bx.fillStyle = '#1a0a28';
      bx.beginPath();
      bx.ellipse(pcx - 2.2 + pdir * 1.5, pcy - 2, 1.8, 2.2, 0, 0, Math.PI * 2);
      bx.fill();
      bx.beginPath();
      bx.ellipse(pcx + 2.8 + pdir * 1.5, pcy - 2, 1.8, 2.2, 0, 0, Math.PI * 2);
      bx.fill();
      bx.fillStyle = '#fcfcfc';
      bx.beginPath();
      bx.arc(pcx - 2.2 + pdir * 1.5 - 0.4, pcy - 2.8, 0.5, 0, Math.PI * 2);
      bx.fill();
      bx.beginPath();
      bx.arc(pcx + 2.8 + pdir * 1.5 - 0.4, pcy - 2.8, 0.5, 0, Math.PI * 2);
      bx.fill();

      bx.fillStyle = '#1a0a28';
      bx.beginPath();
      bx.ellipse(pcx + pdir * 2, pcy + 2, 3, 2.2, 0, 0, Math.PI);
      bx.fill();
      bx.fillStyle = '#c04060';
      bx.beginPath();
      bx.ellipse(pcx + pdir * 2, pcy + 3.2, 1.5, 1.2, 0, 0, Math.PI);
      bx.fill();
      bx.fillStyle = '#fcfcfc';
      bx.beginPath();
      bx.moveTo(pcx + pdir * 2 - 2.5, pcy + 2);
      bx.lineTo(pcx + pdir * 2 - 1.5, pcy + 3);
      bx.lineTo(pcx + pdir * 2 - 0.5, pcy + 2);
      bx.closePath();
      bx.fill();
      bx.beginPath();
      bx.moveTo(pcx + pdir * 2 + 0.5, pcy + 2);
      bx.lineTo(pcx + pdir * 2 + 1.5, pcy + 3);
      bx.lineTo(pcx + pdir * 2 + 2.5, pcy + 2);
      bx.closePath();
      bx.fill();

      bx.restore();
    } else if (e.type === 'piranha') {
      if (e.emergeOffset >= 0) return;
      const py = Math.floor(e.y);
      const pipeTopPx = Math.floor(e.baseY);
      const visibleH = pipeTopPx - py;
      if (visibleH <= 0) return;
      const pSprite = e.frame === 0 ? PIRANHA_SPRITE1 : PIRANHA_SPRITE2;
      bx.save();
      bx.beginPath();
      bx.rect(sx - 2, py, 24, visibleH);
      bx.clip();
      drawPixels(bx, sx, py, pSprite, PIRANHA_PALETTE, false, 1.25);
      bx.restore();
    }
  });
}

function drawItems() {
  items.forEach(item => {
    if (!item.active) return;
    const sx = Math.floor(item.x - camera.rx);
    if (sx < -TILE || sx > VIEW_W + TILE) return;
    const iy = Math.floor(item.y);
    // All three powerups render inside a strict 16x16 box (iy..iy+16,
    // sx..sx+16) — classic SMB-style. No piece pokes out above/below
    // or to the sides, so the sprite footprint exactly matches the
    // 16x16 collision box and stays visually the same size regardless
    // of which powerup it is (mushroom/flower/star) or Mario's form.
    if (item.type === 'mushroom') {
      // ── TOAD-STYLE MUSHROOM ────────────────────────────────────────
      // Fits in a 16x16 box. Cap = upper 8 rows, stem = lower 8.
      // Stem is a SOLID cream block with little eye dots — no leg
      // split (which used to look like teeth).

      // Cap dome: red radial gradient, semicircle r=7 at (sx+8, iy+7).
      // Light source is top-left, so the gradient origin is up-left and
      // the darker stop lands on the bottom-right side of the dome.
      const mCapGrad = bx.createRadialGradient(sx + 5, iy + 2, 1, sx + 9, iy + 6, 9);
      mCapGrad.addColorStop(0, '#ff98a6');
      mCapGrad.addColorStop(0.45, COL.mushroom);
      mCapGrad.addColorStop(1, '#7a1e28');
      bx.fillStyle = mCapGrad;
      bx.beginPath(); bx.arc(sx + 8, iy + 7, 7, Math.PI, 0); bx.closePath(); bx.fill();

      // Specular highlight on the upper-left of the cap — a soft
      // translucent white arc that gives the dome a glossy sheen.
      bx.save();
      bx.globalAlpha = 0.45;
      bx.fillStyle = '#ffe8ec';
      bx.beginPath(); bx.arc(sx + 5, iy + 4, 2.2, 0, Math.PI * 2); bx.fill();
      bx.restore();

      // Dark rim under the cap. Soft red instead of near-black so the
      // transition to the stem reads as shading, not a hard line.
      bx.fillStyle = '#9a2838';
      bx.fillRect(sx + 1, iy + 7, 14, 1);

      // White cap spots — 3 dots, classic Toad arrangement, each with
      // a faint outer ring so they stand proud of the red cap.
      // Outer rings first (very subtle pink halo):
      bx.fillStyle = '#f8d0d8';
      bx.beginPath(); bx.arc(sx + 8, iy + 3, 2.4, 0, Math.PI * 2); bx.fill();
      bx.beginPath(); bx.arc(sx + 4, iy + 5, 1.8, 0, Math.PI * 2); bx.fill();
      bx.beginPath(); bx.arc(sx + 12, iy + 5, 1.8, 0, Math.PI * 2); bx.fill();
      // White inner spots:
      bx.fillStyle = '#fcfcfc';
      bx.beginPath(); bx.arc(sx + 8, iy + 3, 1.9, 0, Math.PI * 2); bx.fill();
      bx.beginPath(); bx.arc(sx + 4, iy + 5, 1.3, 0, Math.PI * 2); bx.fill();
      bx.beginPath(); bx.arc(sx + 12, iy + 5, 1.3, 0, Math.PI * 2); bx.fill();

      // Stem: solid cream block, pixel-rounded at the bottom corners.
      const stemGrad = bx.createLinearGradient(sx + 3, 0, sx + 13, 0);
      stemGrad.addColorStop(0, '#c8bcd0');
      stemGrad.addColorStop(0.4, '#fcfcfc');
      stemGrad.addColorStop(1, '#b8accc');
      bx.fillStyle = stemGrad;
      bx.fillRect(sx + 3, iy + 8, 10, 7);
      bx.fillRect(sx + 4, iy + 15, 8, 1);

      // Shoulder chamfer under the cap (1px each side pulled in) so
      // the corners tuck into the cap rim.
      bx.fillStyle = '#9a2838';
      bx.fillRect(sx + 2, iy + 8, 1, 1);
      bx.fillRect(sx + 13, iy + 8, 1, 1);

      // Toad eyes (1×3 dots — slightly taller than before so they
      // actually register at this resolution).
      bx.fillStyle = '#1a1a2e';
      bx.fillRect(sx + 5, iy + 11, 1, 3);
      bx.fillRect(sx + 10, iy + 11, 1, 3);
    } else if (item.type === 'flower') {
      // ── FIRE-FLOWER-STYLE POWER FLOWER ─────────────────────────────
      // Concentric petal rings with a white face + eyes (like img3),
      // sitting on a green stem with two leaves. Full sprite tucked
      // inside the 16x16 box.

      const t = Math.floor(Date.now() / 150) % 4;
      // Palette keeps the game's violet/pink/gold rotation but paired
      // as (outer, middle) rings so it reads as a true petal layer.
      const outerCols = ['#8a4fc8', '#e03880', '#d8b038', '#e07040'];
      const midCols   = ['#c0a8e8', '#ff80b0', '#f8e080', '#ffb870'];
      const outer = outerCols[t];
      const mid = midCols[t];

      // Stem (green, narrow)
      bx.fillStyle = '#4a9030';
      bx.fillRect(sx + 7, iy + 9, 2, 6);
      // Stem highlight
      bx.fillStyle = '#7bc058';
      bx.fillRect(sx + 7, iy + 9, 1, 5);

      // Two leaves at the base
      bx.fillStyle = '#4a9030';
      bx.beginPath(); bx.ellipse(sx + 4, iy + 13, 3, 2, -0.3, 0, Math.PI * 2); bx.fill();
      bx.beginPath(); bx.ellipse(sx + 12, iy + 13, 3, 2, 0.3, 0, Math.PI * 2); bx.fill();
      bx.fillStyle = '#7bc058';
      bx.fillRect(sx + 3, iy + 12, 2, 1);
      bx.fillRect(sx + 11, iy + 12, 2, 1);

      // Outer petal ring
      bx.fillStyle = outer;
      bx.beginPath(); bx.arc(sx + 8, iy + 5, 5, 0, Math.PI * 2); bx.fill();
      // Middle petal ring
      bx.fillStyle = mid;
      bx.beginPath(); bx.arc(sx + 8, iy + 5, 3.5, 0, Math.PI * 2); bx.fill();
      // White face
      bx.fillStyle = '#fcfcfc';
      bx.beginPath(); bx.arc(sx + 8, iy + 5, 2.4, 0, Math.PI * 2); bx.fill();
      // Two little black eyes
      bx.fillStyle = '#1a1a2e';
      bx.fillRect(sx + 6, iy + 4, 1, 2);
      bx.fillRect(sx + 9, iy + 4, 1, 2);
    } else if (item.type === 'star') {
      // Star body has a 6px outer radius (down from 7) and glow 7px
      // (down from 10) so the full sprite fits inside 16x16.
      const t = Math.floor(Date.now() / 100) % 3;
      const starCols = ['#e8c850', '#c0a8e8', '#fcfcfc'];
      const scx = sx + 8, scy = iy + 8;
      bx.save();
      bx.globalAlpha = 0.25;
      bx.fillStyle = starCols[t];
      bx.beginPath(); bx.arc(scx, scy, 7, 0, Math.PI * 2); bx.fill();
      bx.restore();
      const sGrad = bx.createRadialGradient(scx - 1, scy - 2, 1, scx, scy, 7);
      sGrad.addColorStop(0, '#fcfcfc');
      sGrad.addColorStop(0.4, starCols[t]);
      sGrad.addColorStop(1, '#806020');
      bx.fillStyle = sGrad;
      bx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5);
        const innerAngle = angle + Math.PI / 5;
        const ox = scx + Math.cos(angle) * 6;
        const oy = scy + Math.sin(angle) * 6;
        const ix = scx + Math.cos(innerAngle) * 2.5;
        const iy2 = scy + Math.sin(innerAngle) * 2.5;
        if (i === 0) bx.moveTo(ox, oy); else bx.lineTo(ox, oy);
        bx.lineTo(ix, iy2);
      }
      bx.closePath();
      bx.fill();
      bx.fillStyle = '#1a1a2e';
      bx.beginPath(); bx.arc(scx - 2, scy - 1, 1, 0, Math.PI * 2); bx.fill();
      bx.beginPath(); bx.arc(scx + 2, scy - 1, 1, 0, Math.PI * 2); bx.fill();
    }
  });
}

// =================================================================
// REMOTE PLAYERS (multiplayer co-presence)
// =================================================================
// Pull a position/animation sample for `renderT` out of a player's
// snapshot ring. Uses CUBIC HERMITE interpolation between the two
// snapshots that bracket renderT, with each snapshot's velocity used
// as the curve's tangent at that endpoint. This gives C1-continuous,
// physically plausible motion (smooth acceleration/deceleration) which
// looks dramatically better than linear lerp at low sample rates —
// perfect for jumps, run starts, and skids.
//
// Falls back to short bounded extrapolation if renderT is past the
// latest snapshot (covers small network hiccups). Returns null when
// no usable data is available.
function _sampleRemoteAt(snaps, renderT) {
  var n = snaps.length;
  if (n === 0) return null;
  if (n === 1) return snaps[0];

  var a = null, b = null;
  for (var i = 0; i < n - 1; i++) {
    if (snaps[i].t <= renderT && snaps[i + 1].t >= renderT) {
      a = snaps[i]; b = snaps[i + 1]; break;
    }
  }
  if (a) {
    // Bit-exact short-circuit: when both bracketing samples are
    // stationary at the same position, the Hermite formula
    // (h00*a.x + h01*b.x) is *algebraically* equal to a.x, but
    // floating-point evaluation drifts by a fraction of a ULP.
    // That sub-pixel noise gets `Math.floor()`-ed for display and
    // occasionally snaps to a different pixel, producing the
    // ~1-px flicker on truly-static remotes that users report.
    // Returning the constant directly bypasses the entire failure
    // mode and guarantees pixel-perfect stillness.
    if (a.x === b.x && a.y === b.y && a.vx === 0 && b.vx === 0 && a.vy === 0 && b.vy === 0) {
      return {
        x: a.x, y: a.y, vx: 0, vy: 0,
        facing: b.facing, anim: b.anim, frame: b.frame,
        size: b.size, star: b.star, dead: b.dead,
      };
    }

    var spanMs = b.t - a.t;
    var u = spanMs > 0 ? (renderT - a.t) / spanMs : 0;
    if (u < 0) u = 0; else if (u > 1) u = 1;

    // Hermite basis functions
    var u2 = u * u, u3 = u2 * u;
    var h00 = 2 * u3 - 3 * u2 + 1;
    var h10 = u3 - 2 * u2 + u;
    var h01 = -2 * u3 + 3 * u2;
    var h11 = u3 - u2;

    // Velocities are in pixels-per-frame at 60fps. Tangent magnitude
    // for Hermite must be in pixels per UNIT (where the unit is the
    // segment span). Convert: px/sec = vx * 60; tangent = px/sec * span
    // in seconds = vx * 60 * spanMs / 1000 = vx * spanMs * 0.06.
    var k = spanMs * 0.06;
    var m0x = a.vx * k, m1x = b.vx * k;
    var m0y = a.vy * k, m1y = b.vy * k;

    return {
      x: h00 * a.x + h10 * m0x + h01 * b.x + h11 * m1x,
      y: h00 * a.y + h10 * m0y + h01 * b.y + h11 * m1y,
      vx: a.vx + (b.vx - a.vx) * u,
      vy: a.vy + (b.vy - a.vy) * u,
      facing: b.facing, anim: b.anim, frame: b.frame,
      size: b.size, star: b.star, dead: b.dead,
    };
  }
  if (renderT < snaps[0].t) return snaps[0];
  // Past latest snapshot — extrapolate using last known velocity, but
  // only briefly. After ~250ms we just freeze on the last sample so a
  // dropped player doesn't visibly slide off into nothing.
  var last = snaps[n - 1];
  var dt = (renderT - last.t) / 1000;
  if (dt > 0.25) return last;
  return {
    x: last.x + last.vx * 60 * dt,
    y: last.y + last.vy * 60 * dt,
    vx: last.vx, vy: last.vy, facing: last.facing, anim: last.anim, frame: last.frame,
    size: last.size, star: last.star, dead: last.dead,
  };
}

// Stable per-id phase so two ghosts standing side-by-side don't breathe
// in lockstep. Cheap string hash, no allocations on hot path.
function _idHash(id) {
  var h = 0;
  for (var i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return (h & 0x7fffffff);
}

function drawRemoteBlobs() {
  if (!multiplayerMode || remoteStates.size === 0) return;

  // Resolve each remote id -> { name, color } from the lobby roster
  // (kept fresh by `room_state`). Players that vanished from the
  // roster (left/disconnected) are skipped and their state purged.
  var info = {};
  for (var i = 0; i < racePlayers.length; i++) {
    var rp = racePlayers[i];
    if (rp && rp.id) info[rp.id] = rp;
  }

  var nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  var renderT = nowMs - REMOTE_INTERP_MS;

  var stale = null;
  remoteStates.forEach(function(rs, id) {
    if (nowMs - (rs.lastUpdate || 0) > REMOTE_AGE_OUT_MS) {
      (stale = stale || []).push(id);
      return;
    }
    var meta = info[id];
    if (!meta) return;
    var s = _sampleRemoteAt(rs.snaps, renderT);
    if (!s) return;
    var screenX = s.x - camera.rx;
    // Cull to the visible viewport plus generous padding so a blob
    // sitting at the screen edge can't briefly clip the cull check
    // (and visibly vanish for a frame) when the camera hops by a pixel.
    if (screenX < -48 || screenX > VIEW_W + 48) return;
    drawGhostBlob(s, meta.color || 'lavender', meta.name || '', _idHash(id));
  });
  if (stale) for (var k = 0; k < stale.length; k++) remoteStates.delete(stale[k]);
}

// Render one remote player. Visually distinct from the local Mario:
// translucent body, a soft dark outline, and a name tag floating
// overhead. The local player keeps its full-fidelity drawMario() pass
// rendered AFTER this, so it always reads as the camera focus.
function drawGhostBlob(s, colorId, name, phaseSeed) {
  var c = getColorOption(colorId);
  var isBig = s.size >= 1;
  var px = Math.floor(s.x - camera.rx);
  var py = Math.floor(s.y);
  var dir = s.facing < 0 ? -1 : 1;

  var bodyR = isBig ? 9.0 : 6.85;
  var cx = px + 7;
  var cy = isBig ? py + 11.5 : py + 7;

  // Animation: mirror the local player's pose vocabulary at a lighter
  // touch — same silhouette language, no fancy easing.
  var sqX = 1.0, sqY = 1.0, bounceY = 0, tilt = 0;

  switch (s.anim) {
    case ANIM_RUN: {
      var sp = 0.20 + Math.min(2.5, Math.abs(s.vx)) * 0.085;
      var t = (globalTick + phaseSeed) * sp;
      var intensity = Math.min(1, Math.abs(s.vx) / 2.5);
      bounceY = Math.sin(t) * (0.85 + intensity * 0.6);
      var sqAmp = 0.05 * intensity;
      sqX = 1.0 + Math.cos(t) * sqAmp;
      sqY = 1.0 - Math.cos(t) * sqAmp;
      break;
    }
    case ANIM_JUMP: { sqX = 0.90; sqY = 1.10; break; }
    case ANIM_FALL: { sqX = 0.93; sqY = 1.07; break; }
    case ANIM_DJUMP: {
      var dt2 = (globalTick + phaseSeed) * 0.4;
      tilt = Math.sin(dt2) * 0.35 * dir;
      sqX = 0.90; sqY = 1.10;
      break;
    }
    case ANIM_DEAD: { sqX = 1.25; sqY = 0.7; break; }
    case ANIM_SKID: { sqX = 1.12; sqY = 0.9; break; }
    case ANIM_CROUCH: {
      sqX = 1.30; sqY = 0.65;
      bounceY = bodyR * (1 - sqY);
      break;
    }
    default: { // IDLE — completely static, mirrors local Mario's
               // standing pose. No breathing, no bounce, no flicker.
      break;
    }
  }

  var bcy = cy + bounceY;
  var rX = bodyR * sqX;
  var rY = bodyR * sqY;

  // Slightly muted version of the player's hat color so ghosts read as
  // "background" while still being identifiable. We DON'T grayscale —
  // friends still need to recognise their own colour at a glance.
  var bodyCol = c.hat;
  var shadCol = c.overalls;
  var feetCol = c.brown;
  var highCol = c.skin;

  bx.save();
  // Whole-blob translucency. Dead players are even more washed out.
  bx.globalAlpha = s.dead ? 0.32 : 0.58;

  if (tilt !== 0) {
    bx.translate(cx, bcy);
    bx.rotate(tilt);
    bx.translate(-cx, -bcy);
  }

  // Soft dark outline (one slightly larger backplate). Keeps the
  // silhouette readable against bright biome skies + busy backgrounds.
  bx.fillStyle = 'rgba(15,10,28,0.55)';
  bx.beginPath();
  bx.ellipse(cx, bcy + 0.5, rX + 1.4, rY + 1.4, 0, 0, Math.PI * 2);
  bx.fill();

  // Body shade pass (drop)
  bx.fillStyle = shadCol;
  bx.beginPath();
  bx.ellipse(cx - 1, bcy + 0.5, rX + 0.6, rY + 0.6, 0, 0, Math.PI * 2);
  bx.fill();

  // Body main fill — radial gradient mirroring the local Mario look.
  var bodyGrad = bx.createRadialGradient(
    cx + rX * 0.22, bcy - rY * 0.2, rX * 0.08,
    cx - rX * 0.08, bcy + rY * 0.08, rX * 1.05
  );
  bodyGrad.addColorStop(0, highCol);
  bodyGrad.addColorStop(0.45, bodyCol);
  bodyGrad.addColorStop(1, shadCol);
  bx.fillStyle = bodyGrad;
  bx.beginPath();
  bx.ellipse(cx + 0.3, bcy, rX, rY, 0, 0, Math.PI * 2);
  bx.fill();

  // Specular highlight
  bx.globalAlpha *= 0.6;
  bx.fillStyle = '#fcfcfc';
  bx.beginPath();
  bx.ellipse(cx + rX * 0.22, bcy - rY * 0.32, rX * 0.32, rY * 0.2, -0.4, 0, Math.PI * 2);
  bx.fill();
  bx.globalAlpha = s.dead ? 0.32 : 0.58;

  // Eyes / face
  var eyeScale = isBig ? 1.4 : 1.0;
  var eyeOff = dir * 1.1;
  var eyeY = bcy - rY * 0.18;
  var e1x = cx + eyeOff - 0.5;
  var e2x = cx + eyeOff + 3.0 * eyeScale;
  var eyeR = 2.6 * eyeScale;

  if (s.anim === ANIM_DEAD) {
    bx.strokeStyle = '#202030';
    bx.lineWidth = 1.0;
    bx.lineCap = 'round';
    var xr = 1.8;
    [e1x, e2x].forEach(function(ex) {
      bx.beginPath();
      bx.moveTo(ex - xr, eyeY - xr); bx.lineTo(ex + xr, eyeY + xr);
      bx.moveTo(ex + xr, eyeY - xr); bx.lineTo(ex - xr, eyeY + xr);
      bx.stroke();
    });
    bx.lineCap = 'butt';
  } else {
    bx.fillStyle = '#fcfcfc';
    bx.beginPath(); bx.arc(e1x, eyeY, eyeR, 0, Math.PI * 2); bx.fill();
    bx.beginPath(); bx.arc(e2x, eyeY, eyeR, 0, Math.PI * 2); bx.fill();
    bx.fillStyle = '#101020';
    var pupOff = dir * 0.6;
    var pupR = 1.2 * eyeScale;
    bx.beginPath(); bx.arc(e1x + pupOff, eyeY + 0.3, pupR, 0, Math.PI * 2); bx.fill();
    bx.beginPath(); bx.arc(e2x + pupOff, eyeY + 0.3, pupR, 0, Math.PI * 2); bx.fill();
  }

  // Feet
  var footW = isBig ? 3.6 : 2.7;
  var footH = isBig ? 2.4 : 1.7;
  var feetY = bcy + rY;

  var inAir = (s.anim === ANIM_JUMP || s.anim === ANIM_FALL || s.anim === ANIM_DJUMP);
  var f1x = cx - rX * (inAir ? 0.30 : 0.5);
  var f2x = cx + rX * (inAir ? 0.30 : 0.5);
  if (s.anim === ANIM_RUN) {
    // Alternate stepping using the same phase as the body bob.
    var rt = (globalTick + phaseSeed) * (0.20 + Math.min(2.5, Math.abs(s.vx)) * 0.085);
    var step = Math.sin(rt);
    f1x -= step * 1.3;
    f2x += step * 1.3;
  } else if (s.anim === ANIM_SKID) {
    var d2 = -dir;
    f1x += d2 * 1.5; f2x += d2 * 1.5;
  }

  bx.fillStyle = feetCol;
  bx.beginPath(); bx.ellipse(f1x, feetY, footW, footH, -0.2, 0, Math.PI * 2); bx.fill();
  bx.beginPath(); bx.ellipse(f2x, feetY, footW, footH,  0.2, 0, Math.PI * 2); bx.fill();

  bx.restore();

  // Name tag in micro 3x5 font, floating above the head. Compact so
  // the label never overpowers the blob silhouette. Drawn at full
  // opacity so labels stay legible even when the body is faded.
  if (name) {
    var label = truncateName(name, 12).toUpperCase();
    if (s.star) label += '*';
    var labelW = label.length * 4 - 1; // 4px advance, no trailing gap
    var labelX = Math.round(cx - labelW / 2);
    var labelY = Math.round(bcy - rY - (isBig ? 11 : 9));
    bx.save();
    // Slim 1px-padded chip — just a hairline behind the text so it
    // stays readable without dominating the blob.
    bx.fillStyle = 'rgba(7,6,12,0.72)';
    bx.fillRect(labelX - 1, labelY - 1, labelW + 2, 7);
    drawTinyText(bx, label, labelX, labelY, getPlayerDisplayColor(colorId), null);
    bx.restore();
  }
}

function drawParticles() {
  particles.forEach(p => {
    if (p.type === 'debris') {
      const dsx = Math.floor(p.x - camera.rx);
      const dsy = Math.floor(p.y);
      const dGrad = bx.createLinearGradient(0, dsy, 0, dsy + 6);
      dGrad.addColorStop(0, COL.brick);
      dGrad.addColorStop(1, COL.brickLine);
      bx.fillStyle = dGrad;
      bx.beginPath();
      bx.arc(dsx + 3, dsy + 3, 3, 0, Math.PI * 2);
      bx.fill();
    }
  });

  coinAnims.forEach(c => {
    const csx = Math.floor(c.x - camera.rx);
    const csy = Math.floor(c.y);
    var spinW = Math.abs(Math.cos(c.life * 0.3)) * 3 + 0.5;
    var fadeAlpha = Math.min(1, c.life / 8);
    const coinGrad = bx.createRadialGradient(csx + 3, csy + 3, 1, csx + 4, csy + 4, 5);
    coinGrad.addColorStop(0, '#fcf0a0');
    coinGrad.addColorStop(0.5, COL.coin);
    coinGrad.addColorStop(1, '#a08020');
    bx.save();
    bx.globalAlpha = fadeAlpha;
    bx.fillStyle = coinGrad;
    bx.beginPath();
    bx.ellipse(csx + 4, csy + 4, spinW, 4, 0, 0, Math.PI * 2);
    bx.fill();
    bx.globalAlpha = fadeAlpha * 0.5;
    bx.fillStyle = '#fcfcfc';
    bx.beginPath();
    bx.ellipse(csx + 3, csy + 3, spinW * 0.35, 1.5, 0, 0, Math.PI * 2);
    bx.fill();
    bx.restore();
  });

  scorePopups.forEach(p => {
    const sx = Math.floor(p.x - camera.rx);
    var popAlpha = Math.min(1, p.life / 15);
    bx.save();
    bx.globalAlpha = popAlpha;
    drawPixelText(bx, p.text, sx, Math.floor(p.y), '#fff', '#000');
    bx.restore();
  });

  dustParticles.forEach(d => {
    const dsx = Math.floor(d.x - camera.rx);
    var maxLife = d.maxLife || 10;
    var t = 1 - d.life / maxLife;
    var rad = Math.max(0.1, d.sparkle ? (0.8 + t * 0.8) : (1.2 + t * 1.5));
    var alpha = (1 - t * t) * (d.sparkle ? 0.8 : 0.55);
    bx.save();
    bx.globalAlpha = alpha;
    bx.fillStyle = d.color || (d.sparkle ? '#fcf0a0' : '#d8c8f0');
    bx.beginPath();
    bx.arc(dsx + 1, Math.floor(d.y) + 1, rad, 0, Math.PI * 2);
    bx.fill();
    bx.restore();
  });
}

function drawBoss() {
  if (!boss || boss.hidden) return;
  const sx = Math.floor(boss.x - camera.rx);
  if (sx < -48 || sx > VIEW_W + 48) return;
  const sy = Math.floor(boss.y);
  var dir = boss.vx > 0 ? 1 : -1;

  var hurtFlash = boss.invincible > 0 && (boss.invincible & 2);
  var rage = boss.hp <= 2;
  var breathe = Math.sin(globalTick * (rage ? 0.15 : 0.08));

  var bodyW = 14 + breathe * 0.8;
  var bodyH = 16 + breathe * 0.5;
  var cx = sx + boss.w / 2;
  var cy = sy + boss.h - bodyH;

  if (boss.dying) {
    var dt = boss.deathTimer / 120;
    bx.save();
    bx.globalAlpha = 1 - dt;
    bx.translate(cx, cy + bodyH * 0.5);
    bx.rotate(dt * Math.PI * 4 * dir);
    bx.translate(-cx, -(cy + bodyH * 0.5));
  }

  if (hurtFlash && !boss.dying) {
    bx.save();
    bx.globalAlpha = 0.3;
  }

  // Slam glow when airborne and about to slam
  if (boss.slamming && !boss.onGround && boss.vy > 0) {
    bx.save();
    var slamPulse = 0.4 + Math.sin(globalTick * 0.6) * 0.15;
    var slamGrad = bx.createRadialGradient(cx, cy + bodyH * 0.4, bodyW * 0.3, cx, cy + bodyH * 0.4, bodyW + 8);
    slamGrad.addColorStop(0, 'rgba(255,100,200,' + slamPulse + ')');
    slamGrad.addColorStop(0.5, 'rgba(180,40,140,' + (slamPulse * 0.5) + ')');
    slamGrad.addColorStop(1, 'rgba(100,20,80,0)');
    bx.fillStyle = slamGrad;
    bx.beginPath();
    bx.ellipse(cx, cy + bodyH * 0.4, bodyW + 8, bodyH * 0.7 + 6, 0, 0, Math.PI * 2);
    bx.fill();
    bx.restore();
  }

  // Shadow on ground
  bx.save();
  bx.globalAlpha = 0.25;
  bx.fillStyle = '#1a0a2a';
  bx.beginPath();
  bx.ellipse(cx, sy + boss.h + 1, bodyW * 0.9, 3, 0, 0, Math.PI * 2);
  bx.fill();
  bx.restore();

  // Dark aura
  if (rage) {
    bx.save();
    var auraR = bodyW + 4 + Math.sin(globalTick * 0.2) * 2;
    var auraGrad = bx.createRadialGradient(cx, cy + bodyH * 0.4, bodyW * 0.5, cx, cy + bodyH * 0.4, auraR);
    auraGrad.addColorStop(0, 'rgba(80,20,40,0)');
    auraGrad.addColorStop(0.6, 'rgba(120,30,50,0.15)');
    auraGrad.addColorStop(1, 'rgba(60,10,30,0)');
    bx.fillStyle = auraGrad;
    bx.beginPath();
    bx.ellipse(cx, cy + bodyH * 0.4, auraR, auraR * 0.8, 0, 0, Math.PI * 2);
    bx.fill();
    bx.restore();
  }

  // === CAPE (draped from shoulders to feet) ===
  var capeDir = -dir;
  var feetY = sy + boss.h;
  var shoulderLx = cx - bodyW * 0.55;
  var shoulderRx = cx + bodyW * 0.55;
  var shoulderY = cy + bodyH * 0.12;
  var capeBottomY = feetY + 1;
  var sway = Math.sin(globalTick * 0.07) * 1.5;

  bx.save();
  var capeGrad = bx.createLinearGradient(cx, shoulderY, cx + capeDir * 4, capeBottomY);
  capeGrad.addColorStop(0, rage ? '#802040' : '#4a1870');
  capeGrad.addColorStop(0.4, rage ? '#601028' : '#321050');
  capeGrad.addColorStop(1, rage ? '#480818' : '#220838');
  bx.fillStyle = capeGrad;
  bx.beginPath();
  bx.moveTo(shoulderLx, shoulderY);
  bx.lineTo(shoulderRx, shoulderY);
  bx.quadraticCurveTo(
    shoulderRx + capeDir * 2 + sway, shoulderY + (capeBottomY - shoulderY) * 0.5,
    cx + bodyW * 0.45 + sway, capeBottomY
  );
  bx.lineTo(cx - bodyW * 0.45 + sway, capeBottomY);
  bx.quadraticCurveTo(
    shoulderLx + capeDir * 2 + sway, shoulderY + (capeBottomY - shoulderY) * 0.5,
    shoulderLx, shoulderY
  );
  bx.closePath();
  bx.fill();

  bx.globalAlpha = 0.12;
  bx.fillStyle = rage ? '#ff8090' : '#9878c8';
  bx.beginPath();
  bx.moveTo(cx - bodyW * 0.2, shoulderY + 2);
  bx.quadraticCurveTo(cx + capeDir * 3, shoulderY + (capeBottomY - shoulderY) * 0.4, cx, capeBottomY - 2);
  bx.lineTo(cx - bodyW * 0.1, shoulderY + 4);
  bx.closePath();
  bx.fill();
  bx.restore();

  // Gold clasp at neck
  bx.save();
  bx.strokeStyle = '#c8a030';
  bx.lineWidth = 1.5;
  bx.beginPath();
  bx.moveTo(shoulderLx + 1, shoulderY);
  bx.lineTo(shoulderRx - 1, shoulderY);
  bx.stroke();
  bx.restore();

  // Body shadow
  var shadGrad = bx.createRadialGradient(cx - 2, cy + bodyH * 0.3, 1, cx, cy + bodyH * 0.4, bodyW * 1.1);
  shadGrad.addColorStop(0, '#4a2068');
  shadGrad.addColorStop(1, '#1a0a28');
  bx.fillStyle = shadGrad;
  bx.beginPath();
  bx.ellipse(cx - 0.5, cy + bodyH * 0.4, bodyW + 1, bodyH * 0.55 + 1, 0, 0, Math.PI * 2);
  bx.fill();

  // Main body
  var bodyGrad = bx.createRadialGradient(cx + 2, cy + bodyH * 0.2, bodyW * 0.1, cx - 1, cy + bodyH * 0.45, bodyW * 1.05);
  bodyGrad.addColorStop(0, rage ? '#8040a0' : '#6848a8');
  bodyGrad.addColorStop(0.5, rage ? '#502060' : '#3c2870');
  bodyGrad.addColorStop(1, '#1a0a30');
  bx.fillStyle = bodyGrad;
  bx.beginPath();
  bx.ellipse(cx, cy + bodyH * 0.4, bodyW, bodyH * 0.55, 0, 0, Math.PI * 2);
  bx.fill();

  // === GOLD ARMOR PLATE ===
  var armorCy = cy + bodyH * 0.4;
  var armorW = bodyW * 0.7;
  var armorH = bodyH * 0.35;
  var armorGrad = bx.createLinearGradient(cx - armorW, armorCy - armorH, cx + armorW * 0.5, armorCy + armorH);
  armorGrad.addColorStop(0, rage ? '#c87828' : '#d4a840');
  armorGrad.addColorStop(0.3, rage ? '#e8a040' : '#f0d068');
  armorGrad.addColorStop(0.5, rage ? '#ffc850' : '#fcf0a0');
  armorGrad.addColorStop(0.7, rage ? '#c87828' : '#d4a840');
  armorGrad.addColorStop(1, rage ? '#804010' : '#a07828');
  bx.fillStyle = armorGrad;
  bx.beginPath();
  bx.ellipse(cx + dir * 1.5, armorCy, armorW, armorH, 0, Math.PI * 0.15, Math.PI * 0.85);
  bx.closePath();
  bx.fill();

  // Armor edge/rim
  bx.strokeStyle = rage ? '#a06020' : '#b08830';
  bx.lineWidth = 0.8;
  bx.beginPath();
  bx.ellipse(cx + dir * 1.5, armorCy, armorW, armorH, 0, Math.PI * 0.15, Math.PI * 0.85);
  bx.stroke();

  // Armor highlight
  bx.save();
  bx.globalAlpha = 0.35;
  bx.fillStyle = '#fff8e0';
  bx.beginPath();
  bx.ellipse(cx + dir * 1.5 + 2, armorCy - armorH * 0.2, armorW * 0.35, armorH * 0.25, -0.3, 0, Math.PI * 2);
  bx.fill();
  bx.restore();

  // Center gem on armor
  var gemX = cx + dir * 1.5;
  var gemY = armorCy + armorH * 0.15;
  var gemGrad = bx.createRadialGradient(gemX - 0.5, gemY - 0.5, 0.2, gemX, gemY, 2.2);
  gemGrad.addColorStop(0, '#fff');
  gemGrad.addColorStop(0.3, rage ? '#ff4060' : '#60e0a0');
  gemGrad.addColorStop(1, rage ? '#801020' : '#206040');
  bx.fillStyle = gemGrad;
  bx.beginPath();
  bx.arc(gemX, gemY, 2, 0, Math.PI * 2);
  bx.fill();

  // === SHOULDER GUARDS ===
  var shX1 = cx - bodyW * 0.75;
  var shX2 = cx + bodyW * 0.75;
  var shY = cy + bodyH * 0.22;
  for (var shi = 0; shi < 2; shi++) {
    var shX = shi === 0 ? shX1 : shX2;
    var shGrad = bx.createRadialGradient(shX, shY - 1, 0.5, shX, shY + 1, 4.5);
    shGrad.addColorStop(0, rage ? '#ffc040' : '#f0d868');
    shGrad.addColorStop(0.6, rage ? '#c87828' : '#c8a030');
    shGrad.addColorStop(1, rage ? '#804018' : '#806020');
    bx.fillStyle = shGrad;
    bx.beginPath();
    bx.ellipse(shX, shY, 4, 3, 0, 0, Math.PI * 2);
    bx.fill();
    bx.save();
    bx.globalAlpha = 0.4;
    bx.fillStyle = '#fff8d0';
    bx.beginPath();
    bx.arc(shX - 0.8, shY - 1, 1, 0, Math.PI * 2);
    bx.fill();
    bx.restore();
  }

  // Body highlight (over armor edges)
  bx.save();
  bx.globalAlpha = 0.12;
  bx.fillStyle = '#c0a0e0';
  bx.beginPath();
  bx.ellipse(cx + bodyW * 0.15, cy + bodyH * 0.15, bodyW * 0.4, bodyH * 0.2, -0.3, 0, Math.PI * 2);
  bx.fill();
  bx.restore();

  // === CROWN (enhanced spikes) ===
  var spikeCol = rage ? '#ffc040' : '#f0d060';
  var spikeDark = rage ? '#a07020' : '#b09030';
  var spikeLight = rage ? '#ffe880' : '#fcf8b0';
  for (var si = 0; si < 5; si++) {
    var sa = -0.7 + si * 0.35;
    var spx = cx + Math.sin(sa) * bodyW * 0.7;
    var spy = cy + bodyH * 0.4 - Math.cos(sa) * bodyH * 0.5;
    var spikeH = 6 + (si === 2 ? 4 : si % 2 === 0 ? 1 : 0) + breathe * 0.5;
    bx.fillStyle = spikeDark;
    bx.beginPath();
    bx.moveTo(spx - 2.8, spy + 1);
    bx.lineTo(spx, spy - spikeH);
    bx.lineTo(spx + 2.8, spy + 1);
    bx.closePath();
    bx.fill();
    bx.fillStyle = spikeCol;
    bx.beginPath();
    bx.moveTo(spx - 2.2, spy);
    bx.lineTo(spx, spy - spikeH + 1);
    bx.lineTo(spx + 2.2, spy);
    bx.closePath();
    bx.fill();
    bx.save();
    bx.globalAlpha = 0.3;
    bx.fillStyle = spikeLight;
    bx.beginPath();
    bx.moveTo(spx - 0.8, spy);
    bx.lineTo(spx, spy - spikeH + 2);
    bx.lineTo(spx + 0.5, spy);
    bx.closePath();
    bx.fill();
    bx.restore();
    if (si === 2) {
      var tipGem = bx.createRadialGradient(spx, spy - spikeH + 1, 0.2, spx, spy - spikeH + 1, 1.5);
      tipGem.addColorStop(0, '#fff');
      tipGem.addColorStop(0.4, rage ? '#ff5060' : '#80f0c0');
      tipGem.addColorStop(1, rage ? '#a02030' : '#308060');
      bx.fillStyle = tipGem;
      bx.beginPath();
      bx.arc(spx, spy - spikeH + 1.5, 1.3, 0, Math.PI * 2);
      bx.fill();
    }
  }
  // Crown band connecting spikes
  bx.save();
  bx.strokeStyle = spikeCol;
  bx.lineWidth = 1.5;
  bx.beginPath();
  bx.arc(cx, cy + bodyH * 0.4, bodyW * 0.72, -Math.PI * 0.82, -Math.PI * 0.18);
  bx.stroke();
  bx.strokeStyle = spikeDark;
  bx.lineWidth = 0.6;
  bx.beginPath();
  bx.arc(cx, cy + bodyH * 0.4, bodyW * 0.72 + 1.2, -Math.PI * 0.82, -Math.PI * 0.18);
  bx.stroke();
  bx.restore();

  // Eyes
  var eyeSpread = 4.5;
  var eyeY = cy + bodyH * 0.3;
  var eyeOff = dir * 1.5;

  // Eye sockets (dark)
  bx.fillStyle = '#0a0418';
  bx.beginPath();
  bx.ellipse(cx - eyeSpread + eyeOff, eyeY, 4, 3.5, 0, 0, Math.PI * 2);
  bx.fill();
  bx.beginPath();
  bx.ellipse(cx + eyeSpread + eyeOff, eyeY, 4, 3.5, 0, 0, Math.PI * 2);
  bx.fill();

  // Eye glow
  var eyeCol = rage ? '#ff3050' : '#e8c850';
  var eyeGlow = rage ? '#ff8070' : '#fcf0a0';
  bx.save();
  bx.globalAlpha = 0.4 + breathe * 0.15;
  bx.fillStyle = eyeCol;
  bx.beginPath();
  bx.ellipse(cx - eyeSpread + eyeOff, eyeY, 5.5, 4.5, 0, 0, Math.PI * 2);
  bx.fill();
  bx.beginPath();
  bx.ellipse(cx + eyeSpread + eyeOff, eyeY, 5.5, 4.5, 0, 0, Math.PI * 2);
  bx.fill();
  bx.restore();

  // Eye iris
  var irisGrad1 = bx.createRadialGradient(cx - eyeSpread + eyeOff, eyeY, 0.5, cx - eyeSpread + eyeOff, eyeY, 3.5);
  irisGrad1.addColorStop(0, eyeGlow);
  irisGrad1.addColorStop(0.5, eyeCol);
  irisGrad1.addColorStop(1, rage ? '#a01030' : '#a08020');
  bx.fillStyle = irisGrad1;
  bx.beginPath();
  bx.ellipse(cx - eyeSpread + eyeOff, eyeY, 3.2, 2.8, 0, 0, Math.PI * 2);
  bx.fill();

  var irisGrad2 = bx.createRadialGradient(cx + eyeSpread + eyeOff, eyeY, 0.5, cx + eyeSpread + eyeOff, eyeY, 3.5);
  irisGrad2.addColorStop(0, eyeGlow);
  irisGrad2.addColorStop(0.5, eyeCol);
  irisGrad2.addColorStop(1, rage ? '#a01030' : '#a08020');
  bx.fillStyle = irisGrad2;
  bx.beginPath();
  bx.ellipse(cx + eyeSpread + eyeOff, eyeY, 3.2, 2.8, 0, 0, Math.PI * 2);
  bx.fill();

  // Pupils (slit for scariness)
  bx.fillStyle = '#0a0418';
  bx.beginPath();
  bx.ellipse(cx - eyeSpread + eyeOff + dir * 0.5, eyeY, 1, 2.2, 0, 0, Math.PI * 2);
  bx.fill();
  bx.beginPath();
  bx.ellipse(cx + eyeSpread + eyeOff + dir * 0.5, eyeY, 1, 2.2, 0, 0, Math.PI * 2);
  bx.fill();

  // Eye shine
  bx.save();
  bx.globalAlpha = 0.7;
  bx.fillStyle = '#fff';
  bx.beginPath();
  bx.arc(cx - eyeSpread + eyeOff - 1, eyeY - 1.2, 0.8, 0, Math.PI * 2);
  bx.fill();
  bx.beginPath();
  bx.arc(cx + eyeSpread + eyeOff - 1, eyeY - 1.2, 0.8, 0, Math.PI * 2);
  bx.fill();
  bx.restore();

  // Mouth / fangs
  var mouthY = cy + bodyH * 0.58;
  var mouthW = rage ? 7 : 5;
  bx.fillStyle = '#0a0418';
  bx.beginPath();
  bx.ellipse(cx + eyeOff, mouthY, mouthW, 2.5 + breathe * 0.5, 0, 0, Math.PI);
  bx.fill();

  // Fangs
  bx.fillStyle = '#e0d0f0';
  bx.beginPath();
  bx.moveTo(cx + eyeOff - mouthW * 0.65, mouthY - 0.5);
  bx.lineTo(cx + eyeOff - mouthW * 0.65 + 1.2, mouthY + 2.5);
  bx.lineTo(cx + eyeOff - mouthW * 0.65 + 2.4, mouthY - 0.5);
  bx.closePath();
  bx.fill();
  bx.beginPath();
  bx.moveTo(cx + eyeOff + mouthW * 0.65 - 2.4, mouthY - 0.5);
  bx.lineTo(cx + eyeOff + mouthW * 0.65 - 1.2, mouthY + 2.5);
  bx.lineTo(cx + eyeOff + mouthW * 0.65, mouthY - 0.5);
  bx.closePath();
  bx.fill();

  // Feet
  var feetY = sy + boss.h;
  var footR = 4;
  var feetSpread = bodyW * 0.5;
  var walkPhase = Math.sin(globalTick * 0.12) * 2 * (Math.abs(boss.vx) > 0.1 ? 1 : 0);

  var fGrad1 = bx.createRadialGradient(cx - feetSpread, feetY - 1, 0, cx - feetSpread, feetY, footR);
  fGrad1.addColorStop(0, rage ? '#602048' : '#3c2870');
  fGrad1.addColorStop(1, '#1a0a28');
  bx.fillStyle = fGrad1;
  bx.beginPath();
  bx.ellipse(cx - feetSpread + walkPhase, feetY - 0.5, footR, footR * 0.55, 0, 0, Math.PI * 2);
  bx.fill();

  var fGrad2 = bx.createRadialGradient(cx + feetSpread, feetY - 1, 0, cx + feetSpread, feetY, footR);
  fGrad2.addColorStop(0, rage ? '#602048' : '#3c2870');
  fGrad2.addColorStop(1, '#1a0a28');
  bx.fillStyle = fGrad2;
  bx.beginPath();
  bx.ellipse(cx + feetSpread - walkPhase, feetY - 0.5, footR, footR * 0.55, 0, 0, Math.PI * 2);
  bx.fill();

  if (hurtFlash && !boss.dying) {
    bx.restore();
  }
  if (boss.dying) {
    bx.restore();
  }

  // Dash telegraph glow (phase 1: winding up)
  if (boss.dashPhase === 1) {
    bx.save();
    var telPulse = 0.3 + Math.sin(globalTick * 0.8) * 0.2;
    bx.globalAlpha = telPulse;
    bx.fillStyle = '#ff6040';
    bx.beginPath();
    bx.ellipse(cx + boss.dashDir * 6, cy + bodyH * 0.4, bodyW + 5, bodyH * 0.5 + 3, 0, 0, Math.PI * 2);
    bx.fill();
    bx.restore();
  }

  // Dash speed lines (phase 2: charging)
  if (boss.dashPhase === 2) {
    bx.save();
    bx.globalAlpha = 0.4;
    bx.strokeStyle = '#ff8060';
    bx.lineWidth = 1.5;
    for (var sl = 0; sl < 4; sl++) {
      var slY = cy + bodyH * (0.1 + sl * 0.25);
      var slX = cx - boss.dashDir * (bodyW + 4 + sl * 3);
      bx.beginPath();
      bx.moveTo(slX, slY);
      bx.lineTo(slX - boss.dashDir * (8 + Math.random() * 6), slY);
      bx.stroke();
    }
    bx.restore();
  }

  // Melee swipe arc
  if (boss.meleeAnim > 0) {
    bx.save();
    var swipeT = 1 - boss.meleeAnim / 15;
    var swipeDir = mario.x < boss.x ? -1 : 1;
    var swipeAngle = swipeT * Math.PI * 0.8;
    var swipeR = bodyW + 8;
    bx.globalAlpha = (1 - swipeT) * 0.6;
    bx.strokeStyle = '#e0a0ff';
    bx.lineWidth = 3 - swipeT * 2;
    bx.lineCap = 'round';
    bx.beginPath();
    var arcStart = swipeDir > 0 ? -Math.PI * 0.6 : Math.PI * 0.6 - swipeAngle;
    var arcEnd = swipeDir > 0 ? -Math.PI * 0.6 + swipeAngle : Math.PI * 0.6;
    bx.arc(cx + swipeDir * 4, cy + bodyH * 0.3, swipeR, arcStart, arcEnd);
    bx.stroke();
    bx.restore();
  }

  // HP bar
  var barW = 30;
  var barY = sy - 10;
  var barH = 4;
  bx.fillStyle = 'rgba(0,0,0,0.6)';
  bx.beginPath();
  bx.roundRect(cx - barW / 2 - 1, barY - 0.5, barW + 2, barH + 1, 2);
  bx.fill();
  bx.fillStyle = '#1a0a20';
  bx.beginPath();
  bx.roundRect(cx - barW / 2, barY, barW, barH, 1.5);
  bx.fill();
  var hpFrac = Math.ceil(barW * boss.hp / 3);
  var hpCol = boss.hp <= 1 ? '#ff3050' : boss.hp <= 2 ? '#e8a030' : '#50c878';
  var hpColL = boss.hp <= 1 ? '#ff8090' : boss.hp <= 2 ? '#fcd060' : '#80e8a0';
  var hpGrad = bx.createLinearGradient(0, barY, 0, barY + barH);
  hpGrad.addColorStop(0, hpColL);
  hpGrad.addColorStop(1, hpCol);
  bx.fillStyle = hpGrad;
  bx.beginPath();
  bx.roundRect(cx - barW / 2, barY, hpFrac, barH, 1.5);
  bx.fill();
  if (boss.hp <= 1 && Math.sin(globalTick * 0.3) > 0) {
    bx.save();
    bx.globalAlpha = 0.4;
    bx.fillStyle = '#ff3050';
    bx.beginPath();
    bx.roundRect(cx - barW / 2, barY, hpFrac, barH, 1.5);
    bx.fill();
    bx.restore();
  }
  for (var ni = 1; ni < 3; ni++) {
    var notchX = cx - barW / 2 + Math.round(barW * ni / 3);
    bx.fillStyle = 'rgba(0,0,0,0.35)';
    bx.fillRect(notchX, barY, 1, barH);
  }
  var shinePos = ((globalTick * 0.8) % (barW + 12)) - 6;
  if (boss.hp > 0) {
    bx.save();
    bx.beginPath();
    bx.roundRect(cx - barW / 2, barY, hpFrac, barH, 1.5);
    bx.clip();
    var shineX = cx - barW / 2 + shinePos;
    var shGrad = bx.createLinearGradient(shineX - 3, 0, shineX + 3, 0);
    shGrad.addColorStop(0, 'rgba(255,255,255,0)');
    shGrad.addColorStop(0.5, 'rgba(255,255,255,0.25)');
    shGrad.addColorStop(1, 'rgba(255,255,255,0)');
    bx.fillStyle = shGrad;
    bx.fillRect(shineX - 3, barY, 6, barH);
    bx.restore();
  }
}

function drawBossFireballs() {
  bossFireballs.forEach(f => {
    const bfsx = Math.floor(f.x - camera.rx);
    if (bfsx < -16 || bfsx > VIEW_W + 16) return;
    const bfy = Math.floor(f.y);
    const bfcx = bfsx + 4, bfcy = bfy + 4;
    var pulse = Math.sin(globalTick * 0.4 + f.x * 0.1) * 1.5;

    bx.save();
    bx.globalAlpha = 0.2;
    bx.fillStyle = '#c040a0';
    bx.beginPath();
    bx.arc(bfcx, bfcy, 9 + pulse, 0, Math.PI * 2);
    bx.fill();
    bx.restore();

    bx.save();
    bx.globalAlpha = 0.35;
    bx.fillStyle = '#ff5040';
    bx.beginPath();
    bx.arc(bfcx, bfcy, 6.5 + pulse * 0.5, 0, Math.PI * 2);
    bx.fill();
    bx.restore();

    const bfGrad = bx.createRadialGradient(bfcx - 1, bfcy - 1, 0.5, bfcx, bfcy, 5);
    bfGrad.addColorStop(0, '#fcf0c0');
    bfGrad.addColorStop(0.3, '#ff7050');
    bfGrad.addColorStop(0.7, '#c03060');
    bfGrad.addColorStop(1, '#601030');
    bx.fillStyle = bfGrad;
    bx.beginPath();
    bx.arc(bfcx, bfcy, 4.5, 0, Math.PI * 2);
    bx.fill();

    bx.save();
    bx.globalAlpha = 0.7;
    bx.fillStyle = '#fff';
    bx.beginPath();
    bx.arc(bfcx - 1, bfcy - 1, 1.2, 0, Math.PI * 2);
    bx.fill();
    bx.restore();
  });
}

function drawBossShockwaves() {
  bossShockwaves.forEach(w => {
    const wx = Math.floor(w.x - camera.rx);
    const wy = Math.floor(w.y);
    if (wx < -20 || wx > VIEW_W + 20) return;
    const t = w.life / w.maxLife;
    const waveH = 14 * t;
    const waveW = 6 + 4 * (1 - t);

    bx.save();
    bx.globalAlpha = t * 0.35;
    bx.fillStyle = '#a040c0';
    bx.beginPath();
    bx.ellipse(wx, wy - waveH * 0.3, waveW + 3, waveH + 4, 0, 0, Math.PI * 2);
    bx.fill();
    bx.restore();

    const wGrad = bx.createRadialGradient(wx, wy - waveH * 0.4, 1, wx, wy - waveH * 0.3, waveW + 1);
    wGrad.addColorStop(0, '#fcf0ff');
    wGrad.addColorStop(0.3, '#d070e0');
    wGrad.addColorStop(0.7, '#8030a0');
    wGrad.addColorStop(1, 'rgba(80,20,100,0)');
    bx.save();
    bx.globalAlpha = t * 0.8;
    bx.fillStyle = wGrad;
    bx.beginPath();
    bx.ellipse(wx, wy - waveH * 0.3, waveW, waveH, 0, 0, Math.PI * 2);
    bx.fill();
    bx.restore();

    bx.save();
    bx.globalAlpha = t * 0.5;
    bx.fillStyle = '#fff';
    bx.beginPath();
    bx.ellipse(wx, wy - waveH * 0.5, waveW * 0.4, waveH * 0.3, 0, 0, Math.PI * 2);
    bx.fill();
    bx.restore();
  });
}

function drawMarioFireballs() {
  marioFireballs.forEach(fb => {
    const fbsx = Math.floor(fb.x - camera.rx);
    if (fbsx < -16 || fbsx > VIEW_W + 16) return;
    const fby = Math.floor(fb.y);
    const fbcx = fbsx + 4, fbcy = fby + 4;
    var fbSpin = globalTick * 0.4;
    bx.save();
    bx.globalAlpha = 0.3;
    bx.fillStyle = '#c0a8e8';
    bx.beginPath();
    bx.arc(fbcx, fbcy, 6, 0, Math.PI * 2);
    bx.fill();
    bx.restore();
    var fbPhase = Math.floor(globalTick / 2) % 3;
    var fbCols = [['#fcfcfc','#e0d0f8','#a888d0'],['#fff0c0','#f0c080','#c08040'],['#ffd0e0','#e0a0c0','#a06090']];
    var fbc = fbCols[fbPhase];
    const fbGrad = bx.createRadialGradient(fbcx - 1, fbcy - 1, 0.5, fbcx, fbcy, 4);
    fbGrad.addColorStop(0, fbc[0]);
    fbGrad.addColorStop(0.4, fbc[1]);
    fbGrad.addColorStop(1, fbc[2]);
    bx.fillStyle = fbGrad;
    bx.beginPath();
    bx.arc(fbcx, fbcy, 3.5, 0, Math.PI * 2);
    bx.fill();
    bx.save();
    bx.globalAlpha = 0.5;
    bx.fillStyle = '#fcfcfc';
    var spkX = fbcx + Math.cos(fbSpin) * 2;
    var spkY = fbcy + Math.sin(fbSpin) * 2;
    bx.beginPath();
    bx.arc(spkX, spkY, 1, 0, Math.PI * 2);
    bx.fill();
    bx.restore();
  });
}

function drawBossArenaWall(tileX, fromRow, toRow) {
  const gx = Math.floor(tileX * TILE - camera.rx);
  if (gx < -TILE || gx > VIEW_W + TILE) return;
  for (let row = fromRow; row <= toRow; row++) {
    const gy = row * TILE;
    const bgGrad = bx.createLinearGradient(gx, 0, gx + TILE, 0);
    bgGrad.addColorStop(0, '#6858b8');
    bgGrad.addColorStop(0.5, '#4838a0');
    bgGrad.addColorStop(1, '#2a1870');
    bx.fillStyle = bgGrad;
    bx.fillRect(gx, gy, TILE, TILE);
    bx.fillStyle = 'rgba(255,255,255,0.06)';
    bx.fillRect(gx, gy, TILE, 1);
    bx.fillRect(gx, gy, 1, TILE);
    bx.fillStyle = 'rgba(0,0,0,0.12)';
    bx.fillRect(gx + TILE - 1, gy, 1, TILE);
    bx.fillRect(gx, gy + TILE - 1, TILE, 1);
  }
}

function drawBossGate() {
  if (bossOutroPhase === 2) {
    if (bossOutroWallRow <= 12) {
      drawBossArenaWall(BOSS_GATE_X, bossOutroWallRow, 12);
      drawBossArenaWall(BOSS_ARENA_LEFT, bossOutroWallRow, 12);
    }
    return;
  }
  if (bossOutroPhase === 1) {
    drawBossArenaWall(BOSS_GATE_X, 2, 12);
    drawBossArenaWall(BOSS_ARENA_LEFT, 2, 12);
    return;
  }
  if (!boss || !boss.alive) return;
  drawBossArenaWall(BOSS_GATE_X, 2, 12);
  if (bossEncounterActive) {
    drawBossArenaWall(BOSS_ARENA_LEFT, 2, 12);
  } else if (bossIntroPhase >= 1 && bossIntroWallRow < 12) {
    drawBossArenaWall(BOSS_ARENA_LEFT, bossIntroWallRow + 1, 12);
  }
}

function drawMapCoins() {
  mapCoins.forEach(c => {
    if (c.collected) return;
    const mcsx = Math.floor(c.x - camera.rx);
    if (mcsx < -TILE || mcsx > VIEW_W + TILE) return;
    const bob = Math.sin(globalTick * 0.08 + c.x * 0.1) * 1.5;
    const mcy = Math.floor(c.y + bob);
    const mcGrad = bx.createRadialGradient(mcsx + 3, mcy + 3, 1, mcsx + 4, mcy + 4, 5);
    mcGrad.addColorStop(0, '#fcf0a0');
    mcGrad.addColorStop(0.5, COL.coin);
    mcGrad.addColorStop(1, '#a08020');
    bx.fillStyle = mcGrad;
    bx.beginPath();
    bx.ellipse(mcsx + 4, mcy + 4, 3.5, 4.5, 0, 0, Math.PI * 2);
    bx.fill();
    bx.save();
    bx.globalAlpha = 0.4;
    bx.fillStyle = '#fcfcfc';
    bx.beginPath();
    bx.ellipse(mcsx + 3, mcy + 3, 0.8, 1.2, 0, 0, Math.PI * 2);
    bx.fill();
    bx.restore();
    var shinePhase = (globalTick * 0.004 + c.x * 0.07) % 1;
    if (shinePhase < 0.08) {
      var shineT = shinePhase / 0.08;
      var shineAlpha = Math.sin(shineT * Math.PI) * 0.6;
      var shinePos = -4 + shineT * 16;
      bx.save();
      bx.beginPath();
      bx.ellipse(mcsx + 4, mcy + 4, 3.5, 4.5, 0, 0, Math.PI * 2);
      bx.clip();
      bx.globalAlpha = shineAlpha;
      bx.strokeStyle = '#fcfcfc';
      bx.lineWidth = 0.8;
      bx.beginPath();
      bx.moveTo(mcsx + shinePos, mcy - 1);
      bx.lineTo(mcsx + shinePos + 4, mcy + 9);
      bx.stroke();
      bx.restore();
    }
  });
}

function drawCheckpoint() {
  CHECKPOINT_XS.forEach((cpx, ci) => {
    const cfx = Math.floor(cpx * TILE - camera.rx);
    if (cfx < -20 || cfx > VIEW_W + 20) return;

    const poleTop = 11 * TILE;
    const poleH = 2 * TILE;

    const cpGrad = bx.createLinearGradient(cfx + 6, 0, cfx + 9, 0);
    cpGrad.addColorStop(0, '#a898c0');
    cpGrad.addColorStop(0.5, '#d0c0e0');
    cpGrad.addColorStop(1, '#888098');
    bx.fillStyle = cpGrad;
    bx.fillRect(cfx + 7, poleTop, 1.5, poleH);

    bx.fillStyle = '#d8c8f0';
    bx.beginPath();
    bx.arc(cfx + 8, poleTop - 1, 2, 0, Math.PI * 2);
    bx.fill();

    if (ci <= checkpointIndex) {
      const pulse = Math.sin(globalTick * 0.12) * 0.3 + 0.7;

      bx.save();
      var beamAlpha = 0.06 + Math.sin(globalTick * 0.05 + ci) * 0.03;
      bx.globalAlpha = beamAlpha;
      var beamGrad = bx.createLinearGradient(0, poleTop - 30, 0, poleTop + poleH + 10);
      beamGrad.addColorStop(0, 'rgba(200,180,240,0)');
      beamGrad.addColorStop(0.3, '#c8b8f0');
      beamGrad.addColorStop(0.7, '#c8b8f0');
      beamGrad.addColorStop(1, 'rgba(200,180,240,0)');
      bx.fillStyle = beamGrad;
      bx.fillRect(cfx + 2, poleTop - 30, 12, poleH + 40);
      bx.restore();

      bx.save();
      bx.globalAlpha = pulse * 0.5;
      var orbGlow = bx.createRadialGradient(cfx + 8, poleTop - 1, 1, cfx + 8, poleTop - 1, 8);
      orbGlow.addColorStop(0, '#f0e8ff');
      orbGlow.addColorStop(0.5, '#c0a8e8');
      orbGlow.addColorStop(1, 'rgba(160,120,200,0)');
      bx.fillStyle = orbGlow;
      bx.beginPath();
      bx.arc(cfx + 8, poleTop - 1, 8, 0, Math.PI * 2);
      bx.fill();
      bx.restore();

      bx.save();
      bx.globalAlpha = pulse;
      const cpfGrad = bx.createLinearGradient(cfx + 1, 0, cfx + 7, 0);
      cpfGrad.addColorStop(0, '#d8c8f0');
      cpfGrad.addColorStop(1, '#a888d0');
      bx.fillStyle = cpfGrad;
      bx.beginPath();
      bx.moveTo(cfx + 7, poleTop + 1);
      bx.lineTo(cfx + 1, poleTop + 3.5);
      bx.lineTo(cfx + 7, poleTop + 6);
      bx.closePath();
      bx.fill();
      bx.restore();
    } else {
      const wave = Math.sin(globalTick * 0.06) * 1.5;
      const cpfGrad2 = bx.createLinearGradient(cfx + 1, 0, cfx + 7, 0);
      cpfGrad2.addColorStop(0, '#c0a8e8');
      cpfGrad2.addColorStop(1, '#8870b0');
      bx.fillStyle = cpfGrad2;
      bx.beginPath();
      bx.moveTo(cfx + 7, poleTop + 1);
      bx.lineTo(cfx + 1 + wave, poleTop + 3.5);
      bx.lineTo(cfx + 7, poleTop + 6);
      bx.closePath();
      bx.fill();
    }
  });
}

function drawFlagPole() {
  const fx = Math.floor(FLAGPOLE_X * TILE - camera.rx);
  if (fx < -20 || fx > VIEW_W + 20) return;

  const poleGrad = bx.createLinearGradient(fx + 6, 0, fx + 10, 0);
  poleGrad.addColorStop(0, '#d0c8e0');
  poleGrad.addColorStop(0.5, '#fcfcfc');
  poleGrad.addColorStop(1, '#a898c0');
  bx.fillStyle = poleGrad;
  bx.fillRect(fx + 7, 3 * TILE, 2, 10 * TILE);

  const orbGrad = bx.createRadialGradient(fx + 7, 3 * TILE - 1, 1, fx + 8, 3 * TILE, 4);
  orbGrad.addColorStop(0, '#e0d0f8');
  orbGrad.addColorStop(0.5, '#c0a8e8');
  orbGrad.addColorStop(1, '#8070b0');
  bx.fillStyle = orbGrad;
  bx.beginPath();
  bx.arc(fx + 8, 3 * TILE - 1, 4, 0, Math.PI * 2);
  bx.fill();

  {
    let flagDrawY;
    if (!flagDescending) {
      flagDrawY = 3 * TILE + 2;
    } else {
      const poleBottom = 12 * TILE - 12;
      flagDrawY = Math.min(Math.floor(mario.y), poleBottom);
    }
    const wave = flagDescending ? 0 : Math.sin(globalTick * 0.1) * 1.5;

    // Triangular flag with logo purple color
    const flagGrad = bx.createLinearGradient(fx - 14, 0, fx + 6, 0);
    flagGrad.addColorStop(0, '#5050d0');
    flagGrad.addColorStop(1, '#4040b0');
    bx.fillStyle = flagGrad;
    bx.beginPath();
    bx.moveTo(fx + 6, flagDrawY);
    bx.lineTo(fx - 14 + wave, flagDrawY + 7.5);
    bx.lineTo(fx + 6, flagDrawY + 15);
    bx.closePath();
    bx.fill();

    // White "e" inside the flag (centered with padding)
    const eCx = fx + wave * 0.35;
    const eCy = flagDrawY + 7.5;
    const eR = 2.2;
    bx.strokeStyle = '#ffffff';
    bx.lineWidth = 1.2;
    bx.lineCap = 'round';
    // Almost-full circle with opening at bottom-right
    bx.beginPath();
    bx.arc(eCx, eCy, eR, 0.5, 0, false);
    bx.stroke();
    // Horizontal crossbar through middle
    bx.beginPath();
    bx.moveTo(eCx - eR, eCy);
    bx.lineTo(eCx + eR, eCy);
    bx.stroke();

    // Orange dot
    bx.fillStyle = '#f0a030';
    bx.beginPath();
    bx.arc(eCx + eR + 0.8, eCy + 1.5, 0.8, 0, Math.PI * 2);
    bx.fill();
  }
}

function drawCastle() {
  const ccx = Math.floor(CASTLE_X * TILE - camera.rx);
  if (ccx < -160 || ccx > VIEW_W + 40) return;

  const W = 5 * TILE; // 80px wide overall
  const groundY = 13 * TILE;

  // ----- 1. COSMIC HALO (soft purple aura behind the castle) -----
  // Makes the victory castle pop against the deep-space sky and reads
  // as the magical end-of-journey objective.
  const halo = bx.createRadialGradient(
    ccx + W / 2, groundY - 56, 4,
    ccx + W / 2, groundY - 56, 110
  );
  halo.addColorStop(0, 'rgba(200,160,255,0.30)');
  halo.addColorStop(0.5, 'rgba(140,90,220,0.10)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  bx.fillStyle = halo;
  bx.fillRect(ccx - 60, groundY - 170, W + 120, 170);

  // Helper: tower body with vertical light/shade gradient
  function tower(tx, ty, tw, th) {
    const g = bx.createLinearGradient(tx, 0, tx + tw, 0);
    g.addColorStop(0, COL.castleLight);
    g.addColorStop(0.4, COL.castle);
    g.addColorStop(1, COL.castleDark);
    bx.fillStyle = g;
    bx.fillRect(tx, ty, tw, th);
    bx.fillStyle = 'rgba(255,255,255,0.10)';
    bx.fillRect(tx, ty, tw, 1);
    bx.fillStyle = 'rgba(0,0,0,0.20)';
    bx.fillRect(tx + tw - 1, ty, 1, th);
  }

  // Helper: crenellated battlement (n teeth across width, h tall)
  function crenellation(tx, ty, tw, n, h) {
    const tooth = Math.max(2, Math.floor(tw / (n * 2 - 1)));
    for (let i = 0; i < n; i++) {
      const x = tx + i * tooth * 2;
      bx.fillStyle = COL.castle;
      bx.fillRect(x, ty, tooth, h);
      bx.fillStyle = 'rgba(255,255,255,0.14)';
      bx.fillRect(x, ty, tooth, 1);
      bx.fillStyle = 'rgba(0,0,0,0.20)';
      bx.fillRect(x + tooth - 1, ty, 1, h);
    }
  }

  // ----- 2. CORNER TOWERS (taller than the main wall) -----
  tower(ccx, 6 * TILE, TILE, 7 * TILE);
  tower(ccx + W - TILE, 6 * TILE, TILE, 7 * TILE);
  crenellation(ccx, 6 * TILE - 4, TILE, 2, 4);
  crenellation(ccx + W - TILE, 6 * TILE - 4, TILE, 2, 4);

  // ----- 3. MAIN WALL (between corner towers) -----
  tower(ccx + TILE, 8 * TILE, W - 2 * TILE, 5 * TILE);
  // Stone-block grid for masonry texture
  bx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let r = 1; r < 5; r++) {
    bx.fillRect(ccx + TILE, 8 * TILE + r * TILE, W - 2 * TILE, 1);
  }
  for (let c = 1; c < 3; c++) {
    bx.fillRect(ccx + TILE + c * TILE, 8 * TILE, 1, 5 * TILE);
  }
  // Battlements on top of wall
  crenellation(ccx + TILE, 8 * TILE - 4, W - 2 * TILE, 4, 4);

  // ----- 4. CENTRAL TOWER (above the wall) -----
  const cw = 2 * TILE;
  const cx = ccx + (W - cw) / 2;
  const cy = 4 * TILE;
  const ch = 4 * TILE;
  tower(cx, cy, cw, ch);
  bx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let r = 1; r < 4; r++) bx.fillRect(cx, cy + r * TILE, cw, 1);
  bx.fillRect(cx + TILE, cy, 1, ch);
  crenellation(cx, cy - 4, cw, 3, 4);

  // ----- 5. SPIRE & GLOWING STAR -----
  const spireH = 14;
  const spireApexX = cx + cw / 2;
  const spireBaseY = cy - 4;
  const spireApexY = spireBaseY - spireH;
  // Triangle spire body
  bx.fillStyle = COL.castleDark;
  bx.beginPath();
  bx.moveTo(cx + 4, spireBaseY);
  bx.lineTo(cx + cw - 4, spireBaseY);
  bx.lineTo(spireApexX, spireApexY);
  bx.closePath();
  bx.fill();
  // Spire highlight (left edge)
  bx.fillStyle = COL.castleLight;
  bx.beginPath();
  bx.moveTo(cx + 4, spireBaseY);
  bx.lineTo(cx + 6, spireBaseY);
  bx.lineTo(spireApexX, spireApexY);
  bx.closePath();
  bx.fill();

  // Pulsing star at the apex
  const pulse = 0.7 + 0.3 * Math.sin(globalTick * 0.08);
  const starX = Math.round(spireApexX);
  const starY = spireApexY - 4;
  // Halo
  bx.save();
  bx.globalAlpha = pulse * 0.7;
  const starHalo = bx.createRadialGradient(starX, starY, 0.5, starX, starY, 14);
  starHalo.addColorStop(0, 'rgba(255,240,160,0.95)');
  starHalo.addColorStop(0.5, 'rgba(255,200,80,0.45)');
  starHalo.addColorStop(1, 'rgba(255,200,80,0)');
  bx.fillStyle = starHalo;
  bx.fillRect(starX - 16, starY - 16, 32, 32);
  bx.restore();
  // 4-point pixel star
  bx.fillStyle = '#ffffff';
  bx.fillRect(starX, starY, 1, 1);
  bx.fillStyle = '#fff8c8';
  bx.fillRect(starX - 1, starY, 1, 1);
  bx.fillRect(starX + 1, starY, 1, 1);
  bx.fillRect(starX, starY - 1, 1, 1);
  bx.fillRect(starX, starY + 1, 1, 1);
  // Outer rays (pulsing)
  bx.save();
  bx.globalAlpha = pulse;
  bx.fillStyle = '#ffe080';
  bx.fillRect(starX - 3, starY, 2, 1);
  bx.fillRect(starX + 2, starY, 2, 1);
  bx.fillRect(starX, starY - 3, 1, 2);
  bx.fillRect(starX, starY + 2, 1, 2);
  bx.restore();

  // ----- 6. DOOR (solid wooden castle gate) -----
  // Solid material — no portal stars / cosmic gradient bleeding through.
  // The wooden gate is set into a slightly darker stone arch so the
  // doorway still reads as a recessed entrance even against the deep
  // cosmic backdrop. The blob walks INTO this door at the end of the
  // win cutscene (see updateMario flagDescending block).
  const doorW = TILE;
  const doorH = 2 * TILE;
  const doorX = Math.round(ccx + (W - doorW) / 2);
  const doorY = 11 * TILE;
  // Stone arch shadow (frames the gate)
  bx.fillStyle = '#1a0e2a';
  bx.fillRect(doorX, doorY, doorW, doorH);
  bx.beginPath();
  bx.arc(doorX + doorW / 2, doorY, doorW / 2, Math.PI, 0, false);
  bx.fill();
  // Wooden gate planks (warm brown vertical gradient = lit from above)
  const plankX = doorX + 1;
  const plankW = doorW - 2;
  const plankTop = doorY + 2;
  const plankH = doorH - 2;
  const plankG = bx.createLinearGradient(0, plankTop, 0, plankTop + plankH);
  plankG.addColorStop(0, '#5a2818');
  plankG.addColorStop(0.5, '#4a2010');
  plankG.addColorStop(1, '#2a1008');
  bx.fillStyle = plankG;
  bx.fillRect(plankX, plankTop, plankW, plankH);
  // Arched top of the gate (matches planks, sits inside the stone arch)
  bx.fillStyle = '#4a2010';
  bx.beginPath();
  bx.arc(doorX + doorW / 2, plankTop, doorW / 2 - 1, Math.PI, 0, false);
  bx.fill();
  // Vertical plank seams (3 planks across)
  bx.fillStyle = 'rgba(0,0,0,0.45)';
  bx.fillRect(plankX + 4, plankTop + 1, 1, plankH - 1);
  bx.fillRect(plankX + 9, plankTop + 1, 1, plankH - 1);
  // Iron horizontal bands (top + bottom)
  bx.fillStyle = '#1a1018';
  bx.fillRect(plankX, doorY + 7, plankW, 2);
  bx.fillRect(plankX, doorY + doorH - 6, plankW, 2);
  // Iron stud dots on the bands (tiny rivets)
  bx.fillStyle = '#4a3038';
  bx.fillRect(plankX + 1, doorY + 7, 1, 1);
  bx.fillRect(plankX + plankW - 2, doorY + 7, 1, 1);
  bx.fillRect(plankX + 1, doorY + doorH - 6, 1, 1);
  bx.fillRect(plankX + plankW - 2, doorY + doorH - 6, 1, 1);
  // Brass handle on the right plank
  bx.fillStyle = '#8a6018';
  bx.fillRect(plankX + plankW - 4, doorY + 13, 1, 1);
  bx.fillStyle = '#6a4818';
  bx.fillRect(plankX + plankW - 4, doorY + 14, 1, 1);
  // Subtle top highlight on the arch (catches ambient cosmic light)
  bx.fillStyle = 'rgba(255,200,120,0.30)';
  bx.beginPath();
  bx.arc(doorX + doorW / 2, plankTop + 1, doorW / 2 - 2, Math.PI, 0, false);
  bx.fill();
  // Soft golden frame around the doorway (ties the gate visually to
  // the windows' golden frames)
  bx.fillStyle = 'rgba(255,200,80,0.30)';
  bx.fillRect(doorX, doorY + 1, 1, doorH - 1);
  bx.fillRect(doorX + doorW - 1, doorY + 1, 1, doorH - 1);

  // ----- 7. WINDOWS (with star glow) -----
  function starWindow(wx, wy) {
    bx.fillStyle = '#070315';
    bx.fillRect(wx, wy, 6, 8);
    bx.fillStyle = 'rgba(255,210,100,0.55)';
    bx.fillRect(wx + 1, wy + 1, 4, 6);
    // 4-point sparkle
    bx.fillStyle = '#ffffff';
    bx.fillRect(wx + 3, wy + 3, 1, 1);
    bx.fillStyle = 'rgba(255,255,200,0.85)';
    bx.fillRect(wx + 2, wy + 3, 1, 1);
    bx.fillRect(wx + 4, wy + 3, 1, 1);
    bx.fillRect(wx + 3, wy + 2, 1, 1);
    bx.fillRect(wx + 3, wy + 4, 1, 1);
    // Frame
    bx.fillStyle = 'rgba(255,200,80,0.30)';
    bx.fillRect(wx, wy, 1, 8);
    bx.fillRect(wx + 5, wy, 1, 8);
  }
  function smallWindow(wx, wy) {
    bx.fillStyle = '#070315';
    bx.fillRect(wx, wy, 4, 6);
    bx.fillStyle = 'rgba(255,200,80,0.55)';
    bx.fillRect(wx + 1, wy + 1, 2, 4);
    bx.fillStyle = '#fff8c0';
    bx.fillRect(wx + 1, wy + 2, 1, 1);
    bx.fillRect(wx + 2, wy + 3, 1, 1);
  }
  // Wall windows flanking the door
  starWindow(ccx + TILE + 4, 9 * TILE + 4);
  starWindow(ccx + W - 2 * TILE + 6, 9 * TILE + 4);
  // Central tower window
  starWindow(cx + (cw - 6) / 2, cy + TILE);
  // Corner tower windows (small)
  smallWindow(ccx + 6, 8 * TILE);
  smallWindow(ccx + W - 10, 8 * TILE);
  smallWindow(ccx + 6, 10 * TILE + 2);
  smallWindow(ccx + W - 10, 10 * TILE + 2);

  // ----- 8. AMBIENT SPARKLES around the castle -----
  // A handful of tiny twinkling stars drifting near the castle to sell
  // the "magical objective in space" feel. Deterministic positions, sin
  // alpha animation.
  for (let i = 0; i < 8; i++) {
    const seed = i * 53 + 19;
    const fx = ((seed * 9301 + 49297) % 233280) / 233280;
    const fy = (((seed + 7) * 9301 + 49297) % 233280) / 233280;
    const px = ccx - 30 + Math.round(fx * (W + 60));
    const py = Math.round(fy * 7 * TILE);
    const a = 0.25 + 0.55 * Math.max(0, Math.sin(globalTick * 0.07 + i * 0.9));
    if (a < 0.1) continue;
    bx.fillStyle = `rgba(255,255,220,${a.toFixed(2)})`;
    bx.fillRect(px, py, 1, 1);
  }
}

let _progressZoneGrads = null;
let _pitDepthGrad = null;
let _lavaBedGrad = null;
const _staticSkyGrads = {};
// Gradient cache: avoids per-frame allocate/discard of CanvasGradient objects
// for patterns that repeat every frame (clouds, bushes, atmosphere glows).
// Keys are biome-specific strings; values are lazily-created CanvasGradient
// instances positioned at the origin (caller saves/translates the canvas).
const _gradCache = {};
function _cachedGrad(key, factory) {
  if (_gradCache[key] !== undefined) return _gradCache[key];
  _gradCache[key] = factory();
  return _gradCache[key];
}

// ---------------------------------------------------------------
// Cosmic Nexus sprite cache.
// Pure pixel-art galaxy: a deep starfield (with a soft Milky Way
// dust band built FROM stars, not a gradient), small nebula
// clusters made of crisp coloured pixels, and pixel-art planets
// with hard banding. Everything is stamped with imageSmoothing
// disabled so it stays crunchy when upscaled — no soft Photoshop
// blobs, no double-scaled blur.
// ---------------------------------------------------------------
let _cosmicSprites = null;
function getCosmicSprites() {
  if (_cosmicSprites) return _cosmicSprites;

  function makeRng(seed) {
    let s = seed >>> 0;
    return function rand() {
      s = (s * 1664525 + 1013904223) >>> 0;
      return (s & 0xffffff) / 0xffffff;
    };
  }

  function pixelDisk(g, cx, cy, r, color) {
    g.fillStyle = color;
    const r2 = r * r;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r2) g.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
      }
    }
  }

  // ----- Big starfield (parallax-tiled across the cosmic biome) -----
  // Built from hundreds of pixel stars at varying brightness/colour,
  // PLUS a denser dust band along a diagonal which reads as the Milky
  // Way without any gradient. Deterministic so it never resamples.
  function buildStarfield(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const rand = makeRng(0xC05A11C);
    const rint = (n) => (rand() * n) | 0;

    // Diagonal Milky Way band — denser stars + dust pixels along a
    // gentle slope. Computed per-x so the band is a wave, not a strip.
    const bandCenterAt = (x) => h * 0.45 + Math.sin(x * 0.0035) * h * 0.06;
    const bandHalf = h * 0.18;

    // Background dust along the band — coloured 1px specks, very faint.
    const dustCols = ['180,160,255', '220,200,255', '255,200,220', '160,200,255'];
    for (let i = 0; i < 1100; i++) {
      const x = rand() * w;
      const yOff = (rand() - 0.5) * bandHalf * 2;
      const y = bandCenterAt(x) + yOff;
      const a = (0.05 + rand() * 0.10) * (1 - Math.abs(yOff) / bandHalf);
      g.fillStyle = `rgba(${dustCols[rint(dustCols.length)]},${a.toFixed(3)})`;
      g.fillRect(x | 0, y | 0, 1, 1);
    }

    // Sparse background stars across the entire sky.
    for (let i = 0; i < 700; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const a = 0.20 + rand() * 0.45;
      g.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      g.fillRect(x | 0, y | 0, 1, 1);
    }

    // Mid-brightness coloured stars.
    const starCols = ['#ffffff', '#cce0ff', '#ffd0e0', '#e0d0ff', '#fff5cc', '#bff0ff'];
    for (let i = 0; i < 140; i++) {
      const x = rand() * w;
      const y = rand() * h;
      g.fillStyle = starCols[rint(starCols.length)];
      g.fillRect(x | 0, y | 0, 1, 1);
    }

    // Bright "hero" stars with crisp 4-point cross-flare.
    for (let i = 0; i < 22; i++) {
      const x = (rand() * w) | 0;
      const y = (rand() * h) | 0;
      g.fillStyle = '#ffffff';
      g.fillRect(x, y, 1, 1);
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.fillRect(x - 1, y, 1, 1);
      g.fillRect(x + 1, y, 1, 1);
      g.fillRect(x, y - 1, 1, 1);
      g.fillRect(x, y + 1, 1, 1);
      g.fillStyle = 'rgba(255,255,255,0.20)';
      g.fillRect(x - 2, y, 1, 1);
      g.fillRect(x + 2, y, 1, 1);
      g.fillRect(x, y - 2, 1, 1);
      g.fillRect(x, y + 2, 1, 1);
    }
    return c;
  }

  // ----- Nebula as a pixel cluster (NOT a soft blob) -----
  // Three concentric shells of pixel dots — outer dim, middle, inner
  // bright — produce a clearly-shaped nebula that reads as a pixel-art
  // dust cloud. Stable per-seed so each nebula has a unique silhouette.
  function buildNebulaCluster(seed, coreColor, midColor, dimColor) {
    const w = 56, h = 36;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const rand = makeRng(seed);
    const cx = w / 2, cy = h / 2;

    // Dim halo
    g.fillStyle = dimColor;
    for (let i = 0; i < 60; i++) {
      const a = rand() * Math.PI * 2;
      const r = (rand() * 0.5 + 0.5) * 18;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.55;
      g.fillRect(x | 0, y | 0, 1, 1);
    }
    // Mid layer
    g.fillStyle = midColor;
    for (let i = 0; i < 38; i++) {
      const a = rand() * Math.PI * 2;
      const r = (rand() * 0.6 + 0.3) * 12;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.6;
      g.fillRect(x | 0, y | 0, 1, 1);
    }
    // Bright core
    g.fillStyle = coreColor;
    for (let i = 0; i < 20; i++) {
      const a = rand() * Math.PI * 2;
      const r = (rand() * 0.7 + 0.1) * 6;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.65;
      g.fillRect(x | 0, y | 0, 1, 1);
    }
    // Hot pixels (bright white in the heart)
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const x = cx + (rand() - 0.5) * 6;
      const y = cy + (rand() - 0.5) * 4;
      g.fillRect(x | 0, y | 0, 1, 1);
    }
    return c;
  }

  // ----- Pixel-art planets -----
  // Properly shaded with a fake sphere normal: each pixel computes its
  // Z component from (x,y) and dots with a top-left light vector. The
  // resulting brightness is posterised into 4 bands (dark side, shadow,
  // base, highlight) — gives clean, crisp pixel-art planets that read
  // as 3D spheres without any anti-aliasing.
  function buildPlanet(diameter, base, hi, lo, mid, opts) {
    opts = opts || {};
    const ringSpan = opts.ring ? Math.round(diameter * 0.55) : 2;
    const total = diameter + ringSpan * 2;
    const c = document.createElement('canvas');
    c.width = c.height = total;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const cx = (total / 2) | 0;
    const cy = (total / 2) | 0;
    const R = (diameter / 2) | 0;
    const r2 = R * R;
    const ringRx = R + Math.round(ringSpan * 0.85);
    const ringRy = Math.max(2, Math.round(ringRx * 0.28));

    // Back half of ring (pixel arc, dimmed to feel "behind")
    if (opts.ring) {
      g.fillStyle = opts.ringDim || opts.ring;
      const steps = ringRx * 4;
      for (let i = 0; i <= steps; i++) {
        const t = Math.PI + (i / steps) * Math.PI;
        g.fillRect((cx + Math.cos(t) * ringRx) | 0, (cy + Math.sin(t) * ringRy) | 0, 1, 1);
      }
    }

    // Body — sphere-lit pixel by pixel
    for (let y = -R; y <= R; y++) {
      for (let x = -R; x <= R; x++) {
        const d2 = x * x + y * y;
        if (d2 > r2) continue;
        const z = Math.sqrt(r2 - d2);
        const nx = x / R, ny = y / R, nz = z / R;
        // Light source: top-left, slightly forward
        const dot = -nx * 0.55 - ny * 0.55 + nz * 0.62;
        let col;
        if (dot > 0.78) col = hi;
        else if (dot > 0.40) col = mid;
        else if (dot > 0.05) col = base;
        else col = lo;
        g.fillStyle = col;
        g.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
      }
    }

    // Surface bands (gas giant): subtle dark stripes only on pixels that
    // are NOT in deep shadow (so bands show on the lit hemisphere).
    if (opts.bands) {
      g.fillStyle = 'rgba(0,0,0,0.22)';
      for (let by = -R + 2; by < R; by += 3) {
        for (let x = -R; x <= R; x++) {
          if (x * x + by * by > r2) continue;
          const z2 = r2 - x * x - by * by;
          if (z2 <= 0) continue;
          const z = Math.sqrt(z2);
          const dot = -(x / R) * 0.55 - (by / R) * 0.55 + (z / R) * 0.62;
          if (dot > 0.05) g.fillRect((cx + x) | 0, (cy + by) | 0, 1, 1);
        }
      }
    }

    // Specular highlight pixel — placed at the brightest sphere point
    g.fillStyle = '#ffffff';
    g.fillRect(cx - Math.round(R * 0.45), cy - Math.round(R * 0.45), 1, 1);

    // Front half of ring (full brightness, in front of planet)
    if (opts.ring) {
      g.fillStyle = opts.ring;
      const steps = ringRx * 4;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI;
        g.fillRect((cx + Math.cos(t) * ringRx) | 0, (cy + Math.sin(t) * ringRy) | 0, 1, 1);
      }
    }

    return { canvas: c, w: total, h: total };
  }

  // ----- Asteroid (irregular pixel rock) -----
  // Small lumpy silhouette made of stacked pixel ellipses, with crater
  // pixels sprinkled on the lit side. Stable per seed.
  function buildAsteroid(seed, baseR, body, hi, lo) {
    const rand = makeRng(seed);
    const total = baseR * 2 + 4;
    const c = document.createElement('canvas');
    c.width = c.height = total;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const cx = (total / 2) | 0;
    const cy = (total / 2) | 0;
    // Bumpy silhouette — for each pixel, distance check with random radius modulation
    const angleR = [];
    const samples = 16;
    for (let i = 0; i < samples; i++) angleR.push(baseR * (0.78 + rand() * 0.30));
    function localR(angle) {
      const f = (angle / (Math.PI * 2)) * samples;
      const i0 = Math.floor(f) % samples;
      const i1 = (i0 + 1) % samples;
      const t = f - Math.floor(f);
      return angleR[i0] * (1 - t) + angleR[i1] * t;
    }
    for (let y = -baseR - 2; y <= baseR + 2; y++) {
      for (let x = -baseR - 2; x <= baseR + 2; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d <= 0.01) {
          g.fillStyle = hi;
          g.fillRect(cx, cy, 1, 1);
          continue;
        }
        const a = Math.atan2(y, x) + Math.PI;
        const r = localR(a);
        if (d > r) continue;
        // Light source top-left
        const nx = x / r, ny = y / r;
        const lit = -nx * 0.6 - ny * 0.6;
        let col;
        if (lit > 0.55) col = hi;
        else if (lit > 0.0) col = body;
        else col = lo;
        g.fillStyle = col;
        g.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
      }
    }
    // 2-3 crater pixels on lit side
    g.fillStyle = lo;
    for (let i = 0; i < 3; i++) {
      const cax = -1 + Math.round(rand() * 2);
      const cay = -1 + Math.round(rand() * 2);
      g.fillRect(cx + cax, cy + cay, 1, 1);
    }
    return { canvas: c, w: total, h: total };
  }

  _cosmicSprites = {
    starfield:    buildStarfield(VIEW_W * 3, Math.round(VIEW_H * 0.78)),
    nebulaPurple: buildNebulaCluster(0xA1B2C3, '#e8c0ff', '#a060d8', '#5028a0'),
    nebulaBlue:   buildNebulaCluster(0x4D7C9F, '#c0e0ff', '#5080d0', '#28408a'),
    nebulaPink:   buildNebulaCluster(0xE08CB0, '#ffd0e8', '#d060a0', '#80286a'),
    // Big ringed gas giant — lavender / amethyst with bright ring
    planetRinged: buildPlanet(28, '#9868c8', '#e8c8ff', '#241048', '#7048a8', { ring: 'rgba(232,212,255,0.95)', ringDim: 'rgba(160,130,200,0.55)', bands: true }),
    // Mid-distance ice/water planet
    planetBlue:   buildPlanet(20, '#4878c8', '#bce0ff', '#0a1238', '#3460a8', { bands: true }),
    // Small rocky / desert moon
    planetRocky:  buildPlanet(14, '#b89870', '#ffeac8', '#2a1808', '#8c6c50', {}),
    // Small green/teal planet for variety
    planetGreen:  buildPlanet(12, '#48a878', '#c8ffd8', '#0a2818', '#308860', {}),
    // Asteroids — different shapes
    asteroid1:    buildAsteroid(0xA570A1D, 5, '#7a6858', '#c8b89c', '#2a2018'),
    asteroid2:    buildAsteroid(0x131DA70, 4, '#6c5848', '#b8a890', '#241810'),
    asteroid3:    buildAsteroid(0xB10B570, 3, '#807060', '#d0c0a8', '#2c2018'),
  };
  return _cosmicSprites;
}

// Cosmic shooting-stars. Up to 3 streaks can be active at once; each
// has its own life timer so streaks can overlap. Spawn cadence is
// short enough that the player almost always sees one within a few
// seconds, but randomised so it never feels metronomic.
const _shootingStars = [
  { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0 },
  { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0 },
  { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0 },
];
let _shootingStarSpawn = 30;
function _updateShootingStar() {
  for (let i = 0; i < _shootingStars.length; i++) {
    const s = _shootingStars[i];
    if (!s.active) continue;
    s.x += s.vx;
    s.y += s.vy;
    s.life++;
    if (s.life >= s.max || s.x < -20 || s.x > VIEW_W + 20 || s.y > VIEW_H) s.active = false;
  }
  _shootingStarSpawn--;
  if (_shootingStarSpawn <= 0) {
    let slot = -1;
    for (let i = 0; i < _shootingStars.length; i++) if (!_shootingStars[i].active) { slot = i; break; }
    if (slot >= 0) {
      const s = _shootingStars[slot];
      const goLeft = Math.random() < 0.5;
      s.x = goLeft ? VIEW_W + 10 : -10;
      s.y = 6 + Math.random() * VIEW_H * 0.55;
      const spd = 3.6 + Math.random() * 2.2;
      s.vx = goLeft ? -spd : spd;
      s.vy = 0.5 + Math.random() * 0.9;
      s.life = 0;
      s.max = 55 + Math.random() * 35;
      s.active = true;
    }
    _shootingStarSpawn = 60 + Math.random() * 140;
  }
}
function _buildProgressZoneGrads(barY, barH) {
  // Forest green / snow blue / desert gold / lava red / cosmic purple.
  const biomeColors = ['#3a8a3a', '#bcd6ec', '#e8a868', '#c83a20', '#8a40e8'];
  const arr = [];
  for (let i = 0; i < biomeColors.length; i++) {
    const g = bx.createLinearGradient(0, barY, 0, barY + barH);
    g.addColorStop(0, biomeColors[i]);
    g.addColorStop(1, lerpColor(biomeColors[i], '#0d0b16', 0.55));
    arr.push(g);
  }
  return arr;
}

function drawProgressBar() {
  if (!multiplayerMode || racePlayers.length === 0) return;

  if (!eliminated) {
    const me = racePlayers.find(p => p.id === myPlayerId);
    if (me && !me.finished && me.alive) {
      me.progress = Math.min(1, mario.x / ((LEVEL_WIDTH - 15) * TILE));
    }
  }

  const barX = 14;
  // Push the bar a couple pixels below the (now shorter) HUD strip so
  // the YOU label above it has clear space and isn't clipped by the
  // score row's shadow.
  const barY = 33;
  const barW = VIEW_W - 28;
  const barH = 3;

  // Flat brutalist track: tiny inset frame, hairline border, no rounded pill.
  bx.fillStyle = 'rgba(7,6,12,0.85)';
  bx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
  bx.fillStyle = 'rgba(255,255,255,0.10)';
  bx.fillRect(barX - 1, barY - 1, barW + 2, 1);                 // top hairline
  bx.fillRect(barX - 1, barY + barH, barW + 2, 1);              // bottom hairline

  // Biome-tinted zones along the track (forest -> snow -> desert -> lava
  // -> cosmic). Zone boundaries are taken from checkpoint positions, which
  // are aligned 1:1 with biome entries — so every tick lands exactly on
  // the start of its colour zone.
  if (!_progressZoneGrads) _progressZoneGrads = _buildProgressZoneGrads(barY, barH);
  const zoneBounds = CHECKPOINT_XS.concat(LEVEL_WIDTH);
  let prevTx = 0;
  for (let bi = 0; bi < zoneBounds.length; bi++) {
    const startTx = prevTx;
    const endTx = zoneBounds[bi];
    const startProg = (startTx * TILE) / ((LEVEL_WIDTH - 15) * TILE);
    const endProg = Math.min(1, (endTx * TILE) / ((LEVEL_WIDTH - 15) * TILE));
    const sx = barX + Math.round(startProg * (barW - 4));
    const ex = barX + Math.round(endProg * (barW - 4));
    bx.fillStyle = _progressZoneGrads[bi];
    bx.fillRect(sx, barY, ex - sx, barH);
    prevTx = endTx;
  }

  // Checkpoint ticks — sharp 1px verticals with subtle purple cap on top.
  for (var ci = 0; ci < CHECKPOINT_XS.length; ci++) {
    var cpProgress = (CHECKPOINT_XS[ci] * TILE) / ((LEVEL_WIDTH - 15) * TILE);
    var cpX = barX + Math.round(cpProgress * (barW - 4));
    bx.fillStyle = 'rgba(255,255,255,0.65)';
    bx.fillRect(cpX, barY - 2, 1, barH + 4);
    bx.fillStyle = '#b890ff';
    bx.fillRect(cpX, barY - 2, 1, 1);
  }

  // Finish flag marker at the very right — tiny purple square with white tip
  bx.fillStyle = '#b890ff';
  bx.fillRect(barX + barW - 3, barY - 2, 3, barH + 4);
  bx.fillStyle = '#f3eefe';
  bx.fillRect(barX + barW - 3, barY - 2, 1, 1);

  // ---- Player markers ----
  // With up to 50 players in a room, multiple blobs cluster at similar
  // progress. Drawing each at the same Y just stacks them on top of each
  // other so the user only sees a few. We fan overlapping players out
  // vertically (alternating above / below the bar) so EVERY player is
  // visible no matter how many are at the same spot. The local player
  // ALWAYS renders last and centred on the bar with a bright outline
  // ring + initial, so they stay easy to find.
  const entries = racePlayers.map(p => ({
    p,
    col: getPlayerDisplayColor(p.color || 'lavender'),
    progress: Math.max(0, Math.min(1, p.progress || 0)),
    isMe: p.id === myPlayerId,
  }));
  entries.sort((a, b) => a.progress - b.progress);

  // Bucket entries into ~6px groups along the bar so we know how to fan.
  const GROUP_PX = 6;
  const groups = [];
  for (const e of entries) {
    e.px = barX + Math.round(e.progress * (barW - 4));
    if (groups.length && (e.px - groups[groups.length - 1].px) < GROUP_PX) {
      groups[groups.length - 1].list.push(e);
    } else {
      groups.push({ px: e.px, list: [e] });
    }
  }

  let myEntry = null;
  for (const g of groups) {
    // Order within group: dead/finished first, then alive others, then me last.
    g.list.sort((a, b) => {
      if (a.isMe) return 1;
      if (b.isMe) return -1;
      const ar = a.p.finished ? 2 : (a.p.alive ? 1 : 0);
      const br = b.p.finished ? 2 : (b.p.alive ? 1 : 0);
      return ar - br;
    });
    let fanIdx = 0;
    for (const e of g.list) {
      if (e.isMe) { myEntry = e; continue; }
      // Fan: 0 = on bar, 1 = up, 2 = down, 3 = up2, 4 = down2 ...
      let yOff = 0;
      if (g.list.length > 1) {
        const k = fanIdx;
        yOff = (k === 0) ? 0 : ((k % 2 === 1) ? -1 : 1) * Math.ceil(k / 2) * 2.6;
      }
      fanIdx++;
      const cy = barY + barH / 2 + yOff;
      if (!e.p.alive && !e.p.finished) {
        bx.fillStyle = '#555';
        bx.beginPath();
        bx.arc(e.px + 1, cy, 1.4, 0, Math.PI * 2);
        bx.fill();
      } else if (e.p.finished) {
        bx.fillStyle = e.col;
        bx.beginPath();
        bx.arc(e.px + 1.5, cy, 2.2, 0, Math.PI * 2);
        bx.fill();
        // Tiny white tick on finishers for legibility
        bx.fillStyle = '#fff';
        bx.fillRect(e.px + 1, cy - 0.5, 1, 1);
      } else {
        // Subtle dark backplate so a coloured dot stays visible against
        // the biome zone fill behind it.
        bx.fillStyle = 'rgba(7,6,12,0.55)';
        bx.beginPath();
        bx.arc(e.px + 1.5, cy, 2.4, 0, Math.PI * 2);
        bx.fill();
        bx.fillStyle = e.col;
        bx.beginPath();
        bx.arc(e.px + 1.5, cy, 1.8, 0, Math.PI * 2);
        bx.fill();
      }
    }
  }

  // Draw the local player last, ON THE BAR, with a bright ring + initial.
  if (myEntry) {
    const cy = barY + barH / 2;
    const px = myEntry.px + 1.5;
    // Outer halo ring (pulses softly so the eye snaps to it).
    // Slow, subtle breathing pulse for the YOU marker — period ~2.6s
    // (tick * 0.04) and a narrow alpha range so it just glows softly
    // instead of flashing.
    const pulse = 0.75 + 0.25 * Math.sin(globalTick * 0.04);
    bx.save();
    bx.globalAlpha = 0.40 * pulse;
    bx.fillStyle = '#fff';
    bx.beginPath();
    bx.arc(px, cy, 5.2, 0, Math.PI * 2);
    bx.fill();
    bx.restore();
    // Solid white outline
    bx.fillStyle = '#fff';
    bx.beginPath();
    bx.arc(px, cy, 3.6, 0, Math.PI * 2);
    bx.fill();
    // Coloured core
    bx.fillStyle = myEntry.col;
    bx.beginPath();
    bx.arc(px, cy, 2.5, 0, Math.PI * 2);
    bx.fill();
    // Initial above the bar with a tiny pixel pin. Smaller font + a
    // little extra lift so it sits cleanly between the HUD score row
    // and the bar marker (was getting clipped at 6px / barY-6).
    bx.save();
    bx.font = 'bold 5px sans-serif';
    bx.textAlign = 'center';
    bx.textBaseline = 'middle';
    bx.fillStyle = '#fff';
    bx.fillText('YOU', px, barY - 5);
    bx.restore();
    bx.fillStyle = '#fff';
    bx.fillRect(myEntry.px + 1, barY - 2, 1, 2);
  }

  // Initials above finishers (only if there's room — limit to top 6 most recent
  // finishers near the right edge so we don't drown the bar in letters).
  const finishers = entries.filter(e => e.p.finished && !e.isMe).slice(-6);
  for (const e of finishers) {
    const initial = (e.p.name || '?')[0].toUpperCase();
    bx.save();
    bx.font = 'bold 4px sans-serif';
    bx.textAlign = 'center';
    bx.textBaseline = 'middle';
    bx.fillStyle = e.col;
    bx.globalAlpha = 0.9;
    bx.fillText(initial, e.px + 1.5, barY - 3);
    bx.restore();
  }
}

// ---------------------------------------------------------------
// HUD sprite cache
// The HUD strip background, hairline divider, accent block and coin
// glyph are all completely static. Rebuilding their gradients every
// frame was just GC noise — bake them into a single offscreen sprite.
// ---------------------------------------------------------------
let _hudStripSprite = null;
function getHudStripSprite() {
  if (_hudStripSprite) return _hudStripSprite;
  // Strip height tightened from 26 -> 23 px so the HUD takes ~1% less
  // vertical space, freeing room between the score row and the player
  // timeline labels (the "YOU" tag was getting clipped by the score's
  // shadow).
  const stripH = 23;
  const c = document.createElement('canvas');
  c.width = VIEW_W;
  c.height = stripH;
  const g = c.getContext('2d');
  const hudG = g.createLinearGradient(0, 0, 0, stripH);
  hudG.addColorStop(0, 'rgba(7,6,12,0.78)');
  hudG.addColorStop(0.7,  'rgba(7,6,12,0.50)');
  hudG.addColorStop(1, 'rgba(7,6,12,0)');
  g.fillStyle = hudG;
  g.fillRect(0, 0, VIEW_W, stripH);
  _hudStripSprite = c;
  return c;
}
let _hudCoinSprite = null;
function getHudCoinSprite() {
  if (_hudCoinSprite) return _hudCoinSprite;
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 8;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(4, 4, 0.5, 4.5, 4.5, 3.6);
  grad.addColorStop(0, '#fff5b0');
  grad.addColorStop(0.55, COL.coin);
  grad.addColorStop(1, '#7a5810');
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(4, 4, 2.6, 3.2, 0, 0, Math.PI * 2);
  g.fill();
  _hudCoinSprite = c;
  return c;
}

// ----------------------------------------------------------------
// EAGER CACHE PREWARM
// Hills are already pre-built above (prebuildHills IIFE). The other
// caches (TILE_CACHE, _staticSkyGrads, _cosmicSprites, HUD sprites)
// were lazy and built on first use — which caused a noticeable hitch
// the first time the player crossed a biome boundary OR entered the
// boss arena. Pre-build everything at module load so the in-game
// renderer NEVER has to allocate a fresh canvas/gradient on a hot
// frame.
// ----------------------------------------------------------------
(function prewarmAllCaches() {
  // 1. Tile sprites for every (tile, biome, variant) the renderer can ask for.
  const tileTypes = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13];
  const variants = ['', 'surface', 'empty'];
  for (let bi = 0; bi < BIOMES.length; bi++) {
    for (const t of tileTypes) {
      for (const v of variants) getTileSprite(t, BIOMES[bi], v);
    }
  }
  // 2. Block-glow halos used by ?/1up/star pulses.
  const glowColors = ['#ffd86a', '#ff8a3a', '#9aff9a', '#ffd86a', '#80c8ff', '#ffe080'];
  for (const col of glowColors) getBlockGlowSprite(col);
  // 3. Static sky gradients for every biome (built off the main bx context).
  for (let bi = 0; bi < BIOMES.length; bi++) {
    if (_staticSkyGrads[BIOMES[bi].id]) continue;
    const sg = bx.createLinearGradient(0, 0, 0, VIEW_H);
    for (let i = 0; i < 6; i++) sg.addColorStop(i / 5, BIOMES[bi].sky[i]);
    _staticSkyGrads[BIOMES[bi].id] = sg;
  }
  // 4. Cosmic sprites (the heaviest single allocation — ~768px starfield,
  //    3 nebulas, 4 planets, 3 asteroids). Building this at module load
  //    eliminates the ~250ms hitch that used to happen when the camera
  //    first saw the cosmic biome.
  if (typeof getCosmicSprites === 'function') getCosmicSprites();
  // 5. HUD sprites.
  if (typeof getHudStripSprite === 'function') getHudStripSprite();
  if (typeof getHudCoinSprite === 'function') getHudCoinSprite();
  // 6. Background gradients (atmosphere, clouds, bushes) — forcing their
  //    lazy creation here means the renderer never allocates a CanvasGradient
  //    during gameplay, eliminating the first-frame hitch on biome entry.
  for (let bi = 0; bi < BIOMES.length; bi++) {
    const Bm = BIOMES[bi];
    if (Bm.id === 0) {
      _cachedGrad('atmo_forestGlow', function() {
        const g = bx.createRadialGradient(VIEW_W * 0.78, VIEW_H * 0.18, 0, VIEW_W * 0.78, VIEW_H * 0.18, VIEW_W * 0.65);
        g.addColorStop(0, 'rgba(255,240,180,0.20)');
        g.addColorStop(0.4, 'rgba(200,240,160,0.08)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        return g;
      });
    } else if (Bm.id === 1) {
      _cachedGrad('atmo_snowAurora', function() {
        const g = bx.createLinearGradient(0, 0, 0, VIEW_H * 0.6);
        g.addColorStop(0, 'rgba(180,220,255,0.10)');
        g.addColorStop(1, 'rgba(180,220,255,0)');
        return g;
      });
      _cachedGrad('atmo_snowMoon', function() {
        const g = bx.createRadialGradient(VIEW_W * 0.78, 32, 1, VIEW_W * 0.78, 32, 14);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.5, '#dde8f4');
        g.addColorStop(1, 'rgba(220,232,244,0)');
        return g;
      });
    } else if (Bm.id === 2) {
      _cachedGrad('atmo_desertSun', function() {
        const g = bx.createRadialGradient(50, 36, 1, 50, 36, 30);
        g.addColorStop(0, '#fff8c8');
        g.addColorStop(0.4, '#fbd070');
        g.addColorStop(1, 'rgba(240,160,80,0)');
        return g;
      });
    } else if (Bm.id === 3) {
      _cachedGrad('atmo_lavaGlow', function() {
        const g = bx.createRadialGradient(VIEW_W * 0.5, VIEW_H * 0.95, 5, VIEW_W * 0.5, VIEW_H * 0.95, VIEW_W * 0.7);
        g.addColorStop(0, 'rgba(255,140,40,0.22)');
        g.addColorStop(0.5, 'rgba(220,60,20,0.12)');
        g.addColorStop(1, 'rgba(80,0,10,0)');
        return g;
      });
    }
    _cachedGrad('cloudBump_' + Bm.id, function() {
      const g = bx.createRadialGradient(-2, -10 * 0.3, 10 * 0.1, 0, 0, 10);
      g.addColorStop(0, Bm.cloudCol);
      g.addColorStop(0.6, Bm.cloudCol);
      g.addColorStop(1, Bm.cloudShade);
      return g;
    });
    _cachedGrad('bushBump_' + Bm.id, function() {
      const g = bx.createRadialGradient(-2, -5, 1, 0, 0, 9);
      g.addColorStop(0, Bm.bushHi);
      g.addColorStop(0.55, Bm.bushMid);
      g.addColorStop(1, Bm.bushLo);
      return g;
    });
  }
})();

function drawHUD() {
  bx.drawImage(getHudStripSprite(), 0, 0);

  const sh = 'rgba(0,0,0,0.85)';
  const labelCol = '#9890b0';   // mono-mute (matches menu --fg-mute)
  const valCol = '#f3eefe';     // crisp white for values

  // When eliminated/finished in MP, show the spectated player's stats
  // instead of the local (dead) player's score/coins.
  var hudScore = score;
  var hudCoins = coins;
  var hudLives = lives;
  if (eliminated && multiplayerMode && spectatorTargetId) {
    for (var hi = 0; hi < racePlayers.length; hi++) {
      if (racePlayers[hi] && racePlayers[hi].id === spectatorTargetId) {
        hudScore = racePlayers[hi].gameScore || 0;
        hudCoins = racePlayers[hi].coins || 0;
        hudLives = racePlayers[hi].alive !== false ? 10 : 0;
        break;
      }
    }
  }

  // Layout: small uppercase mono label on row 4, value on row 14.
  // Columns at px: 6 / 64 / 122 / 168 / 200 (multiplayer fits in same space)
  drawPixelText(bx, 'BLOB',   6,  4, labelCol, sh);
  drawPixelText(bx, String(hudScore).padStart(6, '0'), 6, 14, valCol, sh);

  // Coin glyph (cached gold disc sprite) + count
  bx.drawImage(getHudCoinSprite(), 60, 12);
  drawPixelText(bx, 'x' + String(hudCoins).padStart(2, '0'), 70, 14, valCol, sh);

  drawPixelText(bx, 'LIVES', 100, 4, labelCol, sh);
  const livesStr = 'x' + Math.max(0, hudLives - 1);
  const livesCol = hudLives <= 1 ? '#ff7090' : valCol;
  drawPixelText(bx, livesStr, 100, 14, livesCol, sh);

  drawPixelText(bx, 'ZONE', 138, 4, labelCol, sh);
  drawPixelText(bx, '1-1',  138, 14, valCol, sh);

  if (multiplayerMode) {
    drawPixelText(bx, 'MATCH', 196, 4, labelCol, sh);
    const min = Math.floor(matchTimeRemaining / 60);
    const sec = matchTimeRemaining % 60;
    const timeStr = String(min) + ':' + String(sec).padStart(2, '0');
    const tCol = matchTimeRemaining <= 30 && matchTimeRemaining % 2 === 0 ? '#ff7090' : valCol;
    drawPixelText(bx, timeStr, 196, 14, tCol, sh);
  } else {
    drawPixelText(bx, 'TIME', 210, 4, labelCol, sh);
    const tCol = time <= 30 && time % 2 === 0 ? '#ff7090' : valCol;
    drawPixelText(bx, String(Math.max(0, time)).padStart(3, '0'), 210, 14, tCol, sh);
  }

  drawProgressBar();
}

// Scoreboard scroll state. Reset when scoreboard re-opens; clamped each
// frame against the current player count.
let scoreboardScroll = 0;            // top row index currently shown
let _lastShowScoreboard = false;
// Geometry of the most recent scoreboard render — used by mouse handlers
// for wheel / scrollbar drag hit-testing in canvas-pixel coordinates.
let _scoreboardGeom = null;

function drawScoreboard() {
  // Forced-visible while the match is in its closing countdown so the
  // standings are always on-screen for everyone (alive, eliminated, or
  // finished) right before the final results card slides in.
  var forced = matchEnding && multiplayerMode && racePlayers.length > 0;
  if (!forced && (!showScoreboard || !multiplayerMode || racePlayers.length === 0)) {
    _scoreboardGeom = null;
    _lastShowScoreboard = false;
    return;
  }

  const sorted = racePlayers.slice().sort((a, b) => {
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;
    if (a.finished && b.finished) return (a.finishTime || 0) - (b.finishTime || 0);
    if (!a.alive && b.alive) return 1;
    if (a.alive && !b.alive) return -1;
    return (b.progress || 0) - (a.progress || 0);
  });

  const rowH = 11;
  const titleH = 14;
  const colHeaderH = 12;
  const headerH = titleH + colHeaderH;
  const footerH = 14;            // dedicated footer strip — text + padding

  // Use as much vertical space as we can — fit the panel within ~88% of
  // the viewport so the player can see their blob underneath.
  const panelW = 244;
  const panelX = Math.floor((VIEW_W - panelW) / 2);
  const maxPanelH = Math.floor(VIEW_H * 0.88);
  const maxRowsByHeight = Math.max(4, Math.floor((maxPanelH - headerH - footerH - 5) / rowH));
  const visibleRows = Math.min(sorted.length, maxRowsByHeight);
  // panelH math:
  //  - top:    2px outer dark frame + 1px inner accent
  //  - title:  titleH
  //  - colhdr: colHeaderH (includes 1px divider at the bottom)
  //  - rows:   visibleRows * rowH (row band starts at headerH + 1)
  //  - gap:    2px between last row and footer strip
  //  - footer: footerH
  //  - bottom: 2px outer dark frame + 1px inner accent
  const panelH = headerH + 1 + visibleRows * rowH + 2 + footerH + 2;
  const panelY = Math.floor((VIEW_H - panelH) / 2);

  // Auto-snap scroll to keep "me" visible the FIRST frame the scoreboard
  // is opened; after that respect manual scroll position.
  const myIdx = sorted.findIndex(p => p.id === myPlayerId);
  if (!_lastShowScoreboard) {
    if (myIdx >= 0) {
      scoreboardScroll = Math.max(0, Math.min(sorted.length - visibleRows, myIdx - Math.floor(visibleRows / 2)));
    } else {
      scoreboardScroll = 0;
    }
  }
  _lastShowScoreboard = true;
  const maxScroll = Math.max(0, sorted.length - visibleRows);
  if (scoreboardScroll < 0) scoreboardScroll = 0;
  if (scoreboardScroll > maxScroll) scoreboardScroll = maxScroll;

  // Column anchors (right-edge for numeric columns so values stay
  // perfectly aligned regardless of digit count).
  const colRank   = panelX + 8;        // left edge of rank number
  const colChip   = panelX + 18;       // colour chip
  const colName   = panelX + 26;       // left edge of name text
  const colProgR  = panelX + 132;      // right edge of PROG value
  const colCoinR  = panelX + 168;      // right edge of COIN value
  const colScoreR = panelX + 212;      // right edge of SCORE value
  const colStatR  = panelX + panelW - 12;  // right edge of status flag

  // ---- Retro arcade panel ----
  // Solid two-tone pixel border (dark outer + bright inner), classic SMW /
  // SNES menu look. No alpha hairlines, no soft shadows — every line is
  // a chunky 1-px block. The corners get tiny "notch" pixels removed to
  // mimic stamped-tin arcade cabinet plates.
  // 1) Outer drop shadow (solid pixel-art shadow, 2px offset)
  bx.fillStyle = '#0a0710';
  bx.fillRect(panelX + 2, panelY + 2, panelW, panelH);
  // 2) Outer dark frame (this is the "back plate")
  bx.fillStyle = '#1a1230';
  bx.fillRect(panelX, panelY, panelW, panelH);
  // 3) Bright pixel border
  bx.fillStyle = '#f3eefe';
  bx.fillRect(panelX,            panelY,            panelW, 1); // top
  bx.fillRect(panelX,            panelY + panelH-1, panelW, 1); // bottom
  bx.fillRect(panelX,            panelY,            1, panelH); // left
  bx.fillRect(panelX + panelW-1, panelY,            1, panelH); // right
  // 4) Inner dark cavity (gives that "sunken" arcade-screen feel)
  bx.fillStyle = '#0d0b16';
  bx.fillRect(panelX + 2, panelY + 2, panelW - 4, panelH - 4);
  // 5) Inner purple accent stroke right inside the bright frame
  bx.fillStyle = '#6a4dc6';
  bx.fillRect(panelX + 1, panelY + 1, panelW - 2, 1);
  bx.fillRect(panelX + 1, panelY + panelH - 2, panelW - 2, 1);
  bx.fillRect(panelX + 1, panelY + 1, 1, panelH - 2);
  bx.fillRect(panelX + panelW - 2, panelY + 1, 1, panelH - 2);
  // 6) Corner notches (knock out 1 corner pixel of the bright frame)
  bx.fillStyle = '#0a0710';
  bx.fillRect(panelX,            panelY,            1, 1);
  bx.fillRect(panelX + panelW-1, panelY,            1, 1);
  bx.fillRect(panelX,            panelY + panelH-1, 1, 1);
  bx.fillRect(panelX + panelW-1, panelY + panelH-1, 1, 1);

  // ---- Title strip ----
  // Solid coloured bar across the top of the panel with the title text
  // centred — classic Mario Kart / SMW status header.
  const titleStripY = panelY + 2;
  const titleStripH = titleH;
  bx.fillStyle = '#3a2470';
  bx.fillRect(panelX + 2, titleStripY, panelW - 4, titleStripH);
  // Top highlight + bottom shadow lines on the strip
  bx.fillStyle = '#7050b8';
  bx.fillRect(panelX + 2, titleStripY, panelW - 4, 1);
  bx.fillStyle = '#1a1040';
  bx.fillRect(panelX + 2, titleStripY + titleStripH - 1, panelW - 4, 1);
  // Two purple coin-pixels framing the title
  bx.fillStyle = '#b890ff';
  bx.fillRect(panelX + 7, titleStripY + 5, 3, 3);
  bx.fillRect(panelX + panelW - 10, titleStripY + 5, 3, 3);

  // Show the actual range of ranks present in the room — "1-4" reads as
  // "ranks 1 through 4". Avoids advertising a misleading "/50" cap when
  // the lobby isn't actually full.
  var titleStr = 'RANKINGS  1-' + racePlayers.length;
  var titleW = titleStr.length * 6;
  drawPixelText(bx, titleStr, panelX + Math.floor((panelW - titleW) / 2), titleStripY + 4, '#fff5b0', null);

  // ---- Column header row ----
  var colY = panelY + titleH + 3;
  // Column header strip background (slightly lifted from cavity)
  bx.fillStyle = '#1a1230';
  bx.fillRect(panelX + 3, panelY + titleH + 1, panelW - 6, colHeaderH - 2);

  var hCol = '#b890ff';
  drawPixelText(bx, '#',     colRank, colY, hCol, null);
  drawPixelText(bx, 'NAME',  colName, colY, hCol, null);
  drawPixelText(bx, 'PROG',  colProgR  - 4 * 6, colY, hCol, null);
  drawPixelText(bx, 'COIN',  colCoinR  - 4 * 6, colY, hCol, null);
  drawPixelText(bx, 'SCORE', colScoreR - 5 * 6, colY, hCol, null);

  // Solid pixel divider between header and rows
  bx.fillStyle = '#6a4dc6';
  bx.fillRect(panelX + 3, panelY + headerH - 1, panelW - 6, 1);
  bx.fillStyle = '#3a2870';
  bx.fillRect(panelX + 3, panelY + headerH, panelW - 6, 1);

  // Row clip so dragging the scrollbar can't bleed text outside the panel.
  bx.save();
  bx.beginPath();
  bx.rect(panelX + 3, panelY + headerH + 1, panelW - 6, visibleRows * rowH);
  bx.clip();

  const startIdx = Math.floor(scoreboardScroll);
  for (var i = 0; i < visibleRows; i++) {
    var rowIdx = startIdx + i;
    if (rowIdx >= sorted.length) break;
    var p = sorted[rowIdx];
    var col = getPlayerDisplayColor(p.color || 'lavender');
    var rowY = panelY + headerH + 1 + i * rowH;
    var isMe = p.id === myPlayerId;
    var textY = rowY + 3;       // vertically centred inside an 11px row

    // Alternating row backgrounds — solid flat colours for arcade feel.
    if (rowIdx % 2 === 1) {
      bx.fillStyle = '#15102a';
      bx.fillRect(panelX + 3, rowY, panelW - 6, rowH);
    }
    if (isMe) {
      // Bright row tint in your blob colour, framed with a chunky 2-px
      // left bar so your row is instantly findable.
      bx.fillStyle = '#2a1c50';
      bx.fillRect(panelX + 3, rowY, panelW - 6, rowH);
      bx.fillStyle = col;
      bx.fillRect(panelX + 3, rowY, 2, rowH);
      bx.fillRect(panelX + panelW - 5, rowY, 2, rowH);
    }

    // Rank cell. Gold for #1, silver for #2, bronze for #3, mute after.
    var rankCol = '#9890b0';
    if (rowIdx === 0) rankCol = '#ffd86a';
    else if (rowIdx === 1) rankCol = '#d8d8e8';
    else if (rowIdx === 2) rankCol = '#e09870';
    drawPixelText(bx, String(rowIdx + 1), colRank, textY, rankCol, null);

    // 3x3 colour chip before the name (with 1-px highlight pixel) so
    // every player has a recognisable identity badge.
    bx.fillStyle = col;
    bx.fillRect(colChip, rowY + 4, 3, 3);
    bx.fillStyle = '#fff';
    bx.globalAlpha = 0.6;
    bx.fillRect(colChip, rowY + 4, 1, 1);
    bx.globalAlpha = 1;

    var nameStr = truncateName(p.name || 'Blobby', 12);
    var nameCol = isMe ? '#fff5b0' : col;
    drawPixelText(bx, nameStr, colName, textY, nameCol, null);

    var pctStr = Math.round((p.progress || 0) * 100) + '%';
    drawPixelText(bx, pctStr, colProgR - pctStr.length * 6, textY, '#f3eefe', null);

    var coinStr = String(p.coins || 0);
    drawPixelText(bx, coinStr, colCoinR - coinStr.length * 6, textY, '#f0d050', null);

    var scoreStr = String(p.gameScore || 0);
    drawPixelText(bx, scoreStr, colScoreR - scoreStr.length * 6, textY, '#f3eefe', null);

    var statusStr = '';
    if (p.finished) statusStr = (p.finishTime / 1000).toFixed(1) + 'S';
    else if (!p.alive) statusStr = 'OUT';
    var statusCol = p.finished ? '#80e8a0' : '#ff7090';
    if (statusStr) drawPixelText(bx, statusStr, colStatR - statusStr.length * 6, textY, statusCol, null);

    // Faint dotted divider under each row (skipped on the last one).
    if (i < visibleRows - 1 && rowIdx < sorted.length - 1) {
      bx.fillStyle = '#22183a';
      for (var dx = 6; dx < panelW - 10; dx += 2) {
        bx.fillRect(panelX + dx, rowY + rowH - 1, 1, 1);
      }
    }
  }

  bx.restore();

  // ---- Scrollbar ----
  // Chunky pixel-art scrollbar (4 px wide track, solid colours, no alpha)
  // so it reads as a retro arcade element rather than a modern UI widget.
  const sbX = panelX + panelW - 9;
  const sbW = 4;
  const sbY = panelY + headerH + 2;
  const sbH = visibleRows * rowH - 4;
  let thumbY = sbY, thumbH = sbH;
  if (sorted.length > visibleRows) {
    // Track: dark recessed channel
    bx.fillStyle = '#0a0710';
    bx.fillRect(sbX, sbY, sbW, sbH);
    bx.fillStyle = '#1a1040';
    bx.fillRect(sbX + 1, sbY + 1, sbW - 2, sbH - 2);
    // Thumb
    thumbH = Math.max(10, Math.round(sbH * (visibleRows / sorted.length)));
    const trackTravel = sbH - thumbH;
    const t = maxScroll > 0 ? (scoreboardScroll / maxScroll) : 0;
    thumbY = sbY + Math.round(t * trackTravel);
    bx.fillStyle = '#b890ff';
    bx.fillRect(sbX, thumbY, sbW, thumbH);
    bx.fillStyle = '#e6d8ff';
    bx.fillRect(sbX, thumbY, sbW, 1);                       // top hi
    bx.fillRect(sbX, thumbY, 1, thumbH);                    // left hi
    bx.fillStyle = '#6a4dc6';
    bx.fillRect(sbX, thumbY + thumbH - 1, sbW, 1);          // bottom shade
    bx.fillRect(sbX + sbW - 1, thumbY, 1, thumbH);          // right shade
    // Center grip dots
    bx.fillStyle = '#fff';
    var gripY = thumbY + Math.floor(thumbH / 2) - 2;
    bx.fillRect(sbX + 1, gripY,     2, 1);
    bx.fillRect(sbX + 1, gripY + 2, 2, 1);
    bx.fillRect(sbX + 1, gripY + 4, 2, 1);

    // Pixel-arrow chevrons above/below the track
    bx.fillStyle = scoreboardScroll > 0 ? '#fff5b0' : '#3a2870';
    bx.fillRect(sbX + 1, sbY - 3, 2, 1);
    bx.fillRect(sbX, sbY - 2, 4, 1);
    bx.fillStyle = scoreboardScroll < maxScroll ? '#fff5b0' : '#3a2870';
    bx.fillRect(sbX, sbY + sbH + 1, 4, 1);
    bx.fillRect(sbX + 1, sbY + sbH + 2, 2, 1);
  }

  // ---- Footer ----
  // Dedicated footer strip mirroring the title strip — solid background,
  // top hairline, vertically centred text. The strip has its own
  // reserved height (footerH) so text never collides with the bottom
  // bright frame.
  const footStripY = panelY + panelH - footerH - 2;
  bx.fillStyle = '#22183a';
  bx.fillRect(panelX + 3, footStripY, panelW - 6, footerH);
  bx.fillStyle = '#3a2870';
  bx.fillRect(panelX + 3, footStripY, panelW - 6, 1);     // top hi
  bx.fillStyle = '#0d0b16';
  bx.fillRect(panelX + 3, footStripY + footerH - 1, panelW - 6, 1); // bot shadow
  // Footer text Y — vertically centred in a 14px strip with a 5-px font
  const footTextY = footStripY + Math.floor((footerH - 5) / 2) + 1;

  const counterStr = (startIdx + 1) + '-' + Math.min(sorted.length, startIdx + visibleRows) + ' / ' + sorted.length;
  drawPixelText(bx, counterStr, panelX + 7, footTextY, '#b890ff', null);

  // Status / hint on the right side. Show different text depending on
  // whether the player is alive, eliminated, or finished — so a dead
  // player looking at the standings sees a clear "WAITING FOR MATCH"
  // rather than just a generic scroll hint.
  var rightStr;
  if (myPlayerFinished) {
    rightStr = 'YOU FINISHED!';
  } else if (eliminated) {
    rightStr = (Math.floor(globalTick / 30) % 2) ? 'WAITING FOR MATCH' : 'WAITING...';
  } else if (sorted.length > visibleRows) {
    rightStr = 'WHEEL/DRAG';
  } else {
    rightStr = 'TAB TO HIDE';
  }
  var rightCol = myPlayerFinished ? '#80e8a0' : (eliminated ? '#ff90a8' : '#9890b0');
  var rightW = rightStr.length * 6;
  drawPixelText(bx, rightStr, panelX + panelW - rightW - 9, footTextY, rightCol, null);

  _scoreboardGeom = {
    panelX, panelY, panelW, panelH,
    rowsArea: { x: panelX + 1, y: panelY + headerH, w: panelW - 2, h: visibleRows * rowH },
    scrollbar: { x: sbX, y: sbY, w: sbW, h: sbH, thumbY, thumbH },
    totalRows: sorted.length,
    visibleRows,
    maxScroll,
  };
}

// Translate a raw mouse event to internal canvas-pixel coordinates
// (VIEW_W x VIEW_H) regardless of CSS / DPR scaling.
function _mouseToCanvasPx(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = (e.clientX - rect.left) / rect.width * VIEW_W;
  const sy = (e.clientY - rect.top) / rect.height * VIEW_H;
  return { x: sx, y: sy };
}

// Wheel scroll while the scoreboard is open. Each notch advances by one
// row; trackpads with finer deltas accumulate fractionally so they still
// scroll. Wheel events are only consumed when the scoreboard is up so
// the page can still scroll otherwise.
canvas.addEventListener('wheel', function(e) {
  if (!showScoreboard || !multiplayerMode || !_scoreboardGeom) return;
  e.preventDefault();
  const step = e.deltaMode === 0 ? (e.deltaY / 30) : (e.deltaY > 0 ? 1 : -1);
  scoreboardScroll += step;
  // Clamping happens in drawScoreboard each frame.
}, { passive: false });

// Click-and-drag on the scrollbar thumb (or click in the empty track to
// page jump). Stays attached even when scoreboard isn't open — the
// handlers no-op safely.
let _sbDrag = null; // { startMouseY, startScroll }
canvas.addEventListener('mousedown', function(e) {
  if (!showScoreboard || !multiplayerMode || !_scoreboardGeom) return;
  if (e.button !== 0) return;
  const { x, y } = _mouseToCanvasPx(e);
  const sb = _scoreboardGeom.scrollbar;
  const inTrackX = x >= sb.x - 3 && x <= sb.x + sb.w + 3;
  const inTrackY = y >= sb.y && y <= sb.y + sb.h;
  if (!inTrackX || !inTrackY) return;
  e.preventDefault();
  if (y >= sb.thumbY && y <= sb.thumbY + sb.thumbH) {
    _sbDrag = { startMouseY: y, startScroll: scoreboardScroll };
  } else {
    // Page jump: clicking above the thumb scrolls up by visibleRows,
    // below scrolls down. Then begin a drag from new position.
    const dir = y < sb.thumbY ? -1 : 1;
    scoreboardScroll += dir * _scoreboardGeom.visibleRows;
    _sbDrag = { startMouseY: y, startScroll: scoreboardScroll };
  }
});
window.addEventListener('mousemove', function(e) {
  if (!_sbDrag || !_scoreboardGeom || !showScoreboard) return;
  const { y } = _mouseToCanvasPx(e);
  const sb = _scoreboardGeom.scrollbar;
  const trackTravel = Math.max(1, sb.h - sb.thumbH);
  const dY = y - _sbDrag.startMouseY;
  const ratio = dY / trackTravel;
  scoreboardScroll = _sbDrag.startScroll + ratio * _scoreboardGeom.maxScroll;
});
window.addEventListener('mouseup', function() { _sbDrag = null; });

function drawLevel() {
  const startTX = Math.max(0, Math.floor(camera.rx / TILE) - 1);
  const endTX = Math.min(LEVEL_WIDTH, Math.ceil((camera.rx + VIEW_W) / TILE) + 1);

  // Precompute bump particle lookup once per frame instead of running
  // particles.find() per visible tile (was O(particles * tiles) ≈ thousands
  // of comparisons every frame).
  let bumpMap = null;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.type === 'bump') {
      if (!bumpMap) bumpMap = new Map();
      bumpMap.set(p.x + ',' + p.origY, p);
    }
  }

  for (let ty = 0; ty < LEVEL_HEIGHT; ty++) {
    const row = levelMap[ty];
    const rowY = ty * TILE;
    for (let tx = startTX; tx < endTX; tx++) {
      const tile = row[tx];
      if (tile !== 0) {
        let drawY = rowY;
        if (bumpMap) {
          const bump = bumpMap.get((tx * TILE) + ',' + rowY);
          if (bump) {
            const bt = 1 - bump.timer / 8;
            drawY -= Math.sin(bt * Math.PI) * 6;
          }
        }
        drawTile(tx * TILE, drawY, tile);
      }
    }
  }
}

function drawBlobIcon(bcx, bcy, r, colorId, dead) {
  const c = getColorOption(colorId);
  const bodyCol = c.hat, shadCol = c.overalls, feetCol = c.brown, highCol = c.skin;
  bx.fillStyle = shadCol;
  bx.beginPath();
  bx.ellipse(bcx - 0.5, bcy + 0.5, r + 0.8, r + 0.8, 0, 0, Math.PI * 2);
  bx.fill();
  const bGrad = bx.createRadialGradient(bcx + r * 0.2, bcy - r * 0.2, r * 0.08, bcx - r * 0.08, bcy + r * 0.08, r * 1.05);
  bGrad.addColorStop(0, highCol);
  bGrad.addColorStop(0.45, bodyCol);
  bGrad.addColorStop(1, shadCol);
  bx.fillStyle = bGrad;
  bx.beginPath();
  bx.ellipse(bcx, bcy, r, r, 0, 0, Math.PI * 2);
  bx.fill();
  bx.save();
  bx.globalAlpha = 0.35;
  bx.fillStyle = '#fcfcfc';
  bx.beginPath();
  bx.ellipse(bcx + r * 0.2, bcy - r * 0.3, r * 0.3, r * 0.2, -0.4, 0, Math.PI * 2);
  bx.fill();
  bx.restore();
  const es = r / 6.5;
  const eyeR = 2.8 * es;
  const pupR = 1.3 * es;
  const eyeY = bcy - r * 0.15;
  const e1x = bcx - 1.8 * es;
  const e2x = bcx + 1.8 * es;
  if (!dead) {
    bx.fillStyle = '#fcfcfc';
    bx.beginPath(); bx.arc(e1x, eyeY, eyeR, 0, Math.PI * 2); bx.fill();
    bx.beginPath(); bx.arc(e2x, eyeY, eyeR, 0, Math.PI * 2); bx.fill();
    bx.fillStyle = '#101020';
    bx.beginPath(); bx.arc(e1x + 0.3, eyeY + 0.3, pupR, 0, Math.PI * 2); bx.fill();
    bx.beginPath(); bx.arc(e2x + 0.3, eyeY + 0.3, pupR, 0, Math.PI * 2); bx.fill();
    bx.fillStyle = '#fcfcfc';
    const sr = 0.5 * es;
    bx.beginPath(); bx.arc(e1x - 0.3, eyeY - 0.5, sr, 0, Math.PI * 2); bx.fill();
    bx.beginPath(); bx.arc(e2x - 0.3, eyeY - 0.5, sr, 0, Math.PI * 2); bx.fill();
    const smX = bcx + 0.3;
    const smY = eyeY + eyeR + 1.0 * es;
    bx.strokeStyle = '#202030';
    bx.lineWidth = 0.7;
    bx.lineCap = 'round';
    bx.beginPath();
    bx.arc(smX, smY, 1.3 * es, 0.2, Math.PI - 0.2);
    bx.stroke();
    bx.lineCap = 'butt';
  } else {
    bx.strokeStyle = '#202030';
    bx.lineWidth = 0.9;
    bx.lineCap = 'round';
    const xr = 1.6 * es;
    [e1x, e2x].forEach(function(ex) {
      bx.beginPath();
      bx.moveTo(ex - xr, eyeY - xr); bx.lineTo(ex + xr, eyeY + xr);
      bx.moveTo(ex + xr, eyeY - xr); bx.lineTo(ex - xr, eyeY + xr);
      bx.stroke();
    });
    bx.lineCap = 'butt';
  }
  const fw = r * 0.42, fh = r * 0.28;
  const fGrad1 = bx.createRadialGradient(bcx - r * 0.35, bcy + r - fh * 0.2, 0, bcx - r * 0.35, bcy + r, fw);
  fGrad1.addColorStop(0, feetCol); fGrad1.addColorStop(1, shadCol);
  bx.fillStyle = fGrad1;
  bx.beginPath(); bx.ellipse(bcx - r * 0.35, bcy + r + 0.5, fw, fh, 0, 0, Math.PI * 2); bx.fill();
  const fGrad2 = bx.createRadialGradient(bcx + r * 0.35, bcy + r - fh * 0.2, 0, bcx + r * 0.35, bcy + r, fw);
  fGrad2.addColorStop(0, feetCol); fGrad2.addColorStop(1, shadCol);
  bx.fillStyle = fGrad2;
  bx.beginPath(); bx.ellipse(bcx + r * 0.35, bcy + r + 0.5, fw, fh, 0, 0, Math.PI * 2); bx.fill();
}

function render() {
  // Helper: paint a brutalist panel surface (deep black, 1px stroke,
  // 3px hard offset shadow) — matches the menu treatment and gives every
  // game-state overlay a consistent "console card" look.
  function drawBrutalistPanel(x, y, w, h, accent) {
    accent = accent || '#6a4dc6';
    // Hard offset shadow first so it sits behind the surface
    bx.fillStyle = accent;
    bx.fillRect(x + 3, y + 3, w, h);
    // Surface
    bx.fillStyle = '#0d0b16';
    bx.fillRect(x, y, w, h);
    // Stroke (top + bottom + sides as thin hairlines)
    bx.fillStyle = 'rgba(255,255,255,0.32)';
    bx.fillRect(x, y, w, 1);
    bx.fillRect(x, y + h - 1, w, 1);
    bx.fillRect(x, y, 1, h);
    bx.fillRect(x + w - 1, y, 1, h);
    // Tiny purple accent tick in the top-left corner
    bx.fillStyle = '#b890ff';
    bx.fillRect(x + 4, y + 4, 6, 1);
    bx.fillRect(x + 4, y + 4, 1, 4);
  }

  if (gameState === 'gameover') {
    // ---- Backdrop: solid black + dim red vignette + sparse stars ---
    bx.fillStyle = '#000';
    bx.fillRect(0, 0, VIEW_W, VIEW_H);
    var goVig = bx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 0, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.7);
    goVig.addColorStop(0, 'rgba(176,40,40,0.18)');
    goVig.addColorStop(1, 'rgba(0,0,0,0)');
    bx.fillStyle = goVig;
    bx.fillRect(0, 0, VIEW_W, VIEW_H);
    for (var gs = 0; gs < 24; gs++) {
      var gsx = (gs * 73 + 17) % VIEW_W;
      var gsy = (gs * 41 + 23) % VIEW_H;
      var gsT = (Math.floor(globalTick / 14) + gs) % 4;
      bx.fillStyle = gsT === 0 ? '#fff5b0' : '#3a2030';
      bx.fillRect(gsx, gsy, 1, 1);
    }

    // ---- Retro arcade panel ----
    var goPanelW = 176, goPanelH = 108;
    var goPanelX = (VIEW_W - goPanelW) >> 1;
    var goPanelY = ((VIEW_H - goPanelH) >> 1) - 6;

    // Drop shadow
    bx.fillStyle = '#0a0710';
    bx.fillRect(goPanelX + 3, goPanelY + 3, goPanelW, goPanelH);
    // Outer dark frame
    bx.fillStyle = '#2a1020';
    bx.fillRect(goPanelX, goPanelY, goPanelW, goPanelH);
    // Bright pixel border
    bx.fillStyle = '#f3eefe';
    bx.fillRect(goPanelX,                  goPanelY,                    goPanelW, 1);
    bx.fillRect(goPanelX,                  goPanelY + goPanelH - 1,     goPanelW, 1);
    bx.fillRect(goPanelX,                  goPanelY,                    1,        goPanelH);
    bx.fillRect(goPanelX + goPanelW - 1,   goPanelY,                    1,        goPanelH);
    // Inner cavity
    bx.fillStyle = '#0d0b16';
    bx.fillRect(goPanelX + 2, goPanelY + 2, goPanelW - 4, goPanelH - 4);
    // Inner red accent stroke (game-over mood)
    bx.fillStyle = '#a13050';
    bx.fillRect(goPanelX + 1,                 goPanelY + 1,                 goPanelW - 2, 1);
    bx.fillRect(goPanelX + 1,                 goPanelY + goPanelH - 2,      goPanelW - 2, 1);
    bx.fillRect(goPanelX + 1,                 goPanelY + 1,                 1,            goPanelH - 2);
    bx.fillRect(goPanelX + goPanelW - 2,      goPanelY + 1,                 1,            goPanelH - 2);
    // Corner notches
    bx.fillStyle = '#0a0710';
    bx.fillRect(goPanelX,                goPanelY,                    1, 1);
    bx.fillRect(goPanelX + goPanelW - 1, goPanelY,                    1, 1);
    bx.fillRect(goPanelX,                goPanelY + goPanelH - 1,     1, 1);
    bx.fillRect(goPanelX + goPanelW - 1, goPanelY + goPanelH - 1,     1, 1);

    // ---- Title strip in red ----
    var go_tsY = goPanelY + 2;
    var go_tsH = 14;
    bx.fillStyle = '#5a1830';
    bx.fillRect(goPanelX + 2, go_tsY, goPanelW - 4, go_tsH);
    bx.fillStyle = '#a14060';
    bx.fillRect(goPanelX + 2, go_tsY, goPanelW - 4, 1);
    bx.fillStyle = '#1a0410';
    bx.fillRect(goPanelX + 2, go_tsY + go_tsH - 1, goPanelW - 4, 1);
    bx.fillStyle = '#ff7090';
    bx.fillRect(goPanelX + 7, go_tsY + 5, 3, 3);
    bx.fillRect(goPanelX + goPanelW - 10, go_tsY + 5, 3, 3);

    var go_titleStr = 'WORLD  1-1';
    var go_titleW = go_titleStr.length * 6;
    drawPixelText(bx, go_titleStr, goPanelX + Math.floor((goPanelW - go_titleW) / 2), go_tsY + 4, '#ffd0d8', null);

    // Sad blob portrait, slowly drifting down a hair (defeated body language)
    var goBob = Math.round(Math.sin(globalTick * 0.04) * 0.8);
    drawBlobIcon(VIEW_W / 2, goPanelY + 44 + goBob, 13, mySelectedColor, true);

    // ---- Big "GAME OVER" — 2x scaled pixel font, soft red flicker ---
    var goPhase = Math.floor(globalTick / 8) % 6;
    var goCol = (goPhase === 5) ? '#ff7090' : '#ffd86a';
    var goText = 'GAME OVER';
    bx.save();
    var goTextX = ((VIEW_W - goText.length * 12) / 2) | 0;
    bx.translate(goTextX, goPanelY + 64);
    bx.scale(2, 2);
    drawPixelText(bx, goText, 0, 0, goCol, '#1a0410');
    bx.restore();

    // ---- Footer strip with blinking prompt ----
    var go_fsY = goPanelY + goPanelH - 14;
    bx.fillStyle = '#22183a';
    bx.fillRect(goPanelX + 2, go_fsY, goPanelW - 4, 12);
    bx.fillStyle = '#3a2870';
    bx.fillRect(goPanelX + 2, go_fsY, goPanelW - 4, 1);

    var goAlpha = 0.55 + 0.45 * Math.sin(globalTick * 0.06);
    bx.save();
    bx.globalAlpha = goAlpha;
    var goPrompt = 'PRESS ENTER TO RETRY';
    var goPW = goPrompt.length * 6;
    drawPixelText(bx, goPrompt, ((VIEW_W - goPW) / 2) | 0, go_fsY + 3, '#b890ff', null);
    bx.restore();

    ctx.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, canvas.width, canvas.height);
    drawScanlines();
    return;
  }
  if (gameState === 'lifeLost') {
    // `globalTick` only advances while gameState === 'playing', so during
    // this screen it's frozen on whatever value it had at the moment of
    // death. That makes every animation here static and, worse, can land
    // the GET READY blink on its "off" phase for the whole screen so the
    // prompt never appears. Use `gameOverTimer` (which IS incremented
    // every frame in this state) as the local animation clock.
    var llTick = gameOverTimer;
    // ---- Backdrop: solid arcade black with a soft purple glow + a
    // sparse field of pixel stars twinkling like an attract screen.
    bx.fillStyle = '#000';
    bx.fillRect(0, 0, VIEW_W, VIEW_H);
    var llVig = bx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 0, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.55);
    llVig.addColorStop(0, 'rgba(106,77,198,0.18)');
    llVig.addColorStop(1, 'rgba(0,0,0,0)');
    bx.fillStyle = llVig;
    bx.fillRect(0, 0, VIEW_W, VIEW_H);
    for (var ls = 0; ls < 28; ls++) {
      var lsx = (ls * 73 + 17) % VIEW_W;
      var lsy = (ls * 41 + 23) % VIEW_H;
      var lsTwinkle = (Math.floor(llTick / 12) + ls) % 5;
      bx.fillStyle = lsTwinkle === 0 ? '#fff5b0'
                   : lsTwinkle === 1 ? '#b890ff'
                   : '#3a2870';
      bx.fillRect(lsx, lsy, 1, 1);
    }

    // ---- Retro arcade panel (matches the scoreboard styling) ----
    var llW = 168, llH = 100;
    var llX = (VIEW_W - llW) >> 1;
    var llY = ((VIEW_H - llH) >> 1) - 6;
    // Drop shadow
    bx.fillStyle = '#0a0710';
    bx.fillRect(llX + 3, llY + 3, llW, llH);
    // Outer dark frame
    bx.fillStyle = '#1a1230';
    bx.fillRect(llX, llY, llW, llH);
    // Bright pixel border
    bx.fillStyle = '#f3eefe';
    bx.fillRect(llX,            llY,            llW, 1);
    bx.fillRect(llX,            llY + llH - 1,  llW, 1);
    bx.fillRect(llX,            llY,            1,   llH);
    bx.fillRect(llX + llW - 1,  llY,            1,   llH);
    // Inner cavity
    bx.fillStyle = '#0d0b16';
    bx.fillRect(llX + 2, llY + 2, llW - 4, llH - 4);
    // Inner purple accent stroke
    bx.fillStyle = '#6a4dc6';
    bx.fillRect(llX + 1,           llY + 1,           llW - 2, 1);
    bx.fillRect(llX + 1,           llY + llH - 2,     llW - 2, 1);
    bx.fillRect(llX + 1,           llY + 1,           1,       llH - 2);
    bx.fillRect(llX + llW - 2,     llY + 1,           1,       llH - 2);
    // Corner notches
    bx.fillStyle = '#0a0710';
    bx.fillRect(llX,            llY,            1, 1);
    bx.fillRect(llX + llW - 1,  llY,            1, 1);
    bx.fillRect(llX,            llY + llH - 1,  1, 1);
    bx.fillRect(llX + llW - 1,  llY + llH - 1,  1, 1);

    // ---- Decorative starfield inside the dark cavity ----
    // Gives the black area a sense of depth and, importantly, makes the
    // sparkle pixels next to the lives number read as part of an ambient
    // field instead of looking like stray background bleed. Positions
    // are deterministic; brightness twinkles on the local lifeLost clock.
    var cavityPadX = 6;
    var cavityW = llW - 2 * cavityPadX;
    var cavityTop = llY + 18;          // below title strip
    var cavityH = (llY + llH - 18) - cavityTop - 2; // above footer strip
    for (var cs = 0; cs < 16; cs++) {
      var csx = llX + cavityPadX + ((cs * 47 + 13) % cavityW);
      var csy = cavityTop + ((cs * 29 + 7) % cavityH);
      var csTw = (Math.floor(llTick / 14) + cs * 3) % 6;
      if (csTw === 5) continue; // blink off occasionally
      bx.fillStyle = csTw === 0 ? '#fff5b0'
                   : csTw === 1 ? '#b890ff'
                   : csTw === 2 ? '#6a4dc6'
                   : '#3a2870';
      bx.fillRect(csx, csy, 1, 1);
    }

    // ---- Title strip: solid purple band, biome zone label ----
    var ll_tsY = llY + 2;
    var ll_tsH = 14;
    bx.fillStyle = '#3a2470';
    bx.fillRect(llX + 2, ll_tsY, llW - 4, ll_tsH);
    bx.fillStyle = '#7050b8';
    bx.fillRect(llX + 2, ll_tsY, llW - 4, 1);
    bx.fillStyle = '#1a1040';
    bx.fillRect(llX + 2, ll_tsY + ll_tsH - 1, llW - 4, 1);
    // Coin pixels framing the title
    bx.fillStyle = '#ffd86a';
    bx.fillRect(llX + 7, ll_tsY + 5, 3, 3);
    bx.fillRect(llX + llW - 10, ll_tsY + 5, 3, 3);

    var ll_titleStr = 'WORLD  1-1';
    var ll_titleW = ll_titleStr.length * 6;
    drawPixelText(bx, ll_titleStr, llX + Math.floor((llW - ll_titleW) / 2), ll_tsY + 4, '#fff5b0', null);

    // ---- Blob + lives counter (Mario-style "MARIO x N") ----
    // Soft idle bob on the blob portrait so the screen feels alive.
    var bobY = Math.round(Math.sin(llTick * 0.08) * 1.2);
    var blobR = 13;
    // groupY is chosen so the blob + LIVES LEFT caption are centred
    // vertically inside the dark cavity — exactly equal padding above
    // the blob and below the caption (11 / 11).
    var groupY = llY + 40;
    // Blob is centred horizontally in the card so it sits on the same
    // vertical axis as the LIVES LEFT caption below. The "x N" counter
    // flows off to the right of the blob in classic "MARIO x N" style.
    var livesCount = Math.max(0, lives - 1);
    var bigLivesStr = String(livesCount);
    var groupGap = 6;
    var blobX   = llX + (llW >> 1);
    var xMarkX  = blobX + blobR + groupGap;
    var bigNumX = xMarkX + 6 + groupGap;

    drawBlobIcon(blobX, groupY + bobY, blobR, mySelectedColor, false);
    // Tiny ground shadow ellipse under the blob
    bx.save();
    bx.globalAlpha = 0.45;
    bx.fillStyle = '#000';
    bx.beginPath();
    bx.ellipse(blobX, groupY + blobR + 2, blobR * 0.7, 2, 0, 0, Math.PI * 2);
    bx.fill();
    bx.restore();

    // The "x" character — small pixel, in cream
    drawPixelText(bx, 'X', xMarkX, groupY - 3, '#fff5b0', 'rgba(0,0,0,0.85)');

    // Big chunky 2x-scaled lives number — reads like the SMW life
    // counter. We just draw the same pixel font scaled up via context
    // transform so it stays perfectly crisp.
    bx.save();
    bx.translate(bigNumX, groupY - 8);
    bx.scale(2, 2);
    drawPixelText(bx, bigLivesStr, 0, 0, '#fff5b0', '#1a1040');
    bx.restore();

    // Sparkles next to the big number for that arcade pop
    var sparkPhase = Math.floor(llTick / 6) % 3;
    if (sparkPhase === 0) {
      bx.fillStyle = '#fff5b0';
      bx.fillRect(bigNumX + 26, groupY - 6, 2, 2);
      bx.fillStyle = '#ffd86a';
      bx.fillRect(bigNumX + 26, groupY - 6, 1, 1);
    } else if (sparkPhase === 1) {
      bx.fillStyle = '#b890ff';
      bx.fillRect(bigNumX + 28, groupY + 4, 2, 2);
    }

    // Footer divider strip (mirrors title strip). Height 16 gives 4 px of
    // dark padding above + below the 7-row pixel text (plus the 1 px top
    // accent line acting as a frame).
    var ll_fsY = llY + llH - 18;
    bx.fillStyle = '#22183a';
    bx.fillRect(llX + 2, ll_fsY, llW - 4, 16);
    bx.fillStyle = '#3a2870';
    bx.fillRect(llX + 2, ll_fsY, llW - 4, 1);

    // ---- "LIVES LEFT" caption (centred). Anchored to the blob group
    // (10 empty rows under the blob's bottom edge → "+11" offset) so
    // the whole content block stays together and is vertically centred
    // inside the dark cavity with exactly equal padding above the blob
    // and below the caption.
    var llCap = 'LIVES LEFT';
    var llCapW = llCap.length * 6;
    drawPixelText(bx, llCap, llX + Math.floor((llW - llCapW) / 2), groupY + blobR + 11, '#b890ff', null);

    // Animated "GET READY!" prompt — smooth sinusoidal breathe in green
    // like a SMB1 ready prompt. The previous version also gated the
    // prompt behind an on/off phase cycle, which made it fully vanish
    // for ~0.3 s every beat; now it just modulates alpha between ~0.55
    // and 1.0 so it pulses without ever disappearing.
    var grAlpha = 0.775 + 0.225 * Math.sin(llTick * 0.22);
    bx.save();
    bx.globalAlpha = grAlpha;
    var grStr = 'GET READY!';
    var grW = grStr.length * 6;
    drawPixelText(bx, grStr, llX + Math.floor((llW - grW) / 2), ll_fsY + 5, '#80e8a0', null);
    bx.restore();

    ctx.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, canvas.width, canvas.height);
    drawScanlines();
    return;
  }

  camera.rx = Math.floor(camera.x);
  bx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawBackground();
  drawLevel();
  drawCheckpoint();
  drawFlagPole();
  drawCastle();
  drawMapCoins();
  drawBossGate();
  drawItems();
  drawEntities();
  drawBoss();
  drawBossFireballs();
  drawBossShockwaves();
  drawMarioFireballs();
  drawParticles();
  drawRemoteBlobs();
  drawMario();
  drawHUD();
  // NOTE: drawScoreboard() is intentionally called LATER (after the
  // eliminated / win overlays) so the player can still pull up the
  // standings even while the death/wait overlay is on screen.

  // Floating HUD message ("ENTERING FROSTPEAK PASS!" etc.) — flat brutalist
  // chip with thin hairline, slides in from above and fades out at the end.
  if (hudMessage) {
    var hm = hudMessage;
    var fadeIn = Math.min(1, (hm.maxLife - hm.life) / 15);
    var fadeOut = Math.min(1, hm.life / 20);
    var hmAlpha = Math.min(fadeIn, fadeOut);
    var slideY = (1 - fadeIn) * -8;
    var hmW = hm.text.length * 6 + 24;
    var hmX = Math.round((VIEW_W - hmW) / 2);
    var hmY = Math.round(VIEW_H * 0.32 + slideY);
    bx.save();
    bx.globalAlpha = hmAlpha * 0.85;
    bx.fillStyle = '#0d0b16';
    bx.fillRect(hmX, hmY - 4, hmW, 17);
    bx.fillStyle = 'rgba(255,255,255,0.20)';
    bx.fillRect(hmX, hmY - 4, hmW, 1);
    bx.fillRect(hmX, hmY + 12, hmW, 1);
    bx.fillStyle = '#b890ff';
    bx.fillRect(hmX, hmY - 4, 2, 17);
    bx.globalAlpha = hmAlpha;
    var textX = Math.round((VIEW_W - hm.text.length * 6) / 2);
    drawPixelText(bx, hm.text, textX, hmY + 1, '#f3eefe', null);
    bx.restore();
  }

  if (eliminated && multiplayerMode) {
    // ---- Spectator HUD ----
    // The old full-screen "ELIMINATED" curtain is gone — the camera is
    // now following another player so we let the world breathe through
    // and just paint two thin strips: a top KO badge and a bottom
    // spectator info bar with target name + control hints. Tab still
    // pulls the live scoreboard up over everything.

    // -- Top status badge (left-anchored, blinks like a classic CRT alert) --
    var elPhase = Math.floor(globalTick / 7) % 2;
    var statusLabel = myPlayerFinished ? '/ MISSION COMPLETE' : '/ KO  ELIMINATED';
    var koW = statusLabel.length * 6 + 12;
    bx.fillStyle = 'rgba(7,6,12,0.85)';
    bx.fillRect(4, 4, koW, 14);
    bx.fillStyle = myPlayerFinished ? '#308050' : '#a13050';
    bx.fillRect(4, 4, koW, 1);
    bx.fillRect(4, 17, koW, 1);
    bx.fillStyle = myPlayerFinished ? '#80e8a0' : '#ff7090';
    bx.fillRect(4, 4, 2, 14);
    drawPixelText(bx, statusLabel, 10, 9, elPhase ? (myPlayerFinished ? '#80e8a0' : '#ff7090') : (myPlayerFinished ? '#a0f8c0' : '#ff90a8'), null);

    // Resolve the spectated target's display name (truncated like
    // every other UI surface uses 12 chars + ellipsis).
    var spName = '';
    if (spectatorTargetId) {
      for (var ri = 0; ri < racePlayers.length; ri++) {
        if (racePlayers[ri] && racePlayers[ri].id === spectatorTargetId) {
          spName = truncateName(racePlayers[ri].name || '', 12);
          break;
        }
      }
    }

    // -- Bottom spectator strip --
    // Left half: status / spectating info. Right half: control hints.
    var bandH = 14;
    var bandY = VIEW_H - bandH - 2;
    bx.fillStyle = 'rgba(7,6,12,0.85)';
    bx.fillRect(0, bandY, VIEW_W, bandH);
    bx.fillStyle = '#6a4dc6';
    bx.fillRect(0, bandY, VIEW_W, 1);
    bx.fillRect(0, bandY + bandH - 1, VIEW_W, 1);

    if (myPlayerFinished) {
      // Player finished their run: show combined status + name on the
      // left, and only TAB SCORES on the right (no swap hint — they're
      // waiting, not actively browsing). Top-left badge already says
      // "/ MISSION COMPLETE", so "RUN COMPLETE" here is enough context.
      var doneStr = 'RUN COMPLETE';
      var donePhase = Math.floor(globalTick / 8) % 2;
      drawPixelText(bx, doneStr, 6, bandY + 5,
        donePhase ? '#80e8a0' : '#a0f8c0', null);
      if (spName) {
        drawPixelText(bx, '·', 6 + doneStr.length * 6 + 4, bandY + 5, '#5a4a8a', null);
        drawPixelText(bx, spName, 6 + (doneStr.length + 1) * 6 + 8, bandY + 5, '#f3eefe', null);
      }
      drawPixelText(bx, 'TAB SCORES', VIEW_W - 9 * 6 - 6, bandY + 5, '#9890b0', null);
    } else if (spName) {
      // Normal spectating: show / SPECTATING · <name>. Use shorter hints
      // if the name is long enough to collide with the right side.
      drawPixelText(bx, '/ SPECTATING', 6, bandY + 5, '#9890b0', null);
      drawPixelText(bx, '·', 6 + 12 * 6 + 4, bandY + 5, '#5a4a8a', null);
      drawPixelText(bx, spName, 6 + 13 * 6 + 8, bandY + 5, '#f3eefe', null);
      var hintStr = (getSpectatableIds().length > 1) ? '< > SWAP   TAB SCORES' : 'TAB SCORES';
      var leftEnd = 6 + 13 * 6 + 8 + spName.length * 6;
      var rightStart = VIEW_W - hintStr.length * 6 - 6;
      if (leftEnd >= rightStart) hintStr = 'TAB SCORES';
      drawPixelText(bx, hintStr, VIEW_W - hintStr.length * 6 - 6, bandY + 5, '#9890b0', null);
    } else {
      var pulseAlpha = 0.55 + 0.45 * Math.sin(globalTick * 0.05);
      bx.save();
      bx.globalAlpha = pulseAlpha;
      drawPixelText(bx, '> WAITING FOR PLAYERS...', 6, bandY + 5, '#b890ff', null);
      bx.restore();
      var hintStr = (getSpectatableIds().length > 1) ? '< > SWAP   TAB SCORES' : 'TAB SCORES';
      var leftEnd = 6 + '> WAITING FOR PLAYERS...'.length * 6;
      var rightStart = VIEW_W - hintStr.length * 6 - 6;
      if (leftEnd >= rightStart) hintStr = 'TAB SCORES';
      drawPixelText(bx, hintStr, VIEW_W - hintStr.length * 6 - 6, bandY + 5, '#9890b0', null);
    }

    // HUD message (biome banner, "X ELIMINATED" toast, etc.) still
    // slides in from the top so the spectator gets the same context
    // updates as everyone else — just shifted up so it doesn't collide
    // with the KO badge.
    if (hudMessage) {
      var hm2 = hudMessage;
      var fi2 = Math.min(1, (hm2.maxLife - hm2.life) / 15);
      var fo2 = Math.min(1, hm2.life / 20);
      var a2 = Math.min(fi2, fo2);
      var sy2 = (1 - fi2) * -8;
      var w2 = hm2.text.length * 6 + 24;
      var x2 = Math.round((VIEW_W - w2) / 2);
      var y2 = Math.round(VIEW_H * 0.18 + sy2);
      bx.save();
      bx.globalAlpha = a2 * 0.85;
      bx.fillStyle = '#0d0b16';
      bx.fillRect(x2, y2 - 4, w2, 17);
      bx.fillStyle = 'rgba(255,255,255,0.20)';
      bx.fillRect(x2, y2 - 4, w2, 1);
      bx.fillRect(x2, y2 + 12, w2, 1);
      bx.fillStyle = '#b890ff';
      bx.fillRect(x2, y2 - 4, 2, 17);
      bx.globalAlpha = a2;
      drawPixelText(bx, hm2.text, Math.round((VIEW_W - hm2.text.length * 6) / 2), y2 + 1, '#f3eefe', null);
      bx.restore();
    }
  }

  if (gameState === 'win' && !multiplayerMode) {
    // Single-player victory card — wide brutalist panel listing the score
    // breakdown line by line.
    var winPW = 200, winPH = 116;
    var winPX = (VIEW_W - winPW) >> 1;
    var winPY = ((VIEW_H - winPH) >> 1) - 8;
    drawBrutalistPanel(winPX, winPY, winPW, winPH);

    drawPixelText(bx, '/ MISSION COMPLETE', winPX + 14, winPY + 12, '#9890b0', null);

    var titlePhase = Math.floor(globalTick / 5) % 2;
    var titleCol = titlePhase ? '#f3eefe' : '#e6deff';
    const ccText = 'ADVENTURE CLEAR!';
    const ccW = ccText.length * 6;
    drawPixelText(bx, ccText, Math.round((VIEW_W - ccW) / 2), winPY + 28, titleCol, 'rgba(0,0,0,0.85)');

    var rowX = winPX + 18;
    var labelCol = '#9890b0';
    var valCol = '#f3eefe';
    drawPixelText(bx, 'FLAG BONUS',                rowX,        winPY + 46, labelCol, null);
    drawPixelText(bx, String(flagBonus),           winPX + winPW - 60, winPY + 46, valCol, 'rgba(0,0,0,0.85)');
    drawPixelText(bx, 'TIME BONUS',                rowX,        winPY + 56, labelCol, null);
    drawPixelText(bx, String(timeBonus),           winPX + winPW - 60, winPY + 56, valCol, 'rgba(0,0,0,0.85)');
    drawPixelText(bx, 'COINS x200',                rowX,        winPY + 66, labelCol, null);
    drawPixelText(bx, String(coins * 200),         winPX + winPW - 60, winPY + 66, valCol, 'rgba(0,0,0,0.85)');
    drawPixelText(bx, 'ENEMIES KO',                rowX,        winPY + 76, labelCol, null);
    drawPixelText(bx, String(enemiesKilled),       winPX + winPW - 60, winPY + 76, valCol, 'rgba(0,0,0,0.85)');

    // Divider before total
    bx.fillStyle = 'rgba(255,255,255,0.18)';
    bx.fillRect(winPX + 14, winPY + 86, winPW - 28, 1);

    drawPixelText(bx, 'TOTAL',                     rowX,        winPY + 90, '#b890ff', null);
    drawPixelText(bx, String(Math.round(score)),   winPX + winPW - 60, winPY + 90, '#b890ff', 'rgba(0,0,0,0.85)');

    var prAlpha = 0.55 + 0.45 * Math.sin(globalTick * 0.06);
    bx.save();
    bx.globalAlpha = prAlpha;
    const prText = '> PRESS ENTER TO PLAY AGAIN';
    const prW = prText.length * 6;
    drawPixelText(bx, prText, Math.round((VIEW_W - prW) / 2), winPY + winPH - 12, '#b890ff', null);
    bx.restore();
  }

  // Tab scoreboard renders LAST so it sits on top of any pause /
  // eliminated / win overlays. The player should always be able to
  // pull up live standings until the match results are shown.
  drawScoreboard();

  if (screenShake > 0.3) {
    var shX = (Math.random() - 0.5) * screenShake;
    var shY = (Math.random() - 0.5) * screenShake;
    ctx.save();
    ctx.translate(shX * (canvas.width / VIEW_W), shY * (canvas.height / VIEW_H));
    ctx.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  } else {
    ctx.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, canvas.width, canvas.height);
  }
  drawScanlines();
}

// ================================================================
// GAME LOOP (fixed timestep at 60fps)
// ================================================================
const TARGET_FPS = 60;
const FIXED_DT = 1000 / TARGET_FPS;
let lastFrameTime = 0;
let accumulator = 0;

function gameLoop(timestamp) {
  if (lastFrameTime === 0) lastFrameTime = timestamp;
  const delta = Math.min(timestamp - lastFrameTime, 100);
  lastFrameTime = timestamp;
  accumulator += delta;

  let steps = 0;
  while (accumulator >= FIXED_DT && steps < 4) {
    update();
    accumulator -= FIXED_DT;
    steps++;
  }

  if (steps > 0 || gameState !== 'playing') {
    render();
  }
  requestAnimationFrame(gameLoop);
}

// ================================================================
// PAUSE MENU
// ================================================================
function pauseGame() {
  paused = true;
  emit('paused');
}

function resumeGame() {
  paused = false;
  emit('unpaused');
}

function quitToMenu() {
  stopStarMusic();
  paused = false;
  emit('unpaused');
  gameState = 'menu';
  if (multiplayerMode) {
    cleanupRoom();
  }
  multiplayerMode = false;
  isHost = false;
  currentRoomCode = '';
  emit('quit_to_menu');
}

// ================================================================
// MULTIPLAYER (WebSocket)
// ================================================================
const MATCH_DURATION = 300;
// Lives granted at the start of every multiplayer match. Solo runs keep
// the classic 3-life pool; MP gets 5 because long-form races punish a
// single unlucky death disproportionately and "Play Again" friction is
// higher when half the lobby is sitting in spectator mode waiting for
// the round to wrap.
const MP_LIVES = 10;
const myPlayerId = 'p_' + Math.random().toString(36).substring(2, 10);
var ws = null;

// ---- Realtime co-presence -----------------------------------------
// Local player streams its position/animation to the server at this
// rate. Receivers buffer snapshots and render REMOTE_INTERP_MS behind
// real time so playback stays smooth even with mild jitter (standard
// snapshot-interpolation netcode pattern).
//
// 30 Hz + 80 ms render delay + cubic-Hermite interpolation gives
// remote players motion that's visually indistinguishable from local
// at 60 fps, while keeping bandwidth at ~120 KB/s downstream per
// client in a fully packed 50-player room. Both knobs are safe to
// dial down (e.g. 20 Hz / 100 ms) for tighter bandwidth budgets.
const REMOTE_SEND_HZ = 30;
const REMOTE_SEND_MS = Math.round(1000 / REMOTE_SEND_HZ);
const REMOTE_INTERP_MS = 80;
const REMOTE_AGE_OUT_MS = 3000;
var lastStateSend = 0;
// id -> { snaps: [{t,x,y,vx,facing,anim,frame,size,star,dead}], lastUpdate }
var remoteStates = new Map();

// Animation enum shared between sender and renderer. Numbers are sent
// over the wire so do NOT renumber without bumping both sides.
const ANIM_IDLE = 0;
const ANIM_RUN = 1;
const ANIM_JUMP = 2;
const ANIM_FALL = 3;
const ANIM_DJUMP = 4;
const ANIM_DEAD = 5;
const ANIM_SKID = 6;
const ANIM_CROUCH = 7;
let multiplayerMode = false;
let isHost = false;
let currentRoomCode = '';
let roomStartTime = 0;
let roomMatchDuration = MATCH_DURATION;
let matchEnding = false;
let lastProgressWrite = 0;
let mySelectedColor = localStorage.getItem('blobColor') || 'lavender';

const MARIO_COLOR_OPTIONS = [
  { id: 'lavender', label: 'Lavender', hat: '#b8a0e0', overalls: '#8868b8', skin: '#d8c8f0', brown: '#5838a0' },
  { id: 'hotpink',  label: 'Hot Pink', hat: '#f06098', overalls: '#c83870', skin: '#f8a0c0', brown: '#a02050' },
  { id: 'blue',     label: 'Blue',     hat: '#5090e0', overalls: '#3060b0', skin: '#90b8f0', brown: '#1840a0' },
  { id: 'mint',     label: 'Mint',     hat: '#58d8a8', overalls: '#30a878', skin: '#a0f0d0', brown: '#188860' },
  { id: 'orange',   label: 'Orange',   hat: '#f09030', overalls: '#c86810', skin: '#f8c080', brown: '#a05000' },
  { id: 'red',      label: 'Red',      hat: '#e04848', overalls: '#b02828', skin: '#f08888', brown: '#901818' },
  { id: 'cyan',     label: 'Cyan',     hat: '#40d0e8', overalls: '#20a0b8', skin: '#88e8f0', brown: '#087898' },
  { id: 'magenta',  label: 'Magenta',  hat: '#c848d0', overalls: '#9828a0', skin: '#e090e8', brown: '#781888' },
  { id: 'yellow',   label: 'Yellow',   hat: '#e8d040', overalls: '#b8a020', skin: '#f0e888', brown: '#908010' },
  { id: 'lime',     label: 'Lime',     hat: '#80d840', overalls: '#58a828', skin: '#b0f080', brown: '#388818' },
  { id: 'gold',     label: 'Gold',     hat: '#e8a828', overalls: '#c08010', skin: '#f0c868', brown: '#906000' },
  { id: 'white',    label: 'White',    hat: '#e0e0e8', overalls: '#a8a8b8', skin: '#f0f0f8', brown: '#787888' },
  { id: 'coral',    label: 'Coral',    hat: '#f07868', overalls: '#c84840', skin: '#f8b0a0', brown: '#983028' },
  { id: 'teal',     label: 'Teal',     hat: '#40b8c0', overalls: '#208890', skin: '#80d8e0', brown: '#086870' },
  { id: 'rose',     label: 'Rose',     hat: '#e070a0', overalls: '#b04878', skin: '#f0a8c8', brown: '#882858' },
  { id: 'sky',      label: 'Sky',      hat: '#78b8f0', overalls: '#4890c8', skin: '#b0d8f8', brown: '#2870a0' },
  { id: 'tan',      label: 'Tan',      hat: '#d0a870', overalls: '#a08048', skin: '#e8c898', brown: '#786030' },
  { id: 'plum',     label: 'Plum',     hat: '#9868c8', overalls: '#6848a0', skin: '#c0a0e0', brown: '#402878' },
  { id: 'sage',     label: 'Sage',     hat: '#78b888', overalls: '#489060', skin: '#a0d8b0', brown: '#287048' },
  { id: 'peach',    label: 'Peach',    hat: '#f0b878', overalls: '#c89050', skin: '#f8d0a0', brown: '#987038' },
  { id: 'indigo',   label: 'Indigo',   hat: '#4868c8', overalls: '#2848a0', skin: '#8098e8', brown: '#183078' },
  { id: 'aqua',     label: 'Aqua',     hat: '#48d0c8', overalls: '#28a098', skin: '#80e8e0', brown: '#187870' },
  { id: 'crimson',  label: 'Crimson',  hat: '#d83848', overalls: '#a82838', skin: '#e87880', brown: '#781828' },
  { id: 'olive',    label: 'Olive',    hat: '#90a840', overalls: '#688028', skin: '#b8c870', brown: '#486018' },
];

function getColorOption(colorId) {
  return MARIO_COLOR_OPTIONS.find(c => c.id === colorId) || MARIO_COLOR_OPTIONS[0];
}

function buildPaletteFromColor(colorId) {
  const c = getColorOption(colorId);
  return { 1: c.hat, 2: c.overalls, 3: '#fcfcfc', 4: '#1a1a2e', 5: c.brown };
}

function buildFirePaletteFromColor(colorId) {
  const c = getColorOption(colorId);
  return { 1: '#fcfcfc', 2: '#d0c8e0', 3: '#fcfcfc', 4: '#1a1a2e', 5: '#ff6848' };
}

// Name display helper. Input forms and the server already cap names
// to 12 chars, but this is the single source of truth for every spot
// that renders a player name (blob nameplate, scoreboard, lobby,
// results) so an overlong name is guaranteed to never overflow its
// container anywhere.
function truncateName(name, maxLen) {
  if (!name) return '';
  maxLen = maxLen || 12;
  if (name.length <= maxLen) return name;
  if (maxLen <= 3) return name.substring(0, maxLen);
  return name.substring(0, maxLen - 3) + '...';
}

function getPlayerDisplayColor(colorId) {
  const c = getColorOption(colorId);
  return c.hat;
}

// Engine-level helper: glue files call this when the user picks a
// colour in their UI. We persist the choice locally and, if we're in
// a multiplayer lobby, broadcast it to the server so other clients
// can see the swatch update / mark it taken.
function setSelectedColor(colorId) {
  if (!colorId) return;
  mySelectedColor = colorId;
  try { localStorage.setItem('blobColor', colorId); } catch (e) {}
  if (ws && multiplayerMode) {
    ws.emit('update_color', { color: colorId });
  }
}

var prevRoomState = null;

function connectSocket() {
  if (ws && ws.connected) return;
  var ioOpts = { reconnection: true, reconnectionDelay: 500, reconnectionAttempts: 10 };
  ws = GAME_SERVER_URL ? io(GAME_SERVER_URL, ioOpts) : io(ioOpts);

  ws.on('room_state', function(data) {
    var playersList = Object.values(data.players || {});
    isHost = data.hostId === myPlayerId;

    // Color picking is intentionally UNRESTRICTED in multiplayer:
    // many players can join a single room, so we let the color set
    // wrap around / repeat freely. Each blob is uniquely identified
    // in-game by its nameplate above the sprite (and in the lobby /
    // results panel by name), so colour collisions don't impair
    // readability. Emit an empty taken-list so all four color-picker
    // UI surfaces (game.js renderColorPicker, embeddable-glue's
    // renderLobbyColorPicker + applyTakenColorsToOptionSelector,
    // standalone-glue's renderColorPicker) treat every swatch as
    // available — no X overlay, no .taken CSS dim, no pointer-events
    // block.
    var takenColors = [];

    switch (data.state) {
      case 'waiting':
        if (prevRoomState !== 'waiting') {
          gameState = 'menu';
          remoteStates.clear();
          // Hard-reset per-match state on the lobby transition. Without
          // this, a player who was eliminated (or whose lives hit 0)
          // last round carries `eliminated=true` / `lives=0` into the
          // next match — `updateMario()` early-returns on `eliminated`
          // and the blob is frozen in place. `resetLevel()` deliberately
          // skips these flags in MP (so mid-match respawns don't clear
          // them), so the lobby boundary is the right place to clean up.
          eliminated = false;
          myPlayerFinished = false;
          // MP gives a slightly bigger life pool than solo (5 vs 3) so a
          // single bad jump can't quietly knock you out of a long-form
          // multiplayer race.
          lives = MP_LIVES;
          deathTimer = 0;
          winTimer = 0;
          flagDescending = false;
          castleEnterTimer = 0;
          matchEnding = false;
          spectatorTargetId = null;
          showScoreboard = false;
          if (typeof mario === 'object' && mario) mario.dead = false;
          hudMessage = null;
        }
        emit('lobby_state', {
          code: currentRoomCode,
          players: playersList,
          isHost: isHost,
          takenColors: takenColors,
        });
        break;

      case 'countdown':
        if (prevRoomState !== 'countdown') {
          emit('countdown_started');
        }
        break;

      case 'playing':
        if (prevRoomState !== 'playing') {
          resumeGame();
          gameState = 'playing';
          time = 400;
          checkpointIndex = -1;
          resetLevel();
          roomStartTime = data.startTime;
          roomMatchDuration = data.matchDuration || MATCH_DURATION;
          matchTimeRemaining = roomMatchDuration;
          matchEnding = false;
          spectatorTargetId = null;
          showScoreboard = false;
          remoteStates.clear();
          lastStateSend = 0;
          _idleLatch = null;
          emit('match_started');
        } else {
          // Always sync roomStartTime from server on every room_state
          // broadcast (covers reconnection mid-match and any edge case
          // where the original init was missed).
          roomStartTime = data.startTime;
          roomMatchDuration = data.matchDuration || MATCH_DURATION;
          if (matchTimeRemaining > 0) matchEnding = false;
        }
        if (!eliminated) {
          var localProgress = Math.min(1, mario.x / ((LEVEL_WIDTH - 15) * TILE));
          for (var pi = 0; pi < playersList.length; pi++) {
            if (playersList[pi].id === myPlayerId) {
              playersList[pi].progress = localProgress;
              playersList[pi].coins = coins;
              playersList[pi].gameScore = score;
              playersList[pi].alive = !mario.dead && lives > 0;
              break;
            }
          }
        }
        racePlayers = playersList;
        emit('race_progress', { players: playersList });
        break;

      case 'finished':
        if (prevRoomState !== 'finished') {
          matchEnding = false;
          gameState = 'menu';
          if (data.rankings) {
            emit('match_finished', { rankings: data.rankings, isHost: isHost });
          }
        }
        break;
    }

    prevRoomState = data.state;
  });

  ws.on('room_closed', function() {
    cleanupRoom();
    multiplayerMode = false;
    isHost = false;
    currentRoomCode = '';
    emit('room_closed');
  });

  ws.on('player_eliminated', function(data) {
    if (gameState === 'playing') {
      hudMessage = { text: truncateName(data.name, 12) + ' ELIMINATED', life: 150, maxLife: 150 };
    }
  });

  // Realtime world snapshot: positions/animations of every active
  // player in the room. Stamp each snapshot with our local receipt
  // time so interpolation works regardless of client/server clock skew.
  ws.on('world_tick', function(msg) {
    if (!multiplayerMode || !msg || !msg.p) return;
    var now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    var arr = msg.p;
    for (var i = 0; i < arr.length; i++) {
      var e = arr[i];
      if (!e || !e.i || e.i === myPlayerId) continue;
      var rs = remoteStates.get(e.i);
      if (!rs) { rs = { snaps: [] }; remoteStates.set(e.i, rs); }
      rs.snaps.push({
        t: now,
        x: e.x | 0,
        y: e.y | 0,
        vx: +e.v || 0,
        vy: +e.w || 0,
        facing: e.f < 0 ? -1 : 1,
        anim: e.a | 0,
        frame: e.n | 0,
        size: e.s | 0,
        star: e.st ? 1 : 0,
        dead: e.d ? 1 : 0,
      });
      // Keep only the last few snapshots — interpolation never looks
      // back further than INTERP_MS, so a small ring is enough.
      if (rs.snaps.length > 6) rs.snaps.shift();
      rs.lastUpdate = now;
    }
  });

  // Receive block state events from other players, used when spectating.
  // We always update the per-player backing store so switching targets
  // picks up the correct state.  But we only update the global Sets that
  // the renderer reads when this event belongs to the player we're
  // currently spectating (or when we're alive and should see all state).
  ws.on('block_event', function(msg) {
    if (!multiplayerMode || !msg || !msg.p) return;
    var pid = msg.p;
    var bs = _playerBlockStates.get(pid);
    if (!bs) {
      bs = { hitBlocks: new Set(), emptyBlocks: new Set(), breakBlocks: new Set() };
      _playerBlockStates.set(pid, bs);
    }
    var showFx = eliminated && pid === spectatorTargetId;
    var useGlobally = !eliminated || pid === spectatorTargetId;

    if (msg.hit) {
      bs.hitBlocks.add(msg.hit);
      if (useGlobally) hitBlocks.add(msg.hit);
      if (showFx) {
        var parts = msg.hit.split(',');
        particles.push({
          x: parseInt(parts[0], 10) * TILE,
          y: parseInt(parts[1], 10) * TILE,
          type: 'bump', timer: 8, origY: parseInt(parts[1], 10) * TILE,
        });
        playSound('bump');
      }
    }

    if (msg.empty) {
      bs.emptyBlocks.add(msg.empty);
      if (useGlobally) emptyBlocks.add(msg.empty);
      if (showFx) {
        spawnSpectatorItem(msg.empty);
      }
    }

    if (msg.break) {
      bs.breakBlocks.add(msg.break);
      if (useGlobally) breakBlocks.add(msg.break);
      var parts = msg.break.split(',');
      var btx = parseInt(parts[0], 10);
      var bty = parseInt(parts[1], 10);
      if (useGlobally && levelMap[bty] && levelMap[bty][btx]) levelMap[bty][btx] = 0;
      if (showFx) {
        for (var di = 0; di < 4; di++) {
          particles.push({
            type: 'debris',
            x: btx * TILE + (di % 2) * 8,
            y: bty * TILE + Math.floor(di / 2) * 8,
            vx: (di % 2 === 0 ? -1.5 : 1.5) + (Math.random() - 0.5),
            vy: -3.5 - Math.random() * 1.5,
            life: 45,
          });
        }
        particles.push({
          x: btx * TILE, y: bty * TILE,
          type: 'bump', timer: 8, origY: bty * TILE,
        });
        playSound('brick');
      }
    }
  });

  // Receive entity kill events from other players.
  // Finds the closest matching local entity and marks it dead so the
  // spectator's view stays in sync with the player they're watching.
  ws.on('entity_kill', function(msg) {
    if (!multiplayerMode || !msg || !msg.p || !msg.entity) return;
    var kp = _playerEntityKills.get(msg.p);
    if (!kp) { kp = []; _playerEntityKills.set(msg.p, kp); }
    kp.push({
      entity: msg.entity, x: msg.x, y: msg.y,
      killType: msg.killType || 'stomp',
      shell: !!msg.shell, deathTimer: msg.deathTimer || 0,
      flat: !!msg.flat, remove: !!msg.remove, bossHp: msg.bossHp,
    });
    if (kp.length > 500) kp.splice(0, kp.length - 500);
    if (!eliminated || msg.p !== spectatorTargetId) return;
    applyEntityKillToLocal(msg);
  });

  // Full entity kill state request — counterpart to get_block_state.
  // Note: handled via ACK callback in requestSpectatorEntityKillState(), not here.
}

// Apply a single entity_kill payload to the local entity/boss list.
// Matches by entity type and proximity so position drift between clients
// doesn't prevent the kill from rendering.
function applyEntityKillToLocal(data) {
  if (data.entity === 'boss') {
    if (!boss || !boss.alive) return;
    boss.hp = data.bossHp !== undefined ? data.bossHp : boss.hp;
    if (boss.hp <= 0 && boss.alive) {
      boss.alive = false;
      boss.dying = true;
      boss.vy = -5;
      boss.deathTimer = 0;
      screenShake = Math.max(screenShake, 8);
      playSound('bossdie');
    }
    return;
  }
  // Regular entity: find closest alive match by type within 64px
  var best = null, bestDist = 64 * 64;
  for (var ei = 0; ei < entities.length; ei++) {
    var e = entities[ei];
    if (!e.alive || e.type !== data.entity) continue;
    var dx = e.x - data.x, dy = e.y - data.y;
    var d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = e; }
  }
  if (!best) return;
  best.alive = false;
  best.vx = 0;
  best.vy = 0;
  if (data.remove) {
    best.remove = true;
  } else if (data.flat) {
    best.flat = true;
    best.flatTimer = 30;
  }
  if (data.deathTimer) {
    best.deathTimer = data.deathTimer;
  }
  if (data.shell && best.type === 'koopa') {
    best.shell = true;
    best.shellMoving = false;
    best.h = 16;
    best.y += 8;
  }
}

// Spawn the item that came out of a ?-block on the spectator's screen.
// `key` is a "tx,ty" string, e.g. "10,5".
function spawnSpectatorItem(key) {
  var parts = key.split(',');
  var tx = parseInt(parts[0], 10), ty = parseInt(parts[1], 10);
  var tile = getTile(tx, ty);
  if (tile === 3) {
    coinAnims.push({ x: tx * TILE + 4, y: ty * TILE - 16, vy: -3.5, life: 35 });
    playSound('coin');
  } else if (tile === 6) {
    addScorePopup(tx * TILE, ty * TILE - 16, '1UP');
    playSound('1up');
  } else if (tile === 7) {
    items.push({
      type: 'star',
      x: tx * TILE, y: ty * TILE - TILE,
      vx: 1.2, vy: -2,
      w: 16, h: 16,
      emerging: true, emergeY: ty * TILE,
      active: true,
    });
    playSound('bump');
  } else if (tile === 4) {
    var rs = remoteStates.get(spectatorTargetId);
    var big = rs && rs.snaps.length > 0 && rs.snaps[rs.snaps.length - 1].size >= 1;
    items.push({
      type: big ? 'flower' : 'mushroom',
      x: tx * TILE, y: ty * TILE - TILE,
      vx: big ? 0 : 1.0, vy: 0,
      w: 16, h: 16,
      emerging: true, emergeY: ty * TILE,
      active: true,
    });
    playSound('bump');
  }
}

function writeProgress() {
  if (!ws || !multiplayerMode || gameState !== 'playing' || eliminated) return;
  var now = Date.now();
  if (now - lastProgressWrite < 500) return;
  lastProgressWrite = now;
  ws.emit('progress', {
    progress: Math.min(1, mario.x / ((LEVEL_WIDTH - 15) * TILE)),
    coins: coins,
    gameScore: score,
  });
}

// Stream the local player's position + animation hint to the server.
// Throttled to REMOTE_SEND_MS so the network stays light. Allowed in
// 'playing' AND 'win' (so opponents see your flag descent + castle
// walk), but suppressed once eliminated/finished tear-down has run.
//
// Idle-position latch ---------------------------------------------
// Physics friction is multiplicative (`vx *= 0.9`-ish per frame) so
// `mario.vx` asymptotes to zero but never quite reaches it. Sub-pixel
// residuals keep inching `mario.x` forward after the player has
// visually stopped. Even though we clamp `sendVx`/`sendVy` to exactly
// 0 below our 0.1 threshold, `Math.round(mario.x)` will eventually
// step across an integer boundary — at which point the receiver sees
// two zero-velocity snapshots with different positions and Hermite-
// interpolates a 1-px slide. From the other player's POV the stationary
// blob visibly "ticks" forward ~1 px every few seconds.
// Latching the rounded outgoing coordinate at the moment we declare
// ourselves idle guarantees bit-identical packets until real input
// resumes, so two consecutive snapshots collapse the curve to a
// perfectly flat constant.
var _idleLatch = null;
function sendPlayerState() {
  if (!ws || !ws.connected || !multiplayerMode) return;
  if (gameState !== 'playing' && gameState !== 'win') return;
  if (eliminated) return;
  if (!mario) return;
  var now = Date.now();
  if (now - lastStateSend < REMOTE_SEND_MS) return;
  lastStateSend = now;

  var anim;
  if (mario.dead) anim = ANIM_DEAD;
  else if (mario.doubleJumpAnim > 0) anim = ANIM_DJUMP;
  else if (!mario.onGround) anim = (mario.vy < 0) ? ANIM_JUMP : ANIM_FALL;
  else if (mario.skidding) anim = ANIM_SKID;
  else if (mario.crouching && mario.big) anim = ANIM_CROUCH;
  else if (Math.abs(mario.vx) > 0.15) anim = ANIM_RUN;
  else anim = ANIM_IDLE;

  var size = mario.fire ? 2 : (mario.big ? 1 : 0);

  // Snap sub-pixel-per-frame residuals to exactly zero. Physics can
  // leave a tiny ±0.0x value in vx/vy after friction or after landing,
  // which the receiver's Hermite interpolation would otherwise read as
  // a real tangent — producing visible micro-drift / flicker on
  // remotes that are actually standing still. Quantizing here means
  // two consecutive idle snapshots are bit-identical and the curve
  // collapses to a flat constant.
  var sendVx = Math.abs(mario.vx) < 0.1 ? 0 : mario.vx;
  var sendVy = Math.abs(mario.vy) < 0.1 ? 0 : mario.vy;

  var sx = Math.round(mario.x);
  var sy = Math.round(mario.y);

  // If the animation classifier says IDLE, the player is *visually*
  // standing still — so put that truth on the wire regardless of
  // whatever microscopic residuals the physics is still chewing on.
  // The anim threshold (|vx| <= 0.15) is wider than the velocity-clamp
  // threshold (< 0.1), which left a 0.1–0.15 deceleration window where
  // the blob was drawn as IDLE locally but still emitted non-zero vx
  // and creeping positions, producing 1-px "ticks" on remotes.
  // Latching at the anim boundary + forcing outgoing velocities to 0
  // closes that window: two consecutive idle packets are bit-identical
  // so the receiver's Hermite curve collapses to a flat constant and
  // the blob renders perfectly still.
  var stillIdle = (anim === ANIM_IDLE && mario.onGround && !mario.dead && !mario.crouching);
  if (stillIdle) {
    if (!_idleLatch) _idleLatch = { x: sx, y: sy };
    sx = _idleLatch.x;
    sy = _idleLatch.y;
    sendVx = 0;
    sendVy = 0;
  } else {
    _idleLatch = null;
  }

  ws.emit('player_state', {
    x: sx,
    y: sy,
    vx: sendVx,
    vy: sendVy,
    facing: mario.facing,
    anim: anim,
    frame: globalTick & 0xff,
    size: size,
    star: mario.starPower > 0 ? 1 : 0,
    dead: mario.dead ? 1 : 0,
  });
}

function writePlayerFinished() {
  if (!ws) return;
  ws.emit('player_finished', {
    finishTime: Date.now() - roomStartTime,
    coins: coins,
    gameScore: score,
  });
}

function writePlayerDied() {
  if (!ws) return;
  ws.emit('player_died', {
    coins: coins,
    gameScore: score,
    progress: Math.min(1, mario.x / ((LEVEL_WIDTH - 15) * TILE)),
  });
}

function cleanupRoom() {
  if (ws) ws.emit('leave_room');
  prevRoomState = null;
  roomStartTime = 0;
  roomMatchDuration = 300;
  matchTimeRemaining = 300;
  matchEnding = false;
  eliminated = false;
  myPlayerFinished = false;
  lives = MP_LIVES;
  score = 0;
  coins = 0;
  time = 400;
  deathTimer = 0;
  winTimer = 0;
  flagDescending = false;
  castleEnterTimer = 0;
  hudMessage = null;
  lastProgressWrite = 0;
  lastStateSend = 0;
  _idleLatch = null;
  spectatorTargetId = null;
  showScoreboard = false;
  if (typeof mario === 'object' && mario) mario.dead = false;
  remoteStates.clear();
  _playerBlockStates.clear();
  _playerEntityKills.clear();
}

window.addEventListener('beforeunload', function() {
  if (ws && multiplayerMode) {
    ws.emit('leave_room');
  }
});

// ================================================================
// ENGINE API (called by glue files: standalone-glue.js / embeddable-glue.js)
// ================================================================
//
// The engine no longer touches any menu DOM. It only owns the
// gameplay surface (#gameCanvas, #crtOverlay) and the localStorage
// scanline preference. Every menu-driven transition (lobby <-> game
// <-> results) is exposed as either an imperative function call OR an
// event emitted on the bus declared at the top of this IIFE.
//
// Glue files MUST subscribe before calling any function that may
// trigger an event during the same tick.

function _engineStartSinglePlayer(opts) {
  opts = opts || {};
  if (opts.color) setSelectedColor(opts.color);
  multiplayerMode = false;
  gameState = 'playing';
  lives = 5;
  time = 400;
  checkpointIndex = -1;
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    var cp = new URLSearchParams(location.search).get('checkpoint');
    if (cp !== null) {
      // ?checkpoint=N maps as: 0=start (no flag), 1=snow, 2=desert,
      // 3=lava, 4=pre-boss. Internally CHECKPOINT_XS is zero-indexed
      // and only contains the visible flags, so subtract 1.
      var n = parseInt(cp, 10);
      if (n === 0) {
        checkpointIndex = -1;
      } else if (n >= 1 && n <= CHECKPOINT_XS.length) {
        checkpointIndex = n - 1;
      }
    }
  }
  resetLevel();
  emit('match_started');
}

function _engineCreateRoom(opts) {
  opts = opts || {};
  var name = ((opts.name || 'Blobby') + '').trim().substring(0, 12) || 'Blobby';
  var color = opts.color || mySelectedColor;
  var matchDuration = opts.matchDuration || MATCH_DURATION;
  if (color) setSelectedColor(color);
  emit('create_room_pending');
  return new Promise(function(resolve) {
    connectSocket();
    ws.emit('create_room', {
      playerId: myPlayerId,
      name: name,
      color: mySelectedColor,
      matchDuration: matchDuration,
    }, function(res) {
      if (res && res.ok) {
        currentRoomCode = res.code;
        isHost = true;
        multiplayerMode = true;
        // Synthesize an immediate lobby_state so glue can repaint
        // before the first server room_state arrives.
        emit('lobby_state', {
          code: res.code,
          players: [{ id: myPlayerId, name: name, color: mySelectedColor }],
          isHost: true,
          takenColors: [],
        });
        resolve({ ok: true, code: res.code });
      } else {
        emit('create_room_failed', { error: (res && res.error) || 'Failed to create room' });
        resolve({ ok: false, error: (res && res.error) || 'Failed to create room' });
      }
    });
  });
}

function _engineJoinRoom(opts) {
  opts = opts || {};
  var code = ((opts.code || '') + '').trim().toUpperCase();
  var name = ((opts.name || 'Blobby') + '').trim().substring(0, 12) || 'Blobby';
  var color = opts.color || mySelectedColor;
  if (color) setSelectedColor(color);
  if (!code) {
    emit('join_room_failed', { error: 'Enter a room code' });
    return Promise.resolve({ ok: false, error: 'Enter a room code' });
  }
  emit('join_room_pending');
  return new Promise(function(resolve) {
    connectSocket();
    ws.emit('join_room', {
      code: code,
      playerId: myPlayerId,
      name: name,
      color: mySelectedColor,
    }, function(res) {
      if (res && res.ok) {
        currentRoomCode = res.code;
        isHost = false;
        multiplayerMode = true;
        resolve({ ok: true, code: res.code });
      } else {
        emit('join_room_failed', { error: (res && res.error) || 'Failed to join room' });
        resolve({ ok: false, error: (res && res.error) || 'Failed to join room' });
      }
    });
  });
}

function _engineStartMatch() {
  if (!ws || !isHost) return;
  ws.emit('start_game');
}

function _engineReturnToLobby() {
  if (!ws || !isHost) return;
  ws.emit('return_to_lobby');
}

function _engineLeaveRoom() {
  cleanupRoom();
  multiplayerMode = false;
  isHost = false;
  currentRoomCode = '';
  gameState = 'menu';
  emit('room_closed');
}

window.EmbeddablobEngine = {
  startSinglePlayer: _engineStartSinglePlayer,
  createRoom: _engineCreateRoom,
  joinRoom: _engineJoinRoom,
  startMatch: _engineStartMatch,
  returnToLobby: _engineReturnToLobby,
  leaveRoom: _engineLeaveRoom,
  pauseGame: pauseGame,
  resumeGame: resumeGame,
  quitToMenu: quitToMenu,
  toggleScanlines: toggleScanlines,
  setSelectedColor: setSelectedColor,
  getColorOptions: function() { return MARIO_COLOR_OPTIONS.slice(); },
  getSelectedColor: function() { return mySelectedColor; },
  getMyPlayerId: function() { return myPlayerId; },
  getCurrentRoomCode: function() { return currentRoomCode; },
  isMultiplayer: function() { return !!multiplayerMode; },
  isHost: function() { return !!isHost; },
  getScanlinesOn: function() { return !!scanlinesOn; },
  on: on,
  off: off,
};

// ================================================================
// INIT
// ================================================================
resetLevel();
// Emit the initial scanlines state so glue files can paint the toggle
// label correctly on first render. Subscribers attached via
// EmbeddablobEngine.on('scanlines_changed', ...) before the next
// microtask will receive this.
setTimeout(function() {
  emit('scanlines_changed', { on: scanlinesOn });
  emit('engine_ready');
}, 0);

// Local debug shortcut: ?checkpoint=N on localhost auto-starts a
// single-player run from a given checkpoint, bypassing the menus.
if ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') &&
    new URLSearchParams(location.search).get('checkpoint') !== null) {
  _engineStartSinglePlayer({});
}
requestAnimationFrame(gameLoop);

})(); // end _embeddableBootstrap IIFE
