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
const BOSS_ARENA_LEFT = 495;
const BOSS_ARENA_TRIGGER = 497;
const BOSS_GATE_X = 510;
const CASTLE_ENTER_DURATION = 32;

const canvas = document.getElementById('gameCanvas');
const TILE = 16;
const VIEW_W = 256;
const VIEW_H = 240;
const ASPECT = VIEW_W / VIEW_H;
const dpr = window.devicePixelRatio || 1;

const RES = 2;
const buf = document.createElement('canvas');
buf.width = VIEW_W * RES;
buf.height = VIEW_H * RES;
const bx = buf.getContext('2d');
bx.imageSmoothingEnabled = false;