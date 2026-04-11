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
if (scanlinesOn) {
  document.getElementById('scanlineToggle').textContent = 'CRT: ON';
}

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
  document.getElementById('scanlineToggle').textContent = scanlinesOn ? 'CRT: ON' : 'CRT: OFF';
  applyCrt();
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

const PIRANHA_SPRITE1 = [
  [0,0,0,0,1,1,0,0,1,1,0,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,1,1,2,2,1,1,1,1,2,2,1,1,0,0,0],
  [0,1,2,2,2,1,1,1,1,2,2,2,1,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,3,5,3,3,5,0,0,0,0,0,0],
  [0,0,0,0,0,3,3,3,3,3,0,0,0,0,0,0],
  [0,0,0,0,3,5,3,3,3,5,3,0,0,0,0,0],
  [0,0,0,0,3,3,3,3,3,3,3,0,0,0,0,0],
  [0,0,0,0,0,3,5,3,3,5,0,0,0,0,0,0],
  [0,0,0,0,0,3,3,3,3,3,0,0,0,0,0,0],
  [0,0,0,0,3,5,3,3,3,5,3,0,0,0,0,0],
  [0,0,0,0,3,3,3,3,3,3,3,0,0,0,0,0],
];
const PIRANHA_SPRITE2 = [
  [0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,1,1,2,2,1,1,1,1,2,2,1,1,0,0,0],
  [0,1,2,2,2,1,1,1,1,2,2,2,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,3,5,3,3,5,0,0,0,0,0,0],
  [0,0,0,0,0,3,3,3,3,3,0,0,0,0,0,0],
  [0,0,0,0,3,5,3,3,3,5,3,0,0,0,0,0],
  [0,0,0,0,3,3,3,3,3,3,3,0,0,0,0,0],
  [0,0,0,0,0,3,5,3,3,5,0,0,0,0,0,0],
  [0,0,0,0,0,3,3,3,3,3,0,0,0,0,0,0],
  [0,0,0,0,3,5,3,3,3,5,3,0,0,0,0,0],
  [0,0,0,0,3,3,3,3,3,3,3,0,0,0,0,0],
];
const PIRANHA_PALETTE = { 1: '#e888b8', 2: COL.white, 3: '#7060b8', 5: '#3c2878' };

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
};

