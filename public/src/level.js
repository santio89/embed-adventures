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
