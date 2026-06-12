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
