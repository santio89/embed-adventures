// ================================================================
// RENDERING HELPERS
// ================================================================
// Sprite/tile caching and pixel drawing utilities.


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