function drawPixelText(ctx, text, x, y, color, shadowColor) {
  const str = String(text).toUpperCase();
  for (let i = 0; i < str.length; i++) {
    const glyph = PIXEL_FONT[str[i]];
    if (!glyph) { x += 6; continue; }
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
const LEVEL_WIDTH = 480;
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

  // === SECTION 1: GREEN FIELDS (0-55) ===
  ground(0, 55);
  map[9][16] = 3;
  map[9][22] = 2; map[9][23] = 4; map[9][24] = 2; map[9][25] = 3; map[9][26] = 2;
  map[5][22] = 3;
  map[9][30] = 2; map[9][31] = 3; map[9][32] = 2;
  map[9][40] = 3;
  map[9][45] = 2; map[9][46] = 3; map[9][47] = 2;
  map[5][46] = 3;
  stairUp(50, 3);

  // === SECTION 2: PIPE VALLEY (55-100) ===
  ground(56, 100);
  addPipe(58, 2); addPipe(68, 3); addPipe(78, 3); addPipe(88, 4);
  map[9][62] = 3; map[9][73] = 3; map[9][83] = 3; map[9][84] = 4;
  map[7][59] = 3; map[7][69] = 3; map[7][79] = 3; map[7][89] = 3;
  map[9][64] = 2; map[9][65] = 3; map[9][66] = 2;
  map[9][94] = 2; map[9][95] = 3; map[9][96] = 2;
  map[7][55] = 7;

  // === SECTION 3: BLOCK PLAYGROUND (100-155) ===
  ground(101, 130); ground(134, 155);
  map[9][105] = 2; map[9][106] = 3; map[9][107] = 2; map[9][108] = 3; map[9][109] = 2;
  map[5][107] = 4;
  map[9][115] = 2; map[9][116] = 2; map[9][117] = 3; map[9][118] = 2;
  map[5][116] = 2; map[5][117] = 2; map[5][118] = 2;
  map[9][124] = 3; map[9][125] = 2; map[9][126] = 3; map[9][127] = 2;
  map[5][125] = 3;
  map[7][112] = 2; map[7][113] = 3; map[7][114] = 2;
  map[9][138] = 2; map[9][139] = 3; map[9][140] = 2;
  map[7][140] = 2; map[7][141] = 3;
  map[9][150] = 4; map[9][151] = 2; map[9][152] = 3;
  map[5][107] = 6;

  // === SECTION 4: ELEVATED CHALLENGE (155-210) ===
  ground(156, 164); ground(180, 210);
  for (let x = 165; x <= 179; x++) map[9][x] = 2;
  map[9][170] = 3; map[9][175] = 4;
  map[9][171] = 0; map[9][172] = 0;
  map[9][185] = 3;
  map[9][190] = 2; map[9][191] = 3; map[9][192] = 2;
  map[5][190] = 2; map[5][191] = 2;
  map[7][183] = 3; map[7][184] = 2;
  map[9][195] = 2; map[9][196] = 3; map[9][197] = 2;
  addPipe(200, 2); addPipe(207, 3);
  map[7][200] = 7;

  // === SECTION 5: GAUNTLET (210-260) ===
  ground(211, 255); ground(259, 260);
  map[9][215] = 2; map[9][216] = 3; map[9][217] = 2;
  map[9][225] = 3; map[9][226] = 3;
  map[9][230] = 2; map[9][231] = 2; map[9][232] = 3; map[9][233] = 2;
  map[5][231] = 4;
  map[9][240] = 2; map[9][241] = 3; map[9][242] = 2;
  map[9][248] = 4;
  addPipe(245, 2);
  map[7][220] = 3; map[7][221] = 2; map[7][222] = 3;
  map[9][236] = 3; map[9][237] = 2;

  // === SECTION 6: SKY WALK (260-305) ===
  ground(261, 262);
  for (let x = 265; x <= 270; x++) map[10][x] = 5;
  for (let x = 274; x <= 279; x++) map[10][x] = 5;
  for (let x = 283; x <= 288; x++) map[10][x] = 5;
  for (let x = 292; x <= 297; x++) map[10][x] = 5;
  map[7][267] = 3; map[7][276] = 3; map[7][285] = 3; map[7][294] = 4;
  for (let x = 269; x <= 271; x++) map[8][x] = 5;
  for (let x = 280; x <= 282; x++) map[7][x] = 5;
  ground(300, 305);

  // === SECTION 7: DOUBLE JUMP CANYON (305-345) - NEW! ===
  ground(306, 312);
  // Floating single/double platforms requiring double jump
  for (let x = 316; x <= 318; x++) map[10][x] = 5;
  map[8][317] = 3;
  for (let x = 323; x <= 324; x++) map[8][x] = 5;
  map[6][324] = 3;
  for (let x = 329; x <= 331; x++) map[11][x] = 5;
  for (let x = 329; x <= 331; x++) map[7][x] = 5;
  map[5][330] = 4;
  for (let x = 336; x <= 337; x++) map[9][x] = 5;
  map[7][337] = 3;
  for (let x = 342; x <= 344; x++) map[10][x] = 5;
  map[8][343] = 3;
  ground(348, 355);

  // === SECTION 8: SPRINT & PIPES (355-395) ===
  ground(356, 395);
  addPipe(360, 2); addPipe(370, 3);
  map[9][363] = 3; map[9][364] = 4; map[9][365] = 3;
  map[9][375] = 2; map[9][376] = 3; map[9][377] = 2;
  map[5][376] = 2;
  map[9][358] = 3; map[9][359] = 2;
  map[7][368] = 2; map[7][369] = 3;
  addPipe(380, 2);
  map[9][385] = 2; map[9][386] = 3; map[9][387] = 2;
  map[5][386] = 6;

  // === SECTION 9: AERIAL PLAYGROUND (395-420) - double jump showcase ===
  ground(396, 400);
  // Rising platforms - need double jump to reach the high ones
  for (let x = 404; x <= 406; x++) map[11][x] = 5;
  for (let x = 410; x <= 411; x++) map[9][x] = 5;
  map[7][411] = 3;
  for (let x = 415; x <= 416; x++) map[7][x] = 5;
  map[5][415] = 4;
  for (let x = 410; x <= 411; x++) map[12][x] = 5;
  ground(419, 421);

  // === SECTION 10: GRAND FINALE (421-479) ===
  ground(422, 479);
  stairUp(413, 4);
  stairDown(418, 4);

  // Boss arena: flat ground 422-443, gate at 444
  for (let y = 6; y <= 12; y++) map[y][BOSS_GATE_X] = 5;

  // Victory staircase after boss
  stairUp(452, 8);

  // Pre-boss blocks
  map[9][424] = 3; map[9][426] = 2; map[9][430] = 3; map[9][435] = 2;

  // === STAR BLOCK (late game reward for exploring) ===
  map[7][330] = 7;

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
const WALK_ACCEL = 0.18;
const RUN_ACCEL = 0.22;
const MAX_WALK = 1.5;
const MAX_RUN = 2.5;
const FRICTION = 0.25;
const AIR_FRICTION = 0.03;
const SKID_DECEL = 0.28;
const COYOTE_FRAMES = 6;
const JUMP_BUFFER_FRAMES = 6;

const FLAGPOLE_X = 464;
const CASTLE_X = 469;
const CHECKPOINT_XS = [120, 302, 396];

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

window.addEventListener('keydown', e => {
  if (e.code === 'Tab') {
    e.preventDefault();
    if (!e.repeat && multiplayerMode && gameState === 'playing') showScoreboard = true;
    return;
  }
  if (e.repeat) return;
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
    lives = 3;
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
    showScoreboard = false;
  }
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
let flagY = 0;
let hitBlocks = new Set();
let emptyBlocks = new Set();
let dustParticles = [];
let eliminated = false;
let racePlayers = [];
let checkpointIndex = -1;
let mapCoins = [];
let enemiesKilled = 0;
let flagBonus = 0;
let timeBonus = 0;
let boss = null;
let bossFireballs = [];
let marioFireballs = [];
let fireballCooldown = 0;
let starMusicInterval = null;
const BOSS_ARENA_LEFT = 422;
const BOSS_GATE_X = 444;

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
    invincible: checkpointIndex >= 0 ? 300 : 0,
    coyoteTimer: 0,
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
  eliminated = false;
  racePlayers = [];
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
  flagY = 0;
  hitBlocks = new Set();
  emptyBlocks = new Set();
  jumpBufferTimer = 0;
  jumpPressed = false;
  boss = null;
  bossFireballs = [];
  resetMario();
  spawnEnemies();
  spawnMapCoins();
  spawnBoss();
}

function spawnEnemies() {
  // Section 1 (0-55): gentle intro - spaced out
  const goombaXs = [
    22, 38, 50,
    62, 72, 85,
    108, 120, 140, 150,
    168, 172, 188, 195,
    215, 222, 228, 234, 240, 250,
    268, 286,
    350, 363,
    388, 399,
  ];
  goombaXs.forEach(x => {
    let gy = 12 * TILE;
    if (x >= 265 && x <= 297) gy = 9 * TILE;
    if (x >= 165 && x <= 179) gy = 8 * TILE;
    entities.push(createGoomba(x * TILE, gy));
  });

  // Koopas - spaced out, more strategic, ramp up toward end
  [48, 90, 125, 175, 192, 235, 275, 345, 365, 390].forEach(x => {
    entities.push(createKoopa(x * TILE, 12 * TILE));
  });

  // Buzzy beetles - tough enemies, introduced mid-game and ramping up
  [130, 155, 245, 370, 385].forEach(x => {
    entities.push(createBuzzyBeetle(x * TILE, 12 * TILE));
  });

  // Piranhas in pipes
  [[58, 11], [68, 10], [78, 10], [88, 9], [200, 11], [207, 10], [360, 11], [370, 10], [380, 11]].forEach(([px, topRow]) => {
    entities.push(createPiranha(px, topRow));
  });

  // Swooper enemies - fly in sine patterns, mixed in throughout
  [145, 205, 255, 295, 340, 375].forEach(x => {
    entities.push(createSwooper(x * TILE, 7 * TILE));
  });

  // Phantom enemies - slow floating ghosts, after first checkpoint
  [175, 240, 320, 365].forEach(x => {
    entities.push(createPhantom(x * TILE, 8 * TILE));
  });
}

function spawnMapCoins() {
  mapCoins = [];
  const coinPositions = [
    [18, 11], [19, 11], [20, 11],
    [34, 11], [36, 11], [38, 11],
    [62, 7], [63, 7], [64, 7],
    [73, 7], [74, 7],
    [105, 7], [106, 7], [107, 7], [108, 7], [109, 7],
    [135, 11], [136, 11], [137, 11],
    [166, 7], [167, 7], [168, 7], [169, 7],
    [174, 7], [175, 7], [176, 7], [177, 7],
    [185, 7], [186, 7], [187, 7],
    [213, 11], [214, 11],
    [220, 7], [221, 7], [222, 7],
    [230, 7], [231, 7], [232, 7],
    [266, 8], [267, 8], [268, 8],
    [275, 8], [276, 8], [277, 8],
    [284, 8], [285, 8], [286, 8],
    [293, 8], [294, 8], [295, 8],
    // Double jump canyon - coin arcs between platforms (need double jump!)
    [314, 9], [315, 8], [316, 7],
    [320, 7], [321, 6], [322, 7],
    [326, 8], [327, 7],
    [333, 9], [334, 8], [335, 7],
    [339, 8], [340, 7],
    [345, 9], [346, 8],
    // Sprint section
    [363, 11], [364, 11],
    [376, 7], [377, 7],
    // Aerial playground - high coins (double jump required)
    [405, 9], [406, 8],
    [410, 7], [411, 6],
    [415, 5], [416, 4],
    // Pre-boss
    [424, 11], [426, 11],
  ];
  coinPositions.forEach(([tx, ty]) => {
    if (levelMap[ty] && levelMap[ty][tx]) ty--;
    mapCoins.push({ x: tx * TILE + 4, y: ty * TILE, collected: false });
  });
}

function spawnBoss() {
  boss = {
    x: 433 * TILE, y: 10 * TILE,
    vx: -0.5, vy: 0,
    w: 28, h: 32,
    hp: 3, alive: true, dying: false, deathTimer: 0,
    jumpTimer: 0, fireTimer: 0,
    frame: 0, frameTimer: 0,
    invincible: 0,
    arenaLeft: BOSS_ARENA_LEFT * TILE,
    arenaRight: (BOSS_GATE_X - 1) * TILE,
    onGround: false,
  };
}

function createGoomba(x, y) {
  return {
    type: 'goomba', x, y, vx: -0.35, vy: 0,
    w: 16, h: 16, alive: true, flat: false, flatTimer: 0,
    frame: 0, frameTimer: 0,
  };
}

function createKoopa(x, y) {
  return {
    type: 'koopa', x, y: y - 8, vx: -0.4, vy: 0,
    w: 16, h: 24, alive: true, shell: false, shellMoving: false,
    frame: 0, frameTimer: 0,
  };
}

function createBuzzyBeetle(x, y) {
  return {
    type: 'buzzy', x, y, vx: -0.6, vy: 0,
    w: 16, h: 16, alive: true, flat: false, flatTimer: 0,
    frame: 0, frameTimer: 0,
  };
}

function createPiranha(pipeX, pipeTopY) {
  return {
    type: 'piranha', x: pipeX * TILE + 6, y: pipeTopY * TILE,
    vx: 0, vy: 0, w: 18, h: 20,
    alive: true, frame: 0, frameTimer: 0,
    baseY: pipeTopY * TILE, emergeOffset: 0, emergeDir: -1,
    pipeX: pipeX, waitTimer: 0,
  };
}

function createSwooper(x, y) {
  return {
    type: 'swooper', x, y, vx: -0.7, vy: 0,
    w: 14, h: 14, alive: true,
    frame: 0, frameTimer: 0,
    baseY: y, swoopTick: Math.random() * 100,
  };
}

function createPhantom(x, y) {
  return {
    type: 'phantom', x, y, vx: 0.4, vy: 0,
    w: 14, h: 14, alive: true, flat: false, flatTimer: 0,
    frame: 0, frameTimer: 0,
    baseY: y, floatTick: Math.random() * 100,
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
    particles.push({ x: tx * TILE, y: ty * TILE, type: 'bump', timer: 8, origY: ty * TILE });
    playSound('bump');
  } else if (tile === 2) {
    if (mario.big) {
      levelMap[ty][tx] = 0;
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
      } else {
        gameState = 'lifeLost';
      }
    }
    return;
  }

  if (flagDescending) {
    winTimer++;
    mario.vy = 1.8;
    mario.y += mario.vy;
    if (mario.y >= 12 * TILE) {
      mario.y = 12 * TILE;
      mario.vx = 1.5;
      mario.x += mario.vx;
      mario.facing = 1;
    }
    if (winTimer > 200) {
      if (!multiplayerMode && timeBonus === 0 && time > 0) {
        timeBonus = time * 50;
        score += timeBonus;
      }
      if (multiplayerMode) {
        writePlayerFinished();
      }
      gameState = 'win';
    }
    if (multiplayerMode) {
      writeProgress();
    }
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
        mario.landSquash = 8;
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

  // Pit death
  if (mario.y > LEVEL_HEIGHT * TILE) mariodie();

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

  // Camera (smooth lerp, float precision kept for tracking)
  camera.targetX = mario.x - VIEW_W / 2 + 16;
  if (camera.targetX < camera.x) camera.targetX = camera.x;
  camera.x += (camera.targetX - camera.x) * 0.1;
  if (Math.abs(camera.targetX - camera.x) < 0.5) camera.x = camera.targetX;
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
      hudMessage = { text: 'CHECKPOINT REACHED!', life: 120, maxLife: 120 };
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
    flagBonus = Math.max(0, (12 * TILE - mario.y)) * 5;
    score += flagBonus;
    playSound('flagpole');
  }

  // Multiplayer progress
  if (multiplayerMode && gameState === 'playing') {
    writeProgress();
  }
}

function mariodie() {
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
        return;
      }
      if (mario.invincible > 0) return;
      if (mx < e.x + e.w && mx + mw > e.x && my < e.y + visH && my + mh > e.y) {
        mariodie();
      }
      return;
    }

    if (e.x > camera.x + VIEW_W + 48 || e.x < camera.x - 80) return;

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
      return;
    }

    if (mario.invincible > 0) return;
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
          if (e.type === 'swooper' || e.type === 'phantom') {
            e.remove = true;
          } else {
            e.flat = true;
            e.flatTimer = 30;
          }
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
      } else {
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
        boss.invincible = 40;
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
          for (let gy = 6; gy <= 12; gy++) levelMap[gy][BOSS_GATE_X] = 0;
        } else {
          playSound('bosshit');
          addScorePopup(boss.x, boss.y - 8, 500);
          score += 500;
          boss.vx = (shell.x < boss.x ? 1 : -1) * 1.5;
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

  if (!boss) return;

  if (boss.dying) {
    boss.deathTimer++;
    boss.vy += GRAVITY_DOWN;
    boss.y += boss.vy;
    if (boss.deathTimer > 120) boss = null;
    return;
  }

  if (!boss.alive) return;

  // Only activate boss when Mario is near the arena
  if (Math.abs(mario.x - boss.x) > VIEW_W * 1.5) return;

  if (boss.invincible > 0) boss.invincible--;

  // Gravity
  boss.vy += GRAVITY_DOWN;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;

  // Rage mode: faster when low HP
  var bossRage = boss.hp <= 1;
  var bossSpeed = bossRage ? 0.8 : 0.5;

  // Horizontal movement - chase Mario slightly
  if (boss.invincible <= 0) {
    var chaseStr = bossRage ? 0.01 : 0.004;
    if (mario.x < boss.x) boss.vx -= chaseStr;
    else boss.vx += chaseStr;
    if (boss.vx > bossSpeed) boss.vx = bossSpeed;
    if (boss.vx < -bossSpeed) boss.vx = -bossSpeed;
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
      if (bossRage) screenShake = Math.max(screenShake, 1.0);
    }
    else { boss.y = (bc.ty + 1) * TILE; boss.vy = 0; }
  }

  // Jump
  boss.jumpTimer++;
  var jumpInterval = bossRage ? 70 + Math.random() * 40 : 110 + Math.random() * 70;
  if (boss.jumpTimer > jumpInterval && boss.onGround) {
    boss.vy = bossRage ? -6.5 : -5.5;
    boss.jumpTimer = 0;
  }

  // Throw fireballs toward Mario - occasional, not overwhelming
  boss.fireTimer++;
  var fireInterval = bossRage ? 160 + Math.random() * 100 : 240 + Math.random() * 140;
  if (boss.fireTimer > fireInterval) {
    boss.fireTimer = 0;
    const dir = mario.x < boss.x ? -1 : 1;
    var fbSpeed = (bossRage ? 2.0 : 1.5) + Math.random() * 0.8;
    bossFireballs.push({
      x: boss.x + (dir > 0 ? boss.w : -8),
      y: boss.y + 10,
      vx: dir * fbSpeed,
      vy: -1.5,
      life: 150,
    });
    if (Math.random() < (bossRage ? 0.2 : 0.1)) {
      var fb2Speed = (bossRage ? 1.3 : 1.0) + Math.random() * 0.8;
      bossFireballs.push({
        x: boss.x + (dir > 0 ? boss.w : -8),
        y: boss.y + 14,
        vx: dir * fb2Speed,
        vy: -2.5,
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
    boss.invincible = 40;
    if (boss.hp <= 0) {
      boss.alive = false; boss.dying = true; boss.vy = -5; boss.deathTimer = 0;
      score += ENEMY_POINTS.boss; addScorePopup(boss.x, boss.y - 16, ENEMY_POINTS.boss);
      enemiesKilled++; playSound('bossdie');
      for (let gy = 6; gy <= 12; gy++) levelMap[gy][BOSS_GATE_X] = 0;
    } else {
      playSound('bosshit'); addScorePopup(boss.x, boss.y - 8, 500); score += 500;
    }
    return;
  }

  if (mario.invincible > 0) return;
  if (mx < boss.x + boss.w && mx + mw > boss.x && my < boss.y + boss.h && my + mh > boss.y) {
    if (mario.vy > 0 && my + mh - boss.y < 12 && boss.invincible <= 0) {
      boss.hp--;
      boss.invincible = 40;
      mario.vy = -7;
      mario.jumpsUsed = 1;
      mario.invincible = Math.max(mario.invincible, 90);
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
        for (let gy = 6; gy <= 12; gy++) levelMap[gy][BOSS_GATE_X] = 0;
      } else {
        playSound('bosshit');
        addScorePopup(boss.x, boss.y - 8, 500);
        score += 500;
        boss.vx = (mario.x < boss.x ? 1 : -1) * 1.5;
      }
    } else if (boss.invincible <= 0) {
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
      if (e.type === 'piranha' && e.emergeOffset >= 0) return;
      if (fb.x + fb.w > e.x && fb.x < e.x + e.w &&
          fb.y + fb.h > e.y && fb.y < e.y + e.h) {
        if (e.type === 'buzzy') {
          fb.remove = true;
          return;
        }
        const pts = ENEMY_POINTS[e.type] || 100;
        e.alive = false;
        e.remove = true;
        score += pts;
        enemiesKilled++;
        addScorePopup(e.x, e.y - 8, pts);
        fb.remove = true;
      }
    });

    if (boss && boss.alive && boss.invincible <= 0 && !fb.remove) {
      if (fb.x + fb.w > boss.x && fb.x < boss.x + boss.w &&
          fb.y + fb.h > boss.y && fb.y < boss.y + boss.h) {
        boss.hp--;
        boss.invincible = 40;
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
          for (let gy = 6; gy <= 12; gy++) levelMap[gy][BOSS_GATE_X] = 0;
        } else {
          addScorePopup(boss.x, boss.y - 8, 500);
          score += 500;
          boss.vx = (fb.x < boss.x ? 1 : -1) * 1.5;
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
}

// ================================================================
// MAIN UPDATE
// ================================================================
function update() {
  if (gameState === 'gameover') {
    gameOverTimer++;
    if (gameOverTimer > 180) {
      gameState = 'menu';
      showMenu();
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
  if (eliminated) {
    globalTick++;
    return;
  }
  updateMario();
  updateEntities();
  updateBoss();
  updateItems();
  updateMarioFireballs();
  updateParticles();
}

// ================================================================
// RENDERING
// ================================================================
function drawTile(x, y, tile) {
  const sx = x - camera.rx;
  if (sx < -TILE || sx > VIEW_W + TILE) return;
  const tileX = Math.floor(x / TILE);
  const tileY = Math.floor(y / TILE);
  const key = `${tileX},${tileY}`;

  switch(tile) {
    case 1: {
      const gGrad = bx.createLinearGradient(0, y, 0, y + TILE);
      gGrad.addColorStop(0, COL.groundLight);
      gGrad.addColorStop(0.15, COL.ground);
      gGrad.addColorStop(0.7, COL.ground);
      gGrad.addColorStop(1, COL.groundDark);
      bx.fillStyle = gGrad;
      bx.fillRect(sx, y, TILE, TILE);
      bx.fillStyle = 'rgba(255,255,255,0.12)';
      bx.fillRect(sx, y, TILE, 1);
      bx.fillStyle = 'rgba(0,0,0,0.1)';
      bx.fillRect(sx + 7, y + 1, 1, 6);
      bx.fillRect(sx + 3, y + 7, 1, 2);
      bx.fillRect(sx + 11, y + 7, 1, 2);
      bx.fillRect(sx + 7, y + 9, 1, 7);
      bx.fillStyle = 'rgba(255,255,255,0.06)';
      bx.fillRect(sx + 1, y + 1, 3, 1);
      bx.fillRect(sx + 9, y + 8, 2, 1);
      bx.fillRect(sx + 5, y + 4, 1, 1);
      bx.fillRect(sx + 12, y + 3, 1, 1);
      bx.fillRect(sx + 2, y + 12, 1, 1);
      bx.fillStyle = 'rgba(0,0,0,0.05)';
      bx.fillRect(sx + 10, y + 5, 1, 1);
      bx.fillRect(sx + 1, y + 9, 1, 1);
      break;
    }

    case 2: {
      const bGrad = bx.createLinearGradient(0, y, 0, y + TILE);
      bGrad.addColorStop(0, COL.brick);
      bGrad.addColorStop(0.45, COL.brick);
      bGrad.addColorStop(1, COL.brickLine);
      bx.fillStyle = bGrad;
      bx.fillRect(sx, y, TILE, TILE);
      bx.fillStyle = 'rgba(255,255,255,0.1)';
      bx.fillRect(sx + 0.5, y + 1, 6, 1);
      bx.fillRect(sx + 8, y + 1, 7, 1);
      bx.fillRect(sx + 0.5, y + 8, 2.5, 1);
      bx.fillRect(sx + 4, y + 8, 7, 1);
      bx.fillRect(sx + 12, y + 8, 3.5, 1);
      bx.fillStyle = 'rgba(255,255,255,0.05)';
      bx.fillRect(sx + 0.5, y + 2, 6, 4.5);
      bx.fillRect(sx + 8, y + 2, 7, 4.5);
      bx.fillRect(sx + 0.5, y + 9, 2.5, 6);
      bx.fillRect(sx + 4, y + 9, 7, 6);
      bx.fillRect(sx + 12, y + 9, 3.5, 6);
      bx.fillStyle = 'rgba(0,0,0,0.2)';
      bx.fillRect(sx, y, TILE, 0.7);
      bx.fillRect(sx, y + 7, TILE, 0.7);
      bx.fillRect(sx + 7.2, y, 0.6, 7);
      bx.fillRect(sx + 3.2, y + 7, 0.6, 9);
      bx.fillRect(sx + 11.2, y + 7, 0.6, 9);
      bx.fillRect(sx, y + 15.3, TILE, 0.7);
      break;
    }

    case 3: case 4: case 6: case 7: {
      if (emptyBlocks.has(key)) {
        const eGrad = bx.createLinearGradient(0, y, 0, y + TILE);
        eGrad.addColorStop(0, '#6858a0');
        eGrad.addColorStop(1, COL.blockDark);
        bx.fillStyle = eGrad;
        bx.fillRect(sx, y, TILE, TILE);
        bx.fillStyle = 'rgba(0,0,0,0.15)';
        bx.fillRect(sx + TILE - 1.5, y, 1.5, TILE);
        bx.fillRect(sx, y + TILE - 1.5, TILE, 1.5);
        bx.fillStyle = 'rgba(255,255,255,0.06)';
        bx.fillRect(sx, y, TILE, 1);
        bx.fillRect(sx, y, 1, TILE);
        break;
      }
      const glow = Math.sin(globalTick * 0.08) * 0.3 + 0.7;
      const is1up = tile === 6;
      const isStar = tile === 7;
      const blockBg = is1up ? '#80c0e0' : isStar ? '#a890d0' : COL.block;
      const blockShd = is1up ? '#5090b0' : isStar ? '#7868a8' : COL.blockShade;
      const blockDk = is1up ? '#306080' : isStar ? '#584888' : COL.blockDark;
      const qGrad = bx.createLinearGradient(0, y, 0, y + TILE);
      qGrad.addColorStop(0, blockBg);
      qGrad.addColorStop(1, blockShd);
      bx.fillStyle = qGrad;
      bx.fillRect(sx, y, TILE, TILE);
      bx.fillStyle = 'rgba(0,0,0,0.15)';
      bx.fillRect(sx + TILE - 1.5, y, 1.5, TILE);
      bx.fillRect(sx, y + TILE - 1.5, TILE, 1.5);
      bx.fillStyle = 'rgba(255,255,255,0.1)';
      bx.fillRect(sx, y, TILE, 1);
      bx.fillRect(sx, y, 1, TILE);
      bx.fillStyle = `rgba(255,255,255,${glow * 0.12})`;
      bx.fillRect(sx + 2, y + 2, TILE - 4, TILE - 4);
      if (isStar) {
        bx.fillStyle = '#e8c850';
        bx.fillRect(sx + 7, y + 3, 2, 2);
        bx.fillRect(sx + 5, y + 5, 6, 2);
        bx.fillRect(sx + 3, y + 7, 10, 2);
        bx.fillRect(sx + 5, y + 9, 6, 2);
        bx.fillRect(sx + 4, y + 10, 3, 2);
        bx.fillRect(sx + 9, y + 10, 3, 2);
      } else {
        bx.fillStyle = blockDk;
        bx.fillRect(sx + 5, y + 3, 6, 2);
        bx.fillRect(sx + 9, y + 5, 2, 3);
        bx.fillRect(sx + 7, y + 7, 2, 2);
        bx.fillRect(sx + 7, y + 11, 2, 2);
      }
      break;
    }

    case 5: {
      const hGrad = bx.createLinearGradient(0, y, 0, y + TILE);
      hGrad.addColorStop(0, COL.hardBlockLight);
      hGrad.addColorStop(0.5, COL.hardBlock);
      hGrad.addColorStop(1, COL.hardBlockDark);
      bx.fillStyle = hGrad;
      bx.fillRect(sx, y, TILE, TILE);
      bx.fillStyle = 'rgba(255,255,255,0.12)';
      bx.fillRect(sx, y, TILE, 1);
      bx.fillRect(sx, y, 1, TILE);
      bx.fillStyle = 'rgba(0,0,0,0.15)';
      bx.fillRect(sx + TILE - 1, y, 1, TILE);
      bx.fillRect(sx, y + TILE - 1, TILE, 1);
      bx.fillStyle = 'rgba(0,0,0,0.06)';
      bx.fillRect(sx + 2, y + 2, TILE - 4, TILE - 4);
      bx.fillStyle = 'rgba(255,255,255,0.07)';
      bx.fillRect(sx + 3, y + 3, TILE - 6, 1);
      bx.fillRect(sx + 3, y + 3, 1, TILE - 6);
      bx.fillStyle = 'rgba(0,0,0,0.06)';
      bx.fillRect(sx + TILE - 4, y + 3, 1, TILE - 6);
      bx.fillRect(sx + 3, y + TILE - 4, TILE - 6, 1);
      bx.fillStyle = 'rgba(0,0,0,0.04)';
      bx.fillRect(sx + 7, y + 2, 1, TILE - 4);
      bx.fillRect(sx + 2, y + 7, TILE - 4, 1);
      break;
    }

    case 10: {
      const pG10 = bx.createLinearGradient(sx, 0, sx + TILE, 0);
      pG10.addColorStop(0, COL.pipeHighlight);
      pG10.addColorStop(0.3, COL.pipe);
      pG10.addColorStop(0.85, COL.pipe);
      pG10.addColorStop(1, COL.pipeDark);
      bx.fillStyle = pG10;
      bx.fillRect(sx, y, TILE, TILE);
      bx.fillStyle = 'rgba(255,255,255,0.1)';
      bx.fillRect(sx + 3, y, 2, TILE);
      break;
    }
    case 11: {
      const pG11 = bx.createLinearGradient(sx, 0, sx + TILE, 0);
      pG11.addColorStop(0, COL.pipeDark);
      pG11.addColorStop(0.2, COL.pipe);
      pG11.addColorStop(0.7, COL.pipe);
      pG11.addColorStop(1, COL.pipeHighlight);
      bx.fillStyle = pG11;
      bx.fillRect(sx, y, TILE, TILE);
      break;
    }
    case 12: {
      const pG12 = bx.createLinearGradient(sx - 2, 0, sx + TILE, 0);
      pG12.addColorStop(0, COL.pipeHighlight);
      pG12.addColorStop(0.25, COL.pipe);
      pG12.addColorStop(0.85, COL.pipe);
      pG12.addColorStop(1, COL.pipeDark);
      bx.fillStyle = pG12;
      bx.fillRect(sx - 2, y, TILE + 2, TILE);
      bx.fillStyle = 'rgba(255,255,255,0.22)';
      bx.fillRect(sx - 2, y, TILE + 4, 1.5);
      bx.fillStyle = 'rgba(255,255,255,0.12)';
      bx.fillRect(sx + 1, y + 1, 2, TILE - 2);
      bx.fillStyle = 'rgba(0,0,0,0.1)';
      bx.fillRect(sx - 2, y + TILE - 1, TILE + 4, 1);
      bx.fillStyle = 'rgba(0,0,0,0.08)';
      bx.fillRect(sx - 1, y + 2, TILE + 2, 1);
      bx.fillStyle = 'rgba(255,255,255,0.06)';
      bx.fillRect(sx, y + 3, TILE - 2, 1);
      break;
    }
    case 13: {
      const pG13 = bx.createLinearGradient(sx, 0, sx + TILE + 2, 0);
      pG13.addColorStop(0, COL.pipeDark);
      pG13.addColorStop(0.2, COL.pipe);
      pG13.addColorStop(0.7, COL.pipe);
      pG13.addColorStop(1, COL.pipeHighlight);
      bx.fillStyle = pG13;
      bx.fillRect(sx, y, TILE + 2, TILE);
      bx.fillStyle = 'rgba(255,255,255,0.18)';
      bx.fillRect(sx, y, TILE + 2, 1.5);
      bx.fillStyle = 'rgba(0,0,0,0.08)';
      bx.fillRect(sx, y + 2, TILE + 2, 1);
      bx.fillStyle = 'rgba(255,255,255,0.05)';
      bx.fillRect(sx + 1, y + 3, TILE, 1);
      bx.fillStyle = 'rgba(0,0,0,0.08)';
      bx.fillRect(sx, y + TILE - 1, TILE + 2, 1);
      break;
    }
  }
}

function drawBackground() {
  const skyGrad = bx.createLinearGradient(0, 0, 0, VIEW_H);
  skyGrad.addColorStop(0, '#2a1848');
  skyGrad.addColorStop(0.25, '#4a3078');
  skyGrad.addColorStop(0.5, '#7858a8');
  skyGrad.addColorStop(0.7, '#a080c8');
  skyGrad.addColorStop(0.85, '#c8a8e0');
  skyGrad.addColorStop(1, '#e0d0f0');
  bx.fillStyle = skyGrad;
  bx.fillRect(0, 0, VIEW_W, VIEW_H);

  var glowX = VIEW_W * 0.75;
  var glowY = VIEW_H * 0.15;
  var warmGlow = bx.createRadialGradient(glowX, glowY, 0, glowX, glowY, VIEW_W * 0.55);
  warmGlow.addColorStop(0, 'rgba(255,200,160,0.12)');
  warmGlow.addColorStop(0.4, 'rgba(230,170,200,0.06)');
  warmGlow.addColorStop(1, 'rgba(200,150,220,0)');
  bx.fillStyle = warmGlow;
  bx.fillRect(0, 0, VIEW_W, VIEW_H);

  const GY = 13 * TILE;
  const T = TILE;
  const CYCLE = 48 * T;
  const totalLen = LEVEL_WIDTH * T;

  // --- Multi-bump shape (used for hills, bushes, and clouds) ---
  function drawBumps(sx, baseY, bumps, bumpR, fillCol, lightCol) {
    const spacing = bumpR * 1.5;
    const totalW = (bumps - 1) * spacing + bumpR * 2;
    if (sx + totalW < -60 || sx > VIEW_W + 60) return;
    bx.fillStyle = fillCol;
    bx.beginPath();
    for (let i = 0; i < bumps; i++) {
      const cx = sx + i * spacing + bumpR;
      bx.moveTo(cx + bumpR, baseY);
      bx.arc(cx, baseY, bumpR, 0, Math.PI, true);
    }
    bx.closePath();
    bx.fill();
    bx.fillStyle = fillCol;
    bx.fillRect(sx, baseY, totalW, 2);
    if (lightCol) {
      bx.fillStyle = lightCol;
      for (let i = 0; i < bumps; i++) {
        const cx = sx + i * spacing + bumpR;
        bx.beginPath();
        bx.arc(cx, baseY - bumpR * 0.15, bumpR * 0.5, 0, Math.PI, true);
        bx.fill();
      }
    }
  }

  // --- HILLS (behind everything, slow parallax) ---
  function drawHill3(hcx, outerR) {
    if (hcx + outerR < -20 || hcx - outerR > VIEW_W + 20) return;
    var hillBase = GY + outerR * 0.4;
    var hGrad = bx.createRadialGradient(hcx - outerR * 0.2, hillBase - outerR * 0.7, outerR * 0.1, hcx, hillBase, outerR);
    hGrad.addColorStop(0, '#8870b8');
    hGrad.addColorStop(0.5, '#584090');
    hGrad.addColorStop(1, '#2a1858');
    bx.fillStyle = hGrad;
    bx.beginPath();
    bx.arc(hcx, hillBase, outerR, Math.PI, 0, false);
    bx.lineTo(hcx + outerR, VIEW_H + 4);
    bx.lineTo(hcx - outerR, VIEW_H + 4);
    bx.closePath();
    bx.fill();

    var hlGrad = bx.createRadialGradient(hcx - outerR * 0.2, hillBase - outerR * 0.75, outerR * 0.05, hcx - outerR * 0.2, hillBase - outerR * 0.5, outerR * 0.4);
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.18)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    bx.fillStyle = hlGrad;
    bx.beginPath();
    bx.arc(hcx - outerR * 0.2, hillBase - outerR * 0.5, outerR * 0.4, 0, Math.PI * 2);
    bx.fill();
  }
  for (let base = -CYCLE; base < totalLen + CYCLE; base += CYCLE) {
    drawHill3(Math.floor((base + 0) - camera.rx * 0.4), 5 * T);
    drawHill3(Math.floor((base + 16 * T) - camera.rx * 0.4), 2 * T);
    drawHill3(Math.floor((base + 25 * T) - camera.rx * 0.4), 3.5 * T);
    drawHill3(Math.floor((base + 40 * T) - camera.rx * 0.4), 1.5 * T);
  }

  // --- CLOUDS (slow parallax, high in sky, SMB1 pattern: 1,1,3,2,1 bumps) ---
  const cloudR = 10;
  const cloudPositions = [
    { tx: 8, ty: 3, bumps: 1 },
    { tx: 19, ty: 2, bumps: 1 },
    { tx: 27, ty: 4, bumps: 3 },
    { tx: 36, ty: 2, bumps: 2 },
    { tx: 44, ty: 3, bumps: 1 },
  ];
  for (let base = -CYCLE; base < totalLen + CYCLE; base += CYCLE) {
    for (const cp of cloudPositions) {
      const csx = Math.floor((base + cp.tx * T) - camera.rx * 0.2);
      const csy = cp.ty * T;
      const spacing = cloudR * 1.5;
      const totalW = (cp.bumps - 1) * spacing + cloudR * 2;
      if (csx + totalW < -60 || csx > VIEW_W + 60) continue;
      bx.save();
      bx.globalAlpha = 0.15;
      bx.fillStyle = '#382858';
      for (let i = 0; i < cp.bumps; i++) {
        const ccx = csx + i * spacing + cloudR;
        bx.beginPath();
        bx.arc(ccx + 1.5, csy + cloudR + 1.5, cloudR, Math.PI, 0, false);
        bx.fill();
      }
      bx.restore();
      for (let i = 0; i < cp.bumps; i++) {
        const ccx = csx + i * spacing + cloudR;
        const cGrad = bx.createRadialGradient(ccx - 2, csy + cloudR - cloudR * 0.3, cloudR * 0.1, ccx, csy + cloudR, cloudR);
        cGrad.addColorStop(0, '#fcfcfc');
        cGrad.addColorStop(0.5, '#e8e0f8');
        cGrad.addColorStop(1, '#c8b8e0');
        bx.fillStyle = cGrad;
        bx.beginPath();
        bx.arc(ccx, csy + cloudR, cloudR, Math.PI, 0, false);
        bx.fill();
      }
      bx.fillStyle = '#e8e0f8';
      bx.fillRect(csx, csy + cloudR, totalW, 2);
    }
  }

  // --- BUSHES (at ground level, SMB1 pattern: 2,3,1 bumps per cycle) ---
  const bushR = 10;
  const bushPositions = [
    { tx: 11, bumps: 3 },
    { tx: 23, bumps: 1 },
    { tx: 41, bumps: 2 },
  ];
  for (let base = -CYCLE; base < totalLen + CYCLE; base += CYCLE) {
    for (const bp of bushPositions) {
      const bsx = Math.floor((base + bp.tx * T) - camera.rx);
      const spacing = bushR * 1.5;
      const totalW = (bp.bumps - 1) * spacing + bushR * 2;
      if (bsx + totalW < -40 || bsx > VIEW_W + 40) continue;
      const bushStartTile = Math.floor((base + bp.tx * T) / T);
      const bushTileSpan = Math.ceil(totalW / T) + 1;
      let bushOnGround = true;
      for (let bt = 0; bt < bushTileSpan; bt++) {
        const cx = bushStartTile + bt;
        if (cx < 0 || cx >= LEVEL_WIDTH || getTile(cx, 13) === 0) { bushOnGround = false; break; }
      }
      if (!bushOnGround) continue;
      for (let i = 0; i < bp.bumps; i++) {
        const bcx = bsx + i * spacing + bushR;
        const buGrad = bx.createRadialGradient(bcx - 2, GY - 1 - bushR * 0.4, bushR * 0.15, bcx, GY - 1, bushR + 1);
        buGrad.addColorStop(0, '#9080c0');
        buGrad.addColorStop(0.5, '#6050a0');
        buGrad.addColorStop(1, '#382878');
        bx.fillStyle = buGrad;
        bx.beginPath();
        bx.arc(bcx, GY - 1, bushR, Math.PI, 0, false);
        bx.fill();
      }
      bx.fillStyle = '#6050a0';
      bx.fillRect(bsx, GY - 1, totalW, 2);
    }
  }

  // --- TREES (scattered, not too many) ---
  const treePositions = [
    { tx: 6, s: 1.1 },
    { tx: 17, s: 0.8 },
    { tx: 35, s: 1.0 },
  ];
  for (let base = 0; base < totalLen + CYCLE; base += CYCLE) {
    for (const tp of treePositions) {
      const tsx = Math.floor((base + tp.tx * T) - camera.rx);
      if (tsx < -30 || tsx > VIEW_W + 30) continue;
      const treeTileX = Math.floor((base + tp.tx * T) / T);
      if (treeTileX < 0 || treeTileX >= LEVEL_WIDTH || getTile(treeTileX, 13) === 0) continue;
      const s = tp.s;
      const trunkW = Math.floor(4 * s);
      const trunkH = Math.floor(12 * s);
      const tkGrad = bx.createLinearGradient(tsx - trunkW, 0, tsx + trunkW, 0);
      tkGrad.addColorStop(0, '#3c2858');
      tkGrad.addColorStop(0.5, '#584078');
      tkGrad.addColorStop(1, '#3c2858');
      bx.fillStyle = tkGrad;
      bx.fillRect(tsx - Math.floor(trunkW / 2), GY - trunkH, trunkW, trunkH);
      const foliageR = Math.floor(9 * s);
      const foliageY = GY - trunkH - Math.floor(3 * s);
      const fGrad = bx.createRadialGradient(tsx - foliageR * 0.2, foliageY - foliageR * 0.3, foliageR * 0.1, tsx, foliageY, foliageR);
      fGrad.addColorStop(0, '#9878c8');
      fGrad.addColorStop(0.5, '#6050a0');
      fGrad.addColorStop(1, '#302060');
      bx.fillStyle = fGrad;
      bx.beginPath();
      bx.arc(tsx, foliageY, foliageR, 0, Math.PI * 2);
      bx.fill();
      bx.save();
      bx.globalAlpha = 0.25;
      bx.fillStyle = '#d0c0f0';
      bx.beginPath();
      bx.arc(tsx - Math.floor(2 * s), foliageY - Math.floor(3 * s), Math.floor(3.5 * s), 0, Math.PI * 2);
      bx.fill();
      bx.restore();
    }
  }

  // --- FENCES (a few per cycle) ---
  const fencePositions = [14, 30, 45];
  for (let base = 0; base < totalLen + CYCLE; base += CYCLE) {
    for (const ftx of fencePositions) {
      const fsx = Math.floor((base + ftx * T) - camera.rx);
      if (fsx < -40 || fsx > VIEW_W + 40) continue;
      const fenceTileX = Math.floor((base + ftx * T) / T);
      let fenceOnGround = true;
      for (let fp = 0; fp < 4; fp++) {
        const checkX = fenceTileX + fp;
        if (checkX < 0 || checkX >= LEVEL_WIDTH || getTile(checkX, 13) === 0) { fenceOnGround = false; break; }
      }
      if (!fenceOnGround) continue;
      for (let p = 0; p < 4; p++) {
        const fpx = fsx + p * 8;
        const pGrad = bx.createLinearGradient(fpx, 0, fpx + 3, 0);
        pGrad.addColorStop(0, '#9888c0');
        pGrad.addColorStop(0.5, '#8070a8');
        pGrad.addColorStop(1, '#605090');
        bx.fillStyle = pGrad;
        bx.fillRect(fpx, GY - 14, 3, 14);
        bx.fillStyle = 'rgba(255,255,255,0.15)';
        bx.fillRect(fpx, GY - 14, 3, 1);
      }
      const rGrad = bx.createLinearGradient(0, GY - 13, 0, GY - 11);
      rGrad.addColorStop(0, '#9888c0');
      rGrad.addColorStop(1, '#605090');
      bx.fillStyle = rGrad;
      bx.fillRect(fsx - 1, GY - 12, 34, 2);
      bx.fillRect(fsx - 1, GY - 6, 34, 2);
    }
  }
}

function drawMario() {
  if (mario.invincible > 0) {
    const blinkRate = mario.invincible > 120 ? 8 : 3;
    if (Math.floor(mario.invincible / blinkRate) % 3 === 0) return;
  }

  const px = Math.floor(mario.x - camera.rx);
  const py = Math.floor(mario.y);
  const dir = mario.facing;
  const isBig = mario.big;

  const bodyR = isBig ? 9 : 6.5;
  const cx = px + 7;
  const cy = isBig ? py + 11 : py + 7;

  let sqX = 1.0, sqY = 1.0, bounceY = 0;

  if (mario.dead) {
    sqX = 1.25; sqY = 0.7;
  } else if (mario.doubleJumpAnim > 0) {
    var djt = (20 - mario.doubleJumpAnim) / 20;
    var spin = Math.sin(djt * Math.PI * 2) * 0.15;
    sqX = 0.85 + spin;
    sqY = 1.15 - spin;
  } else if (!mario.onGround) {
    sqX = 0.88; sqY = 1.12;
  } else if (mario.landSquash > 0) {
    var landT = mario.landSquash / 8;
    sqX = 1.0 + 0.2 * landT;
    sqY = 1.0 - 0.15 * landT;
    bounceY = bodyR * 0.15 * landT;
  } else if (mario.skidding) {
    sqX = 1.12; sqY = 0.9;
  } else if (mario.crouching && isBig) {
    sqX = 1.3; sqY = 0.65;
    bounceY = bodyR * (1 - sqY);
  } else if (Math.abs(mario.vx) > 0.15) {
    var walkSpeed = 0.22 + Math.abs(mario.vx) * 0.08;
    const t = globalTick * walkSpeed;
    var intensity = Math.min(1, Math.abs(mario.vx) / 2.5);
    bounceY = Math.sin(t) * (1.0 + intensity * 0.8);
    sqX = 1.0 + Math.cos(t) * 0.05 * intensity;
    sqY = 1.0 - Math.cos(t) * 0.05 * intensity;
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
  } else if (Math.abs(mario.vx) > 0.3) {
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
    var ringR = bodyR * (1.2 + djProg * 1.5);
    var ringAlpha = (1 - djProg) * 0.35;
    bx.save();
    bx.globalAlpha = ringAlpha;
    bx.strokeStyle = highCol || '#e0d0f8';
    bx.lineWidth = 1.5 * (1 - djProg);
    bx.beginPath();
    bx.ellipse(cx, bcy, ringR, ringR * 0.5, 0, 0, Math.PI * 2);
    bx.stroke();
    bx.restore();
  }
}

function drawEntities() {
  entities.forEach(e => {
    if (!e.alive && e.type !== 'goomba' && e.type !== 'buzzy' && e.type !== 'swooper' && e.type !== 'phantom') return;
    const sx = Math.floor(e.x - camera.rx);
    if (sx < -TILE || sx > VIEW_W + TILE) return;

    if (e.type === 'goomba') {
      drawPixels(bx, sx, Math.floor(e.y), e.flat ? GOOMBA_FLAT : GOOMBA_SPRITE, GOOMBA_PALETTE, e.frame === 1);
    } else if (e.type === 'koopa') {
      var ey = Math.floor(e.y);
      var ecx = sx + 8;
      if (e.shell) {
        // Shell mode (h=16): ground at ey+16, center shell at ey+10
        var shCy = ey + 10;
        var shGrad = bx.createRadialGradient(ecx + 1, shCy - 1, 1, ecx, shCy, 7);
        shGrad.addColorStop(0, '#7898d0');
        shGrad.addColorStop(0.6, '#5878b8');
        shGrad.addColorStop(1, '#384888');
        bx.fillStyle = shGrad;
        bx.beginPath();
        bx.ellipse(ecx, shCy, 7, 5.5, 0, 0, Math.PI * 2);
        bx.fill();
        bx.fillStyle = 'rgba(255,255,255,0.15)';
        bx.beginPath();
        bx.ellipse(ecx + 1, shCy - 2, 3, 2, -0.3, 0, Math.PI * 2);
        bx.fill();
        bx.fillStyle = '#384888';
        bx.beginPath();
        bx.ellipse(ecx, shCy + 4, 7, 1.5, 0, 0, Math.PI * 2);
        bx.fill();
        if (e.shellMoving) {
          var spinPhase = globalTick * 0.5;
          bx.strokeStyle = '#384888';
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
        ksGrad.addColorStop(0, '#7898d0');
        ksGrad.addColorStop(0.6, '#5878b8');
        ksGrad.addColorStop(1, '#384888');
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
        bx.strokeStyle = '#384888';
        bx.lineWidth = 0.6;
        bx.beginPath();
        bx.moveTo(ecx - kdir, shellCy - 5);
        bx.lineTo(ecx - kdir, shellCy + 5);
        bx.stroke();
        // Head
        var headX = ecx + kdir * 6;
        var headY = shellCy - 7 + kbob;
        var hGrad = bx.createRadialGradient(headX, headY, 0.5, headX, headY + 1, 4);
        hGrad.addColorStop(0, '#b8d060');
        hGrad.addColorStop(0.7, '#88a840');
        hGrad.addColorStop(1, '#607828');
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
      drawPixels(bx, sx, Math.floor(e.y), e.flat ? BUZZY_FLAT : BUZZY_SPRITE, BUZZY_PALETTE, e.frame === 1);
    } else if (e.type === 'swooper') {
      if (e.flat) return;
      var scx = sx + 7, scy = Math.floor(e.y) + 7;
      var wt = (e.swoopTick || 0) * 4;
      var wingFlap = Math.sin(wt);

      // Left wing (rounded ellipse)
      bx.fillStyle = '#5838a0';
      bx.beginPath();
      bx.ellipse(scx - 8, scy - 1 + wingFlap * 4, 5, 2.5 + wingFlap, -0.3 + wingFlap * 0.3, 0, Math.PI * 2);
      bx.fill();
      // Right wing (rounded ellipse)
      bx.beginPath();
      bx.ellipse(scx + 8, scy - 1 + wingFlap * 4, 5, 2.5 + wingFlap, 0.3 - wingFlap * 0.3, 0, Math.PI * 2);
      bx.fill();

      // Body
      var swGrad = bx.createRadialGradient(scx + 1, scy - 1, 1, scx, scy, 6);
      swGrad.addColorStop(0, '#9068c8');
      swGrad.addColorStop(0.7, '#5838a0');
      swGrad.addColorStop(1, '#2a1050');
      bx.fillStyle = swGrad;
      bx.beginPath();
      bx.ellipse(scx, scy, 5, 4.5, 0, 0, Math.PI * 2);
      bx.fill();

      // Ears
      bx.fillStyle = '#5838a0';
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
      var pcx = sx + 7, pcy = Math.floor(e.y) + 6;
      var pTick = (e.floatTick || 0);
      var pAlpha = 0.85 + Math.sin(pTick * 1.5) * 0.1;
      var pdir = e.vx > 0 ? 1 : -1;
      var tailWave = Math.sin(pTick * 2.5);

      bx.save();
      bx.globalAlpha = pAlpha;

      var phGrad = bx.createRadialGradient(pcx + 1, pcy - 2, 1, pcx, pcy + 1, 8);
      phGrad.addColorStop(0, '#fcfcfc');
      phGrad.addColorStop(0.5, '#e0d8f0');
      phGrad.addColorStop(1, '#b8a8d8');
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
    if (item.type === 'mushroom') {
      const mCapGrad = bx.createRadialGradient(sx + 6, iy - 3, 1, sx + 8, iy, 9);
      mCapGrad.addColorStop(0, '#f0a0b0');
      mCapGrad.addColorStop(0.6, COL.mushroom);
      mCapGrad.addColorStop(1, '#903050');
      bx.fillStyle = mCapGrad;
      bx.beginPath(); bx.arc(sx + 8, iy, 8, Math.PI, 0); bx.closePath(); bx.fill();
      bx.fillRect(sx, iy, 16, 2);
      bx.fillStyle = COL.mushroomSpots;
      bx.beginPath(); bx.arc(sx + 8, iy - 3, 3, 0, Math.PI * 2); bx.fill();
      const stemGrad = bx.createLinearGradient(sx + 2, 0, sx + 14, 0);
      stemGrad.addColorStop(0, '#c8b8e0');
      stemGrad.addColorStop(0.5, '#e8e0f0');
      stemGrad.addColorStop(1, '#c8b8e0');
      bx.fillStyle = stemGrad;
      bx.fillRect(sx + 3, iy + 2, 10, 10);
      bx.fillRect(sx + 4, iy + 8, 3, 4);
      bx.fillRect(sx + 9, iy + 8, 3, 4);
    } else if (item.type === 'flower') {
      const t = Math.floor(Date.now() / 120) % 4;
      const flowerCols = ['#c0a8e8', '#ff80b0', '#fcfcfc', '#e8c850'];
      const stGrad = bx.createLinearGradient(sx + 6, 0, sx + 10, 0);
      stGrad.addColorStop(0, '#5848a0');
      stGrad.addColorStop(0.5, '#7868c0');
      stGrad.addColorStop(1, '#5848a0');
      bx.fillStyle = stGrad;
      bx.fillRect(sx + 6, iy + 8, 4, 8);
      bx.fillRect(sx + 2, iy + 10, 4, 3);
      bx.fillRect(sx + 10, iy + 10, 4, 3);
      const fcol = flowerCols[t];
      const fgr = bx.createRadialGradient(sx + 7, iy + 3, 1, sx + 8, iy + 4, 6);
      fgr.addColorStop(0, '#fcfcfc');
      fgr.addColorStop(0.6, fcol);
      fgr.addColorStop(1, '#805090');
      bx.fillStyle = fgr;
      bx.beginPath(); bx.arc(sx + 8, iy + 4, 5, 0, Math.PI * 2); bx.fill();
      bx.fillStyle = fcol;
      bx.beginPath(); bx.arc(sx + 3, iy + 4, 3, 0, Math.PI * 2); bx.fill();
      bx.beginPath(); bx.arc(sx + 13, iy + 4, 3, 0, Math.PI * 2); bx.fill();
      bx.beginPath(); bx.arc(sx + 8, iy - 1, 3, 0, Math.PI * 2); bx.fill();
      bx.beginPath(); bx.arc(sx + 8, iy + 9, 3, 0, Math.PI * 2); bx.fill();
      bx.fillStyle = '#f0d060';
      bx.beginPath(); bx.arc(sx + 8, iy + 4, 2, 0, Math.PI * 2); bx.fill();
      bx.save();
      bx.globalAlpha = 0.4;
      bx.fillStyle = '#fcfcfc';
      bx.beginPath(); bx.arc(sx + 7, iy + 3, 1, 0, Math.PI * 2); bx.fill();
      bx.restore();
    } else if (item.type === 'star') {
      const t = Math.floor(Date.now() / 100) % 3;
      const starCols = ['#e8c850', '#c0a8e8', '#fcfcfc'];
      const scx = sx + 8, scy = iy + 8;
      bx.save();
      bx.globalAlpha = 0.25;
      bx.fillStyle = starCols[t];
      bx.beginPath(); bx.arc(scx, scy, 10, 0, Math.PI * 2); bx.fill();
      bx.restore();
      const sGrad = bx.createRadialGradient(scx - 1, scy - 2, 1, scx, scy, 8);
      sGrad.addColorStop(0, '#fcfcfc');
      sGrad.addColorStop(0.4, starCols[t]);
      sGrad.addColorStop(1, '#806020');
      bx.fillStyle = sGrad;
      bx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5);
        const innerAngle = angle + Math.PI / 5;
        const ox = scx + Math.cos(angle) * 7;
        const oy = scy + Math.sin(angle) * 7;
        const ix = scx + Math.cos(innerAngle) * 3;
        const iy2 = scy + Math.sin(innerAngle) * 3;
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
    var rad = d.sparkle ? (0.8 + t * 0.8) : (1.2 + t * 1.5);
    var alpha = (1 - t * t) * (d.sparkle ? 0.8 : 0.55);
    bx.save();
    bx.globalAlpha = alpha;
    bx.fillStyle = d.sparkle ? '#fcf0a0' : '#d8c8f0';
    bx.beginPath();
    bx.arc(dsx + 1, Math.floor(d.y) + 1, rad, 0, Math.PI * 2);
    bx.fill();
    bx.restore();
  });
}

function drawBoss() {
  if (!boss) return;
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

  // Body highlight
  bx.save();
  bx.globalAlpha = 0.2;
  bx.fillStyle = '#c0a0e0';
  bx.beginPath();
  bx.ellipse(cx + bodyW * 0.15, cy + bodyH * 0.15, bodyW * 0.4, bodyH * 0.2, -0.3, 0, Math.PI * 2);
  bx.fill();
  bx.restore();

  // Spikes on top (crown-like)
  var spikeCol = rage ? '#c04060' : '#a080d0';
  var spikeDark = rage ? '#802040' : '#6848a0';
  for (var si = 0; si < 5; si++) {
    var sa = -0.7 + si * 0.35;
    var spx = cx + Math.sin(sa) * bodyW * 0.7;
    var spy = cy + bodyH * 0.4 - Math.cos(sa) * bodyH * 0.5;
    var spikeH = 5 + (si === 2 ? 3 : 0) + breathe * 0.5;
    bx.fillStyle = spikeDark;
    bx.beginPath();
    bx.moveTo(spx - 2.5, spy + 1);
    bx.lineTo(spx, spy - spikeH);
    bx.lineTo(spx + 2.5, spy + 1);
    bx.closePath();
    bx.fill();
    bx.fillStyle = spikeCol;
    bx.beginPath();
    bx.moveTo(spx - 2, spy);
    bx.lineTo(spx, spy - spikeH + 1);
    bx.lineTo(spx + 2, spy);
    bx.closePath();
    bx.fill();
  }

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

function drawBossGate() {
  if (!boss || !boss.alive) return;
  const gx = Math.floor(BOSS_GATE_X * TILE - camera.rx);
  if (gx < -TILE || gx > VIEW_W + TILE) return;
  for (let row = 6; row <= 12; row++) {
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

  if (!flagDescending) {
    const wave = Math.sin(globalTick * 0.1) * 1.5;
    const flagGrad = bx.createLinearGradient(fx - 8, 0, fx + 6, 0);
    flagGrad.addColorStop(0, '#c0a8e8');
    flagGrad.addColorStop(1, '#7060a8');
    bx.fillStyle = flagGrad;
    bx.beginPath();
    bx.moveTo(fx + 6, 3 * TILE + 2);
    bx.lineTo(fx - 8 + wave, 3 * TILE + 7);
    bx.lineTo(fx + 6, 3 * TILE + 12);
    bx.closePath();
    bx.fill();
  }
}

function drawCastle() {
  const ccx = Math.floor(CASTLE_X * TILE - camera.rx);
  if (ccx < -80 || ccx > VIEW_W + 20) return;

  const wallGrad = bx.createLinearGradient(ccx, 0, ccx + 5 * TILE, 0);
  wallGrad.addColorStop(0, COL.castleLight);
  wallGrad.addColorStop(0.3, COL.castle);
  wallGrad.addColorStop(1, COL.castleDark);
  bx.fillStyle = wallGrad;
  bx.fillRect(ccx, 8 * TILE, 5 * TILE, 5 * TILE);

  bx.fillStyle = 'rgba(0,0,0,0.15)';
  bx.fillRect(ccx + 5 * TILE - 2, 8 * TILE, 2, 5 * TILE);
  bx.fillStyle = 'rgba(255,255,255,0.08)';
  bx.fillRect(ccx, 8 * TILE, 5 * TILE, 1);

  const doorGrad = bx.createLinearGradient(0, 10 * TILE, 0, 13 * TILE);
  doorGrad.addColorStop(0, '#201830');
  doorGrad.addColorStop(1, '#100810');
  bx.fillStyle = doorGrad;
  bx.fillRect(ccx + 2 * TILE, 11 * TILE, TILE, 2 * TILE);
  bx.beginPath();
  bx.arc(ccx + 2.5 * TILE, 11 * TILE, TILE / 2, Math.PI, 0, false);
  bx.fill();

  for (let i = 0; i < 5; i++) {
    const bGrad = bx.createLinearGradient(0, 7 * TILE, 0, 8 * TILE);
    bGrad.addColorStop(0, COL.castleLight);
    bGrad.addColorStop(1, COL.castle);
    bx.fillStyle = bGrad;
    bx.fillRect(ccx + i * TILE, 7 * TILE, TILE - 2, TILE);
    bx.fillStyle = 'rgba(255,255,255,0.1)';
    bx.fillRect(ccx + i * TILE, 7 * TILE, TILE - 2, 1);
  }

  bx.fillStyle = '#0a0818';
  bx.fillRect(ccx + TILE + 2, 9 * TILE + 2, 6, 8);
  bx.fillRect(ccx + 3 * TILE + 2, 9 * TILE + 2, 6, 8);
  bx.fillStyle = 'rgba(180,140,80,0.25)';
  bx.fillRect(ccx + TILE + 3, 9 * TILE + 3, 4, 2);
  bx.fillRect(ccx + 3 * TILE + 3, 9 * TILE + 3, 4, 2);

  const twrGrad = bx.createLinearGradient(ccx + 1.5 * TILE, 0, ccx + 3.5 * TILE, 0);
  twrGrad.addColorStop(0, COL.castleLight);
  twrGrad.addColorStop(0.3, COL.castle);
  twrGrad.addColorStop(1, COL.castleDark);
  bx.fillStyle = twrGrad;
  bx.fillRect(ccx + 1.5 * TILE, 5 * TILE, 2 * TILE, 3 * TILE);
  bx.fillStyle = 'rgba(255,255,255,0.08)';
  bx.fillRect(ccx + 1.5 * TILE, 5 * TILE, 2 * TILE, 1);
  bx.fillStyle = 'rgba(0,0,0,0.12)';
  bx.fillRect(ccx + 3.5 * TILE - 1, 5 * TILE, 1, 3 * TILE);
}

function drawProgressBar() {
  if (!multiplayerMode || racePlayers.length === 0) return;

  if (!eliminated) {
    const me = racePlayers.find(p => p.id === myPlayerId);
    if (me && !me.finished && me.alive) {
      me.progress = Math.min(1, mario.x / ((LEVEL_WIDTH - 15) * TILE));
    }
  }

  const barX = 16;
  const barY = 29;
  const barW = VIEW_W - 32;
  const barH = 3;

  bx.fillStyle = 'rgba(0,0,0,0.4)';
  bx.beginPath();
  bx.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2);
  bx.fill();

  const pbGrad = bx.createLinearGradient(0, barY, 0, barY + barH);
  pbGrad.addColorStop(0, '#484058');
  pbGrad.addColorStop(1, '#282030');
  bx.fillStyle = pbGrad;
  bx.beginPath();
  bx.roundRect(barX, barY, barW, barH, 1.5);
  bx.fill();

  for (var ci = 0; ci < CHECKPOINT_XS.length; ci++) {
    var cpProgress = (CHECKPOINT_XS[ci] * TILE) / ((LEVEL_WIDTH - 15) * TILE);
    var cpX = barX + Math.round(cpProgress * (barW - 4));
    bx.fillStyle = 'rgba(200,180,240,0.35)';
    bx.fillRect(cpX, barY - 1, 1, barH + 2);
  }

  const finGrad = bx.createRadialGradient(barX + barW - 3, barY + 1, 1, barX + barW - 3, barY + 1, 4);
  finGrad.addColorStop(0, '#e0d0f8');
  finGrad.addColorStop(1, '#a090c0');
  bx.fillStyle = finGrad;
  bx.beginPath();
  bx.arc(barX + barW - 2, barY + barH / 2, 2.5, 0, Math.PI * 2);
  bx.fill();

  racePlayers.forEach((p, i) => {
    const col = getPlayerDisplayColor(p.color || 'lavender');
    const progress = Math.max(0, Math.min(1, p.progress || 0));
    const px = barX + Math.round(progress * (barW - 4));
    const isMe = p.id === myPlayerId;
    const initial = (p.name || '?')[0].toUpperCase();

    if (!p.alive && !p.finished) {
      bx.fillStyle = '#555';
      bx.beginPath();
      bx.arc(px + 1, barY + barH / 2, 1.5, 0, Math.PI * 2);
      bx.fill();
    } else if (p.finished) {
      bx.fillStyle = col;
      bx.beginPath();
      bx.arc(px + 1.5, barY + barH / 2, 2.5, 0, Math.PI * 2);
      bx.fill();
    } else {
      bx.fillStyle = col;
      const dotR = isMe ? 3 : 2;
      bx.beginPath();
      bx.arc(px + 1.5, barY + barH / 2, dotR, 0, Math.PI * 2);
      bx.fill();
      if (isMe) {
        bx.save();
        bx.globalAlpha = 0.3;
        bx.beginPath();
        bx.arc(px + 1.5, barY + barH / 2, dotR + 2, 0, Math.PI * 2);
        bx.fill();
        bx.restore();
      }
    }
    if (isMe || p.finished) {
      bx.save();
      bx.font = 'bold 5px sans-serif';
      bx.textAlign = 'center';
      bx.textBaseline = 'middle';
      bx.fillStyle = isMe ? '#fff' : col;
      bx.globalAlpha = 0.9;
      bx.fillText(initial, px + 1.5, barY - 3);
      bx.restore();
    }
  });
}

function drawHUD() {
  const sh = 'rgba(0,0,0,0.55)';

  drawPixelText(bx, 'BLOB', 24, 8, COL.text, sh);
  drawPixelText(bx, String(score).padStart(6, '0'), 24, 18, COL.text, sh);

  const hudCoinGrad = bx.createRadialGradient(74, 20, 1, 75, 21, 4);
  hudCoinGrad.addColorStop(0, '#fcf0a0');
  hudCoinGrad.addColorStop(0.5, COL.coin);
  hudCoinGrad.addColorStop(1, '#a08020');
  bx.fillStyle = hudCoinGrad;
  bx.beginPath();
  bx.ellipse(75, 22, 3, 3.5, 0, 0, Math.PI * 2);
  bx.fill();
  drawPixelText(bx, 'x' + String(coins).padStart(2, '0'), 82, 18, COL.text, sh);

  const livesStr = 'x' + (lives - 1);
  const livesColor = lives <= 1 ? '#ff80a0' : COL.text;
  drawPixelText(bx, 'LIVES', 108, 8, COL.text, sh);
  drawPixelText(bx, livesStr, 116, 18, livesColor, sh);

  drawPixelText(bx, 'ZONE', 150, 8, COL.text, sh);
  drawPixelText(bx, '1-1', 154, 18, COL.text, sh);

  if (multiplayerMode) {
    drawPixelText(bx, 'MATCH', 204, 8, COL.text, sh);
    const min = Math.floor(matchTimeRemaining / 60);
    const sec = matchTimeRemaining % 60;
    const timeStr = String(min) + ':' + String(sec).padStart(2, '0');
    const tColor = matchTimeRemaining <= 30 && matchTimeRemaining % 2 === 0 ? '#ff80a0' : COL.text;
    drawPixelText(bx, timeStr, 208, 18, tColor, sh);
  } else {
    drawPixelText(bx, 'TIME', 210, 8, COL.text, sh);
    const tColor = time <= 30 && time % 2 === 0 ? '#ff80a0' : COL.text;
    drawPixelText(bx, String(Math.max(0, time)).padStart(3, '0'), 214, 18, tColor, sh);
  }

  drawProgressBar();
}

function drawScoreboard() {
  if (!showScoreboard || !multiplayerMode || racePlayers.length === 0) return;

  const sorted = racePlayers.slice().sort((a, b) => {
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;
    if (a.finished && b.finished) return (a.finishTime || 0) - (b.finishTime || 0);
    if (!a.alive && b.alive) return 1;
    if (a.alive && !b.alive) return -1;
    return (b.progress || 0) - (a.progress || 0);
  });

  const rowH = 9;
  const titleH = 12;
  const colHeaderH = 10;
  const headerH = titleH + colHeaderH;
  const maxVisible = Math.min(sorted.length, 16);
  const hasMore = sorted.length > maxVisible;
  const panelH = headerH + maxVisible * rowH + (hasMore ? 12 : 5);
  const panelW = 236;
  const panelX = Math.floor((VIEW_W - panelW) / 2);
  const panelY = Math.floor((VIEW_H - panelH) / 2);

  const colName = panelX + 18;
  const colProg = panelX + 100;
  const colCoins = panelX + 132;
  const colScore = panelX + 164;
  const colStatus = panelX + 196;

  bx.save();
  bx.globalAlpha = 0.92;
  bx.fillStyle = '#0c0614';
  bx.beginPath();
  bx.roundRect(panelX, panelY, panelW, panelH, 4);
  bx.fill();
  bx.restore();

  bx.fillStyle = 'rgba(160,120,220,0.25)';
  bx.fillRect(panelX + 2, panelY, panelW - 4, 1);
  bx.fillRect(panelX + 2, panelY + panelH - 1, panelW - 4, 1);

  var titleStr = 'RACE  ' + racePlayers.length + ' PLAYERS';
  var titleW = titleStr.length * 6;
  drawPixelText(bx, titleStr, panelX + Math.floor((panelW - titleW) / 2), panelY + 3, '#c0a8e8', null);

  var colY = panelY + titleH + 1;
  drawPixelText(bx, '#', panelX + 5, colY, '#6858a0', null);
  drawPixelText(bx, 'NAME', colName, colY, '#6858a0', null);
  drawPixelText(bx, 'PROG', colProg, colY, '#6858a0', null);
  drawPixelText(bx, 'COINS', colCoins, colY, '#6858a0', null);
  drawPixelText(bx, 'SCORE', colScore, colY, '#6858a0', null);

  bx.fillStyle = 'rgba(160,120,220,0.12)';
  bx.fillRect(panelX + 4, panelY + headerH - 1, panelW - 8, 1);

  for (var i = 0; i < maxVisible; i++) {
    var p = sorted[i];
    var col = getPlayerDisplayColor(p.color || 'lavender');
    var rowY = panelY + headerH + i * rowH;
    var isMe = p.id === myPlayerId;

    if (isMe) {
      bx.save();
      bx.globalAlpha = 0.15;
      bx.fillStyle = col;
      bx.fillRect(panelX + 2, rowY, panelW - 4, rowH);
      bx.restore();
    }

    if (i % 2 === 1 && !isMe) {
      bx.save();
      bx.globalAlpha = 0.035;
      bx.fillStyle = '#fff';
      bx.fillRect(panelX + 2, rowY, panelW - 4, rowH);
      bx.restore();
    }

    drawPixelText(bx, String(i + 1), panelX + 5, rowY + 1, '#8878a8', null);

    var nameStr = p.name || 'Blobby';
    if (nameStr.length > 12) nameStr = nameStr.substring(0, 12);
    drawPixelText(bx, nameStr, colName, rowY + 1, col, null);

    var pctStr = Math.round((p.progress || 0) * 100) + '%';
    drawPixelText(bx, pctStr, colProg, rowY + 1, '#d0c0e8', null);

    drawPixelText(bx, String(p.coins || 0), colCoins, rowY + 1, '#f0d050', null);

    drawPixelText(bx, String(p.gameScore || 0), colScore, rowY + 1, '#e0d0f8', null);

    var statusStr = '';
    if (p.finished) statusStr = (p.finishTime / 1000).toFixed(1) + 'S';
    else if (!p.alive) statusStr = 'OUT';
    var statusCol = p.finished ? '#80e8a0' : '#ff6060';
    if (statusStr) drawPixelText(bx, statusStr, colStatus, rowY + 1, statusCol, null);
  }

  if (hasMore) {
    var moreStr = '+' + (sorted.length - maxVisible) + ' MORE';
    var moreW = moreStr.length * 6;
    drawPixelText(bx, moreStr, panelX + Math.floor((panelW - moreW) / 2), panelY + panelH - 10, '#8878a8', null);
  }
}

function drawLevel() {
  const startTX = Math.max(0, Math.floor(camera.rx / TILE) - 1);
  const endTX = Math.min(LEVEL_WIDTH, Math.ceil((camera.rx + VIEW_W) / TILE) + 1);

  for (let ty = 0; ty < LEVEL_HEIGHT; ty++) {
    for (let tx = startTX; tx < endTX; tx++) {
      const tile = levelMap[ty][tx];
      if (tile !== 0) {
        let drawY = ty * TILE;
        const bump = particles.find(p => p.type === 'bump' && p.x === tx * TILE && p.origY === ty * TILE);
        if (bump) {
          var bt = 1 - bump.timer / 8;
          drawY -= Math.sin(bt * Math.PI) * 6;
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
  if (gameState === 'gameover') {
    bx.fillStyle = '#100818';
    bx.fillRect(0, 0, VIEW_W, VIEW_H);
    var goVig = bx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.2, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.7);
    goVig.addColorStop(0, 'rgba(40,20,60,0.0)');
    goVig.addColorStop(1, 'rgba(0,0,0,0.35)');
    bx.fillStyle = goVig;
    bx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawBlobIcon(VIEW_W / 2, VIEW_H / 2 - 20, 12, mySelectedColor, true);
    var goPhase = Math.floor(globalTick / 5) % 3;
    var goCols = ['#c0a8e8', '#d8b8f0', '#b098d0'];
    var goText = 'GAME OVER';
    var goW = goText.length * 6;
    drawPixelText(bx, goText, ((VIEW_W - goW) / 2) | 0, (VIEW_H / 2 + 6) | 0, goCols[goPhase], '#1a1028');
    var goAlpha = 0.4 + 0.4 * Math.sin(globalTick * 0.06);
    bx.save();
    bx.globalAlpha = goAlpha;
    var goPrompt = 'PRESS ENTER';
    var goPW = goPrompt.length * 6;
    drawPixelText(bx, goPrompt, ((VIEW_W - goPW) / 2) | 0, (VIEW_H / 2 + 22) | 0, '#a090c0', null);
    bx.restore();
    ctx.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, canvas.width, canvas.height);
    drawScanlines();
    return;
  }
  if (gameState === 'lifeLost') {
    bx.fillStyle = '#100818';
    bx.fillRect(0, 0, VIEW_W, VIEW_H);
    const wText = 'ZONE 1-1';
    const wW = wText.length * 6;
    drawPixelText(bx, wText, ((VIEW_W - wW) / 2) | 0, (VIEW_H / 2 - 28) | 0, '#e0d0f8', null);
    drawBlobIcon(VIEW_W / 2 - 10, VIEW_H / 2 + 2, 10, mySelectedColor, false);
    drawPixelText(bx, 'x  ' + (lives - 1), (VIEW_W / 2 + 6) | 0, (VIEW_H / 2) | 0, '#e0d0f8', null);
    if (multiplayerMode) {
      document.getElementById('raceTimeline').classList.add('visible');
    }
    ctx.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, canvas.width, canvas.height);
    drawScanlines();
    return;
  }

  camera.rx = Math.floor(prevState.cx + (camera.x - prevState.cx) * renderAlpha);
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
  drawMarioFireballs();
  drawParticles();
  drawMario();
  drawHUD();
  drawScoreboard();

  if (hudMessage) {
    var hm = hudMessage;
    var fadeIn = Math.min(1, (hm.maxLife - hm.life) / 15);
    var fadeOut = Math.min(1, hm.life / 20);
    var hmAlpha = Math.min(fadeIn, fadeOut);
    var slideY = (1 - fadeIn) * -8;
    bx.save();
    bx.globalAlpha = hmAlpha * 0.6;
    var hmW = hm.text.length * 6 + 20;
    var hmX = Math.round((VIEW_W - hmW) / 2);
    var hmY = Math.round(VIEW_H * 0.32 + slideY);
    bx.fillStyle = '#1a1028';
    bx.beginPath();
    bx.roundRect(hmX, hmY - 2, hmW, 14, 4);
    bx.fill();
    bx.globalAlpha = hmAlpha;
    var textX = Math.round((VIEW_W - hm.text.length * 6) / 2);
    drawPixelText(bx, hm.text, textX, hmY + 1, '#e0d0f8', null);
    bx.restore();
  }

  if (eliminated && multiplayerMode) {
    document.getElementById('raceTimeline').classList.add('visible');

    bx.fillStyle = 'rgba(16,8,24,0.85)';
    bx.fillRect(0, 0, VIEW_W, VIEW_H);
    var elVig = bx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.15, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.65);
    elVig.addColorStop(0, 'rgba(60,20,30,0.0)');
    elVig.addColorStop(1, 'rgba(0,0,0,0.3)');
    bx.fillStyle = elVig;
    bx.fillRect(0, 0, VIEW_W, VIEW_H);

    var elPhase = Math.floor(globalTick / 6) % 2;
    var elText = 'ELIMINATED';
    var elW = elText.length * 6;
    drawPixelText(bx, elText, Math.round((VIEW_W - elW) / 2), VIEW_H / 2 - 38, elPhase ? '#ff80a0' : '#e06080', '#1a1028');

    drawBlobIcon(VIEW_W / 2, VIEW_H / 2 - 14, 10, mySelectedColor, true);

    drawPixelText(bx, 'SCORE: ' + score, 32, VIEW_H / 2 + 6, '#e0d0f8', '#1a1028');
    drawPixelText(bx, 'COINS: ' + coins, 32, VIEW_H / 2 + 16, '#e0d0f8', '#1a1028');

    var pulseAlpha = 0.5 + 0.5 * Math.sin(globalTick * 0.05);
    bx.save();
    bx.globalAlpha = pulseAlpha;
    var waitText = 'WAITING FOR MATCH TO END...';
    var waitW = waitText.length * 6;
    drawPixelText(bx, waitText, Math.round((VIEW_W - waitW) / 2), VIEW_H / 2 + 34, '#a898c8', '#1a1028');
    bx.restore();
  }

  if (gameState === 'win' && !multiplayerMode) {
    bx.fillStyle = 'rgba(16,8,24,0.82)';
    bx.fillRect(0, VIEW_H / 2 - 52, VIEW_W, 104);
    bx.fillStyle = 'rgba(192,168,232,0.15)';
    bx.fillRect(0, VIEW_H / 2 - 52, VIEW_W, 1);
    bx.fillRect(0, VIEW_H / 2 + 51, VIEW_W, 1);

    var titlePhase = Math.floor(globalTick / 4) % 3;
    var titleCols = ['#c0a8e8', '#e0d0f8', '#d8b8f0'];
    const ccText = 'ADVENTURE CLEAR!';
    const ccW = ccText.length * 6;
    drawPixelText(bx, ccText, Math.round((VIEW_W - ccW) / 2), VIEW_H / 2 - 44, titleCols[titlePhase], '#1a1028');

    drawPixelText(bx, 'FLAG BONUS: ' + flagBonus, 32, VIEW_H / 2 - 28, '#e0d0f8', '#1a1028');
    drawPixelText(bx, 'TIME BONUS: ' + timeBonus, 32, VIEW_H / 2 - 18, '#e0d0f8', '#1a1028');
    drawPixelText(bx, 'COINS: ' + coins + ' x200 = ' + (coins * 200), 32, VIEW_H / 2 - 8, '#e0d0f8', '#1a1028');
    drawPixelText(bx, 'ENEMIES: ' + enemiesKilled, 32, VIEW_H / 2 + 2, '#e0d0f8', '#1a1028');

    const totalText = 'TOTAL: ' + score;
    drawPixelText(bx, totalText, 32, VIEW_H / 2 + 16, '#c0a8e8', '#1a1028');

    var prAlpha = 0.5 + 0.5 * Math.sin(globalTick * 0.06);
    bx.save();
    bx.globalAlpha = prAlpha;
    const prText = 'PRESS ENTER TO PLAY AGAIN';
    const prW = prText.length * 6;
    drawPixelText(bx, prText, Math.round((VIEW_W - prW) / 2), VIEW_H / 2 + 34, '#d0c0e8', '#1a1028');
    bx.restore();
  }

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
    prevState.mx = mario.x;
    prevState.my = mario.y;
    prevState.cx = camera.x;
    entities.forEach(e => { e.px = e.x; e.py = e.y; });
    update();
    accumulator -= FIXED_DT;
    steps++;
  }

  if (steps > 0 || gameState !== 'playing') {
    renderAlpha = accumulator / FIXED_DT;
    render();
  }
  requestAnimationFrame(gameLoop);
}

// ================================================================
// PAUSE MENU
// ================================================================
function pauseGame() {
  paused = true;
  document.getElementById('pauseOverlay').classList.remove('hidden');
}

function resumeGame() {
  paused = false;
  document.getElementById('pauseOverlay').classList.add('hidden');
}

function quitToMenu() {
  stopStarMusic();
  paused = false;
  document.getElementById('pauseOverlay').classList.add('hidden');
  gameState = 'menu';
  if (multiplayerMode) {
    cleanupRoom();
  }
  multiplayerMode = false;
  isHost = false;
  currentRoomCode = '';
  showMenu();
}

// ================================================================
// MULTIPLAYER (WebSocket)
// ================================================================
const MATCH_DURATION = 300;
const myPlayerId = 'p_' + Math.random().toString(36).substring(2, 10);
var ws = null;
let multiplayerMode = false;
let isHost = false;
let currentRoomCode = '';
let roomStartTime = 0;
let roomMatchDuration = MATCH_DURATION;
let matchEnding = false;
let lastProgressWrite = 0;
let mySelectedColor = 'lavender';

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

function getPlayerDisplayColor(colorId) {
  const c = getColorOption(colorId);
  return c.hat;
}

function renderColorPicker(containerId, takenColors) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const taken = takenColors || [];
  container.innerHTML = MARIO_COLOR_OPTIONS.map(c => {
    const isTaken = taken.includes(c.id);
    const isSelected = c.id === mySelectedColor;
    let cls = 'color-swatch';
    if (isSelected) cls += ' selected';
    if (isTaken) cls += ' taken';
    return `<div class="${cls}" style="background:${c.hat};" data-color="${c.id}" onclick="selectColor('${containerId}','${c.id}')"></div>`;
  }).join('');
}

function selectColor(containerId, colorId) {
  mySelectedColor = colorId;
  if (containerId === 'lobbyColorPicker' && ws) {
    ws.emit('update_color', { color: colorId });
  }
  renderColorPicker(containerId, []);
}

var prevRoomState = null;

function connectSocket() {
  if (ws && ws.connected) return;
  ws = io({ reconnection: true, reconnectionDelay: 500, reconnectionAttempts: 10 });

  ws.on('room_state', function(data) {
    var playersList = Object.values(data.players || {});
    isHost = data.hostId === myPlayerId;

    switch (data.state) {
      case 'waiting':
        updateLobbyPlayers(playersList);
        if (prevRoomState !== 'waiting') {
          gameState = 'menu';
          document.getElementById('raceTimeline').classList.remove('visible');
          showLobby(currentRoomCode, playersList);
        }
        document.getElementById('startBtn').style.display = isHost ? '' : 'none';
        document.getElementById('waitMsg').style.display = isHost ? 'none' : '';
        break;

      case 'countdown':
        if (prevRoomState !== 'countdown') {
          showCountdown();
        }
        break;

      case 'playing':
        if (prevRoomState !== 'playing') {
          hideMenu();
          resumeGame();
          gameState = 'playing';
          time = 400;
          checkpointIndex = -1;
          resetLevel();
          roomStartTime = data.startTime;
          roomMatchDuration = data.matchDuration || MATCH_DURATION;
          matchTimeRemaining = roomMatchDuration;
          matchEnding = false;
          document.getElementById('raceTimeline').classList.add('visible');
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
        updateTimeline(playersList);
        break;

      case 'finished':
        if (prevRoomState !== 'finished') {
          matchEnding = false;
          gameState = 'menu';
          if (data.rankings) {
            showResults(data.rankings);
          }
        }
        break;
    }

    prevRoomState = data.state;
  });

  ws.on('room_closed', function() {
    leaveRoom();
  });
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
  matchEnding = false;
  lastProgressWrite = 0;
}

window.addEventListener('beforeunload', function() {
  if (ws && multiplayerMode) {
    ws.emit('leave_room');
  }
});

function updateLobbyPlayers(players) {
  const div = document.getElementById('lobbyPlayers');
  div.innerHTML = players.map((p, i) => {
    const col = getPlayerDisplayColor(p.color || 'lavender');
    return `<div style="color:${col}">${i === 0 ? '&#9733; ' : '  '}${p.name}${p.id === myPlayerId ? ' (You)' : ''}</div>`;
  }).join('');

  renderColorPicker('lobbyColorPicker', []);
}

function updateTimeline(players) {
  const div = document.getElementById('timelinePlayers');
  const sorted = players.slice().sort((a, b) => (b.progress || 0) - (a.progress || 0));
  div.innerHTML = sorted.map((p, i) => {
    const pct = Math.round((p.progress || 0) * 100);
    const col = getPlayerDisplayColor(p.color || 'lavender');
    const initial = (p.name || '?')[0].toUpperCase();
    let status = '';
    if (p.finished) status = ` ${(p.finishTime / 1000).toFixed(1)}s`;
    else if (!p.alive) status = ' ELIMINATED';
    return `<div class="timeline-player">
      <div class="timeline-name" style="color:${col}"><span class="timeline-initial" style="background:${col};">${initial}</span>${p.name}${status}</div>
      <div class="timeline-bar-bg">
        <div class="timeline-bar-fill" style="width:${pct}%;background:${col};"></div>
      </div>
    </div>`;
  }).join('');
}

function showResults(rankings) {
  hideAllMenuPanels();
  document.getElementById('menuResults').style.display = '';
  document.getElementById('menuOverlay').classList.remove('hidden');
  document.getElementById('raceTimeline').classList.remove('visible');

  const div = document.getElementById('resultsPlayers');
  const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
  const winner = rankings[0];
  let headerHtml = '';
  if (winner) {
    var winMsg = winner.finished ? winner.name + ' WINS!' : 'MATCH OVER';
    headerHtml = `<div style="color:#e0d0f8; font-size:18px; margin-bottom:12px; text-align:center; text-shadow:0 0 8px rgba(160,120,220,0.5);">${winMsg}</div>`;
  }
  div.innerHTML = headerHtml + rankings.map((p, i) => {
    const medal = medals[i] || `#${i + 1}`;
    const col = getPlayerDisplayColor(p.color || 'lavender');
    let statusStr = '';
    if (p.finished) statusStr = `FINISHED ${(p.finishTime / 1000).toFixed(2)}s`;
    else if (!p.alive) statusStr = 'ELIMINATED';
    else statusStr = `${Math.round((p.progress || 0) * 100)}% progress`;
    const finalScore = p.finalScore || 0;
    const coinCount = p.coins || 0;
    const isWinner = i === 0;
    const bgCol = isWinner ? 'rgba(100,70,160,0.3)' : 'rgba(40,25,70,0.2)';
    return `<div style="background:${bgCol}; border-radius:6px; padding:6px 8px; margin:4px 0; border:1px solid rgba(120,90,180,0.3);">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:14px;">${medal} <span style="color:${col}; font-weight:bold;">${p.name}</span></span>
        <span style="color:#e0d0f8; font-size:15px; font-weight:bold;">${finalScore}</span>
      </div>
      <div style="color:#a898c8; font-size:10px; margin-top:3px; display:flex; justify-content:space-between;">
        <span>${statusStr}</span>
        <span>Coins: ${coinCount}</span>
      </div>
    </div>`;
  }).join('');

  if (isHost) {
    document.getElementById('replayBtn').style.display = '';
  } else {
    document.getElementById('replayBtn').style.display = 'none';
  }
}

function showCountdown() {
  const el = document.getElementById('countdown');
  el.style.display = 'block';
  let count = 3;
  el.textContent = count;
  const iv = setInterval(() => {
    count--;
    if (count > 0) el.textContent = count;
    else if (count === 0) el.textContent = 'GO!';
    else { el.style.display = 'none'; clearInterval(iv); }
  }, 1000);
}

// ================================================================
// MENU NAVIGATION
// ================================================================
function hideAllMenuPanels() {
  ['menuMain','menuSinglePlayer','menuCreate','menuJoin','menuLobby','menuResults'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
}

function showMenu() {
  hideAllMenuPanels();
  document.getElementById('menuMain').style.display = '';
  document.getElementById('menuOverlay').classList.remove('hidden');
  document.getElementById('raceTimeline').classList.remove('visible');
}

function hideMenu() {
  document.getElementById('menuOverlay').classList.add('hidden');
}

function showMainMenu() {
  hideAllMenuPanels();
  document.getElementById('menuMain').style.display = '';
}

function showCreateRoom() {
  hideAllMenuPanels();
  document.getElementById('menuCreate').style.display = '';
  document.getElementById('createError').textContent = '';
}

function showJoinRoom() {
  hideAllMenuPanels();
  document.getElementById('menuJoin').style.display = '';
  document.getElementById('joinError').textContent = '';
}

function showLobby(code, players) {
  hideAllMenuPanels();
  document.getElementById('menuLobby').style.display = '';
  document.getElementById('menuOverlay').classList.remove('hidden');
  document.getElementById('lobbyCode').textContent = code;
  updateLobbyPlayers(players);
  if (isHost) {
    document.getElementById('startBtn').style.display = '';
    document.getElementById('waitMsg').style.display = 'none';
  } else {
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('waitMsg').style.display = '';
  }
}

function showSinglePlayerSetup() {
  hideAllMenuPanels();
  document.getElementById('menuSinglePlayer').style.display = '';
  renderColorPicker('singleColorPicker', []);
}

function startSinglePlayer() {
  multiplayerMode = false;
  hideMenu();
  gameState = 'playing';
  lives = 3;
  time = 400;
  checkpointIndex = -1;
  resetLevel();
}

function createRoom() {
  const btn = document.querySelector('#menuCreate .menu-btn');
  const name = document.getElementById('createName').value.trim() || 'Blobby';
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>CREATING...';
  document.getElementById('createError').textContent = '';
  mySelectedColor = MARIO_COLOR_OPTIONS[Math.floor(Math.random() * MARIO_COLOR_OPTIONS.length)].id;

  connectSocket();
  ws.emit('create_room', {
    playerId: myPlayerId,
    name: name.substring(0, 12),
    color: mySelectedColor,
    matchDuration: MATCH_DURATION,
  }, function(res) {
    btn.disabled = false;
    btn.innerHTML = 'CREATE';
    if (res.ok) {
      currentRoomCode = res.code;
      isHost = true;
      multiplayerMode = true;
      showLobby(res.code, [{ id: myPlayerId, name: name.substring(0, 12), color: mySelectedColor }]);
    } else {
      document.getElementById('createError').textContent = res.error || 'Failed to create room';
    }
  });
}

function joinRoom() {
  const btn = document.querySelector('#menuJoin .menu-btn');
  const code = document.getElementById('joinCode').value.trim().toUpperCase();
  const name = document.getElementById('joinName').value.trim() || 'Blobby';
  if (!code) { document.getElementById('joinError').textContent = 'Enter a room code'; return; }
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>JOINING...';
  document.getElementById('joinError').textContent = '';

  connectSocket();
  ws.emit('join_room', {
    code: code,
    playerId: myPlayerId,
    name: name.substring(0, 12),
    color: mySelectedColor,
  }, function(res) {
    btn.disabled = false;
    btn.innerHTML = 'JOIN';
    if (res.ok) {
      currentRoomCode = res.code;
      isHost = false;
      multiplayerMode = true;
    } else {
      document.getElementById('joinError').textContent = res.error || 'Failed to join room';
    }
  });
}

function startMultiplayerGame() {
  if (!ws || !isHost) return;
  ws.emit('start_game');
}

function returnToLobby() {
  if (!ws || !isHost) return;
  ws.emit('return_to_lobby');
}

function leaveRoom() {
  cleanupRoom();
  multiplayerMode = false;
  isHost = false;
  currentRoomCode = '';
  showMenu();
}

// ================================================================
// INIT
// ================================================================
resetLevel();
showMenu();
requestAnimationFrame(gameLoop);
