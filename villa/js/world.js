// The villa as data, plus walking physics. No three.js here, so it can be tested with node.
// Metres. x grows east, z grows south (towards the pool), y is up.

export const UPPER = 3; // height of the upper floor
export const ROOF = 5.8; // top of the walls
export const EYE = 1.6;
export const RADIUS = 0.25;
const STEP_UP = 0.4; // anything lower than this above the feet is walked onto
const BODY = 1.7;
export const POOL = { x0: 4.5, x1: 11.5, z0: 15.5, z1: 19.5 };
export const YARD = { x0: -9, x1: 25, z0: -8, z1: 25 };

// Every solid or visible block: walls, floors, steps and furniture all follow one collision rule.
export const boxes = [];
const box = (x0, x1, y0, y1, z0, z1, material, { solid = true } = {}) => boxes.push({ x0, x1, y0, y1, z0, z1, material, solid });
const decor = (x0, x1, y0, y1, z0, z1, material) => box(x0, x1, y0, y1, z0, z1, material, { solid: false });

const solidArea = (x0, x1, y, height, z0, z1) => box(x0, x1, y, y + height, z0, z1, null);

// ---------- walls ----------
const DOOR = (from, to) => ({ from, to, sill: 0, head: 2.2 });
const WINDOW = (from, to) => ({ from, to, sill: 0.9, head: 2.2, glass: true });
const GATE = (from, to) => ({ from, to, sill: 0, head: 2.4 }); // wide opening to the yard or between rooms

// axis "x": a wall running west-east at z = at. axis "z": running north-south at x = at.
function wall(axis, at, from, to, base, openings = [], { material = "plaster", thickness = 0.12, height = 2.8, outside = 0 } = {}) {
  const piece = (a, b, y0, y1, mat, offset, t, solid) => {
    if (b - a < 0.001 || y1 - y0 < 0.001) return;
    const [lo, hi] = [at + offset - t / 2, at + offset + t / 2];
    if (axis === "x") box(a, b, base + y0, base + y1, lo, hi, mat, { solid });
    else box(lo, hi, base + y0, base + y1, a, b, mat, { solid });
  };
  // The wall itself, then (for the ground floor outside) a stone skin on its outer face.
  const layers = [{ mat: material, offset: 0, t: thickness, solid: true }];
  if (outside) layers.push({ mat: "stone", offset: outside * (thickness / 2 + 0.025), t: 0.05, solid: false });
  const sorted = [...openings].sort((a, b) => a.from - b.from);
  for (const { mat, offset, t, solid } of layers) {
    let cursor = from;
    for (const o of sorted) {
      piece(cursor, o.from, 0, height, mat, offset, t, solid);
      piece(o.from, o.to, 0, o.sill, mat, offset, t, solid);
      piece(o.from, o.to, o.head, height, mat, offset, t, solid);
      cursor = o.to;
    }
    piece(cursor, to, 0, height, mat, offset, t, solid);
  }
  for (const o of sorted) {
    const frame = thickness + (outside ? 0.14 : 0.06);
    piece(o.from - 0.07, o.from, o.sill, o.head, "beam", 0, frame, false);
    piece(o.to, o.to + 0.07, o.sill, o.head, "beam", 0, frame, false);
    piece(o.from - 0.07, o.to + 0.07, o.head, o.head + 0.09, "beam", 0, frame, false);
    if (!o.glass) continue;
    piece(o.from - 0.07, o.to + 0.07, o.sill - 0.06, o.sill, "beam", 0, frame + 0.08, false);
    piece((o.from + o.to) / 2 - 0.025, (o.from + o.to) / 2 + 0.025, o.sill, o.head, "beam", 0, 0.06, false);
    piece(o.from, o.to, o.sill, o.head, "glass", 0, 0.02, true);
  }
}

const EXTERIOR = { thickness: 0.2 };
// Ground floor
wall("x", 0, -0.1, 16.1, 0, [WINDOW(1.5, 3.5), DOOR(6.4, 7.8), WINDOW(12.6, 13.8)], { ...EXTERIOR, outside: -1 });
wall("x", 12, -0.1, 16.1, 0, [GATE(2, 6), GATE(11, 13), WINDOW(14, 15.2)], { ...EXTERIOR, outside: 1 });
wall("z", 0, 0.1, 11.9, 0, [WINDOW(2, 4), WINDOW(8.4, 10.4)], { ...EXTERIOR, outside: -1 });
wall("z", 16, 0.1, 11.9, 0, [WINDOW(2, 3.5), WINDOW(7.5, 9.5)], { ...EXTERIOR, outside: 1 });
wall("x", 6, 0.1, 15.9, 0, [GATE(6, 8), DOOR(9.35, 10.75)]);
wall("z", 5, 0.1, 5.94, 0, [DOOR(2.5, 3.8)]);
wall("z", 11, 0.1, 5.94, 0, [DOOR(4.9, 5.9)]);
wall("z", 9, 6.06, 11.9, 0, [GATE(8, 10.5)]);
// Upper floor
wall("x", 0, -0.1, 16.1, UPPER, [WINDOW(1.5, 3.5), WINDOW(6, 8.4), WINDOW(12.6, 13.8)], EXTERIOR);
wall("x", 12, -0.1, 16.1, UPPER, [WINDOW(2, 5.5), WINDOW(11, 13.5)], EXTERIOR);
wall("z", 0, 0.1, 11.9, UPPER, [WINDOW(2, 4), WINDOW(8, 10)], EXTERIOR);
wall("z", 16, 0.1, 11.9, UPPER, [WINDOW(2, 3.5), WINDOW(10.4, 11.5)], EXTERIOR);
wall("x", 6, 0.1, 15.9, UPPER, [DOOR(6, 7.4), DOOR(9.3, 10.7)]);
wall("z", 5, 0.1, 5.94, UPPER, [DOOR(4.6, 5.85)]);
wall("z", 11, 0.1, 5.94, UPPER, [DOOR(4.9, 5.9)]);
wall("z", 9, 6.06, 11.9, UPPER);
decor(-0.14, 16.14, 2.8, UPPER, -0.14, -0.1, "beam"); // band between the floors
decor(-0.14, 16.14, 2.8, UPPER, 12.1, 12.14, "beam");
decor(-0.14, -0.1, 2.8, UPPER, -0.1, 12.1, "beam");
decor(16.1, 16.14, 2.8, UPPER, -0.1, 12.1, "beam");

// ---------- rooms and floors ----------
export const ROOMS = [
  // name, floor height, x0, x1, z0, z1, floor material, where a visitor is put
  ["Living room", 0, 0, 9, 6, 12, "wood", [5.2, 10.4, 50]],
  ["Kitchen and dining", 0, 9, 16, 6, 12, "tiles", [10.3, 11, -130]],
  ["Study", 0, 0, 5, 0, 6, "wood", [4.2, 3.2, 90]],
  ["Entrance hall", 0, 5, 11, 0, 6, "tiles", [7.1, 1.2, 180]],
  ["Bathroom", 0, 11, 16, 0, 6, "tiles", [11.7, 5.3, -50]],
  ["Main bedroom", UPPER, 0, 9, 6, 12, "wood", [6.6, 7, 120]],
  ["Children's bedroom", UPPER, 9, 16, 6, 12, "wood", [10, 6.9, -140]],
  ["Guest bedroom", UPPER, 0, 5, 0, 6, "wood", [4.3, 5.1, 35]],
  ["Upper landing", UPPER, 5, 11, 0, 6, "wood", [7.5, 4.5, -90]],
  ["Upper bathroom", UPPER, 11, 16, 0, 6, "tiles", [11.7, 5.3, -50]],
].map(([name, y, x0, x1, z0, z1, material, [x, z, yaw]]) => ({ name, y, x0, x1, z0, z1, material, spawn: { x, y, z, yaw } }));

export const STAIRS = { x0: 9.64, x1: 10.94, z0: 1.2, z1: 4.8, steps: 16 };

for (const room of ROOMS) {
  if (room.y === 0) {
    box(room.x0, room.x1, -0.2, 0.02, room.z0, room.z1, room.material);
    continue;
  }
  // The upper hall is cut around the stairwell.
  const s = STAIRS;
  const parts = room.name === "Upper landing"
    ? [[room.x0, s.x0, room.z0, room.z1], [s.x0, room.x1, room.z0, s.z0], [s.x0, room.x1, s.z1, room.z1]]
    : [[room.x0, room.x1, room.z0, room.z1]];
  for (const [x0, x1, z0, z1] of parts) {
    box(x0, x1, 2.84, UPPER, z0, z1, room.material);
    decor(x0, x1, 2.8, 2.84, z0, z1, "ceiling");
  }
}
decor(-0.1, 16.1, ROOF, ROOF + 0.08, -0.1, 12.1, "ceiling");
for (const x of [1.5, 3.2, 4.9, 6.6, 8.3, 10, 11.8, 13.2, 14.6]) {
  decor(x - 0.08, x + 0.08, 2.66, 2.8, 6.1, 11.9, "beam");
  decor(x - 0.08, x + 0.08, ROOF - 0.15, ROOF, 0.1, 11.9, "beam");
}

// ---------- stairs and railings ----------
{
  const { x0, x1, z0, z1, steps } = STAIRS;
  const run = (z1 - z0) / steps;
  const rise = UPPER / steps;
  for (let i = 0; i < steps; i++) {
    const top = (i + 1) * rise;
    box(x0, x1, 0, top - 0.05, z0 + i * run, z0 + (i + 1) * run, "plaster");
    box(x0 - 0.03, x1, top - 0.05, top, z0 + i * run - 0.03, z0 + (i + 1) * run, "beam");
    decor(x0 + 0.02, x0 + 0.06, top, top + 0.9, z0 + i * run + 0.08, z0 + i * run + 0.12, "iron");
    decor(x0, x0 + 0.08, top + 0.88, top + 0.95, z0 + i * run, z0 + (i + 1) * run, "beam");
  }
  // Railings around the stairwell upstairs: invisible barrier, visible posts and handrail.
  box(x0 - 0.06, x0, UPPER, UPPER + 1, z0, z1, null);
  box(x0 - 0.06, x1, UPPER, UPPER + 1, z0 - 0.06, z0, null);
  for (let z = z0; z <= z1 + 0.01; z += 0.2) decor(x0 - 0.05, x0 - 0.02, UPPER, UPPER + 0.95, z - 0.015, z + 0.015, "iron");
  for (let x = x0; x <= x1; x += 0.2) decor(x - 0.015, x + 0.015, UPPER, UPPER + 0.95, z0 - 0.05, z0 - 0.02, "iron");
  decor(x0 - 0.08, x0, UPPER + 0.95, UPPER + 1.02, z0 - 0.08, z1, "beam");
  decor(x0, x1, UPPER + 0.95, UPPER + 1.02, z0 - 0.08, z0, "beam");
}

// ---------- furniture built from blocks ----------

function counter(x0, x1, z0, z1) {
  box(x0, x1, 0.02, 0.86, z0, z1, "cabinet");
  box(x0 - 0.02, x1 + 0.02, 0.86, 0.91, z0, z1 + 0.02, "marble");
}
counter(11.2, 12.9, 6.07, 6.67);
counter(13.5, 15.89, 6.07, 6.67);
counter(15.29, 15.89, 6.69, 9.8);
decor(14.2, 14.9, 0.911, 0.92, 6.14, 6.55, "steel"); // sink
decor(14.52, 14.58, 0.91, 1.25, 6.1, 6.16, "steel");
decor(14.52, 14.58, 1.2, 1.25, 6.1, 6.36, "steel");
for (let x = 11.5; x < 15.9; x += 0.6) if (x < 12.8 || x > 13.6) decor(x, x + 0.2, 0.68, 0.7, 6.67, 6.69, "iron");
box(11.2, 12.9, 1.55, 2.25, 6.07, 6.4, "cabinet"); // wall cupboards
box(13.5, 15.89, 1.55, 2.25, 6.07, 6.4, "cabinet");

// The head of the bed is on the given side.
function bed(x0, x1, y, z0, z1, head, cover) {
  box(x0, x1, y, y + 0.32, z0, z1, "beam");
  solidArea(x0, x1, y, 0.65, z0, z1); // too high to step onto
  decor(x0 + 0.04, x1 - 0.04, y + 0.32, y + 0.52, z0 + 0.04, z1 - 0.04, "linen");
  const north = head === "north";
  if (north) {
    decor(x0, x1, y + 0.32, y + 1.05, z0, z0 + 0.08, "beam");
    decor(x0 + 0.02, x1 - 0.02, y + 0.5, y + 0.57, z0 + 0.62, z1 - 0.02, cover);
    decor(x0 + 0.15, x1 - 0.15, y + 0.52, y + 0.65, z0 + 0.14, z0 + 0.52, "linen");
  } else {
    decor(x1 - 0.08, x1, y + 0.32, y + 1.05, z0, z1, "beam");
    decor(x0 + 0.02, x1 - 0.62, y + 0.5, y + 0.57, z0 + 0.02, z1 - 0.02, cover);
    for (const z of [z0 + 0.15, (z0 + z1) / 2 + 0.07]) decor(x1 - 0.52, x1 - 0.14, y + 0.52, y + 0.65, z, z + (z1 - z0) / 2 - 0.22, "linen");
  }
}
bed(13.75, 15.85, UPPER, 8.1, 9.8, "east", "blue");
bed(0.2, 1.35, UPPER, 0.12, 2.25, "north", "terracotta");

for (const y of [0, UPPER]) {
  // bath
  solidArea(14.1, 15.88, y, 0.6, 0.12, 0.98);
  decor(15.8, 15.86, y, y + 0.85, 0.12, 0.18, "steel");
  decor(15.55, 15.86, y + 0.8, y + 0.85, 0.12, 0.18, "steel");
  // toilet
  solidArea(11.85, 12.25, y, 0.6, 0.32, 0.78);
  solidArea(11.8, 12.3, y, 0.85, 0.11, 0.32);
  decor(11.8, 12.3, y + 0.42, y + 0.85, 0.11, 0.31, "ceramic"); // tank
  // vanity
  box(15.34, 15.89, y, y + 0.8, 3.9, 5.2, "cabinet");
  box(15.32, 15.89, y + 0.8, y + 0.86, 3.88, 5.22, "marble");
}

// Where the scene draws the soft and painted things.
export const RUGS = [
  // centre x, floor, centre z, width, depth, main colour, accent
  [2.7, 0.022, 8.2, 3.4, 2.2, "#8c3b2a", "#e3c598"],
  [2.6, 0.022, 3.1, 2.4, 2.3, "#2f4b63", "#d8c29a"],
  [2.6, UPPER + 0.004, 9.2, 2.8, 2.4, "#d9c7a6", "#7a4a32"],
  [12, UPPER + 0.004, 9.4, 2.2, 2.2, "#a8553a", "#f0dcb4"],
  [2.7, UPPER + 0.004, 3, 2, 2.2, "#586a45", "#e6d3a8"],
];
export const PAINTINGS = [
  // x, y, z, turn, width, height: inside the downloaded frames, or on their own
  [5, 1.65, 6.115, 0, 0.82, 0.5],
  [5.2, UPPER + 1.6, 6.09, 0, 0.44, 0.66],
  [12.2, UPPER + 1.6, 6.115, 0, 0.82, 0.5],
  [4.9, UPPER + 1.6, 2, -90, 0.44, 0.66],
  [0.125, UPPER + 1.6, 6.9, 90, 0.9, 0.65],
  [8.915, UPPER + 1.6, 8, -90, 1.1, 0.75],
  [0.125, 1.65, 11, 90, 0.8, 0.55],
  [15.875, 1.7, 11, -90, 0.7, 0.9],
  [7.9, UPPER + 1.55, 5.915, 180, 0.8, 0.6],
];
export const CURTAINS = [
  // centre x, floor, centre z, turn, window width: hung just inside the window
  [3.75, UPPER, 11.82, 0, 3.5],
  [12.25, UPPER, 11.82, 0, 2.5],
  [0.18, UPPER, 9, 90, 2],
  [0.18, 0, 9.4, 90, 2],
  [2.5, 0, 0.18, 0, 2],
  [2.5, UPPER, 0.18, 0, 2],
  [0.18, UPPER, 3, 90, 2],
  [0.18, 0, 3, 90, 2],
];

// fireplace on the living room's west wall
box(0.1, 0.65, 0, 1.15, 6.35, 7.75, "stone");
decor(0.1, 0.72, 1.15, 1.23, 6.3, 7.8, "beam");
box(0.1, 0.55, 1.23, 2.8, 6.6, 7.5, "stone");
decor(0.651, 0.66, 0.15, 0.75, 6.68, 7.42, "soot");
decor(0.661, 0.665, 0.18, 0.42, 6.82, 7.28, "fire");
// flat screen above the TV cabinet
decor(1.65, 3.55, 0.95, 2.0, 6.07, 6.11, "screen");

// ---------- downloaded models ----------
// id, x, floor, z, turn (degrees; 0 faces south), scale, footprint [width, depth, height] before turning (null: no collision)
export const MODELS = [
  ["modern_wooden_cabinet", 2.6, 0, 6.38, 0, 1, [2.44, 0.52, 0.68]],
  ["sofa_03", 2.7, 0, 9.75, 180, 1, [2.73, 0.9, 1.1]],
  ["CoffeeTable_01", 2.7, 0.02, 8.2, 0, 0.85, [1.3, 0.82, 0.5]],
  ["ArmChair_01", 0.85, 0, 8.5, 90, 1, [0.84, 0.77, 1]],
  ["Rockingchair_01", 5, -0.08, 7.5, -45, 1, [0.75, 0.75, 1]],
  ["wooden_bookshelf_worn", 8.63, 0, 7, -90, 1, [1.37, 0.58, 2]],
  ["potted_plant_04", 8.5, 0.02, 11.45, 0, 3.4, [0.5, 0.5, 0.9]],
  ["hanging_picture_frame_02", 5, 1.65, 6.07, 0, 1.3, null],
  ["lantern_chandelier_01", 3, 2.79, 9, 0, 0.8, null],

  ["painted_wooden_table", 12.6, 0.02, 9.3, 0, 0.82, [1.98, 0.94, 0.8]],
  ...[12, 12.6, 13.2].flatMap((x) => [
    ["painted_wooden_chair_01", x, 0.02, 8.62, 0, 1, [0.43, 0.45, 0.95]],
    ["painted_wooden_chair_01", x, 0.02, 9.98, 180, 1, [0.43, 0.45, 0.95]],
  ]),
  ["electric_stove", 13.2, 0.02, 6.39, 0, 1.05, [0.55, 0.65, 0.9]],
  ["painted_wooden_cabinet", 9.42, 0.02, 11.25, 90, 1, [1.19, 0.62, 1.18]],
  ["wine_barrel_01", 15.4, 0.02, 11.4, 0, 1, [0.74, 0.74, 0.87]],
  ["brass_pot_01", 12.2, 0.91, 6.35, 0, 1, null],
  ["ceramic_vase_01", 12.6, 0.81, 9.3, 0, 1, null],
  ["ceramic_vase_01", 15.55, 0.91, 7, 0, 1, null],
  ["potted_plant_04", 15.55, 0.91, 9.4, 0, 1.4, null],
  ["lantern_chandelier_01", 12.6, 2.79, 9.3, 0, 0.7, null],

  ["painted_wooden_table", 2.5, 0.02, 0.65, 0, 0.75, [1.8, 0.86, 0.75]],
  ["painted_wooden_chair_02", 2.5, 0.02, 1.55, 180, 0.9, [0.58, 0.6, 1.1]],
  ["wooden_bookshelf_worn", 1, 0.02, 5.62, 180, 1, [1.37, 0.58, 2]],
  ["wooden_bookshelf_worn", 2.5, 0.02, 5.62, 180, 1, [1.37, 0.58, 2]],
  ["ArmChair_01", 0.75, 0.02, 3.2, 90, 1, [0.84, 0.77, 1]],
  ["WoodenTable_02", 0.45, 0.02, 4.15, 0, 1.2, [0.36, 0.36, 0.5]],
  ["wooden_lantern_01", 0.45, 0.52, 4.15, 0, 0.8, null],
  ["potted_plant_04", 3.2, 0.74, 0.5, 0, 1.2, null],

  ["painted_wooden_nightstand", 5.35, 0.02, 1, 90, 1, [0.5, 0.5, 0.62]],
  ["ceramic_vase_01", 5.35, 0.64, 1, 0, 1, null],
  ["ornate_mirror_01", 5.07, 1.55, 1, 90, 1.2, null],
  ["potted_plant_04", 8.5, 0.02, 0.45, 0, 3, [0.45, 0.45, 0.8]],
  ["lantern_chandelier_01", 7.2, 2.79, 3, 0, 0.7, null],
  ["ornate_mirror_01", 15.89, 1.5, 4.55, -90, 1.3, null],
  ["ornate_mirror_01", 15.89, UPPER + 1.5, 4.55, -90, 1.3, null],

  ["GothicBed_01", 2.7, UPPER, 7.12, 0, 1.05, [1.56, 2.14, 0.8]],
  ["ClassicNightstand_01", 1.45, UPPER, 6.32, 0, 1, [0.57, 0.42, 0.7]],
  ["ClassicNightstand_01", 3.95, UPPER, 6.32, 0, 1, [0.57, 0.42, 0.7]],
  ["wooden_lantern_01", 1.45, UPPER + 0.7, 6.32, 0, 0.8, null],
  ["GothicCabinet_01", 8.42, UPPER, 10.6, -90, 1, [1.72, 0.95, 2.3]],
  ["Rockingchair_01", 0.85, UPPER - 0.1, 11, 130, 1, [0.75, 0.75, 1]],
  ["sofa_02", 7.2, UPPER, 11.35, 180, 1, [1.81, 0.82, 0.7]],
  ["hanging_picture_frame_01", 5.2, UPPER + 1.6, 6.07, 0, 1, null],
  ["lantern_chandelier_01", 4.5, ROOF - 0.14, 9, 0, 0.8, null],

  ["painted_wooden_nightstand", 15.55, UPPER, 7.6, -90, 1, [0.5, 0.5, 0.62]],
  ["painted_wooden_cabinet", 9.42, UPPER, 11.2, 90, 1, [1.19, 0.62, 1.18]],
  ["painted_wooden_table", 12.2, UPPER, 11.45, 180, 0.62, [1.5, 0.72, 0.6]],
  ["painted_wooden_chair_01", 12.2, UPPER, 10.8, 0, 0.9, [0.4, 0.4, 0.9]],
  ["hanging_picture_frame_02", 12.2, UPPER + 1.6, 6.07, 0, 1, null],

  ["painted_wooden_table", 2.5, UPPER, 0.55, 0, 0.6, [1.45, 0.7, 0.58]],
  ["painted_wooden_chair_01", 2.5, UPPER, 1.25, 180, 0.9, [0.4, 0.4, 0.9]],
  ["wooden_bookshelf_worn", 0.42, UPPER, 4.6, 90, 1, [1.37, 0.58, 2]],
  ["ClassicNightstand_01", 1.75, UPPER, 0.35, 0, 0.9, [0.5, 0.4, 0.62]],
  ["hanging_picture_frame_01", 4.93, UPPER + 1.6, 2, -90, 1, null],
  ["wooden_bookshelf_worn", 5.4, UPPER, 2.4, 90, 1, [1.37, 0.58, 2]],
  ["potted_plant_04", 8.9, UPPER, 0.45, 0, 3, [0.45, 0.45, 0.8]],

  ["outdoor_table_chair_set_01", 1.4, 0.02, 15.6, 0, 1.15, [1, 2.1, 0.9]],
  ["outdoor_table_chair_set_01", 14, 0.02, 14, 90, 1.15, [1, 2.1, 0.9]],
  ...[0.8, 7.6, 9.4, 15.4].map((x) => ["planter_box_01", x, 0.02, 12.45, 0, 1, [0.91, 0.41, 0.45]]),
  ...[0.8, 7.6, 9.4, 15.4].map((x) => ["shrub_03", x - 0.4, 0.36, 12.45, 0, 0.65, null]),
  ["wine_barrel_01", 5.7, 0, -0.65, 0, 1, [0.74, 0.74, 0.87]],
  ["planter_box_01", 8.9, 0, -0.55, 0, 1, [0.91, 0.41, 0.45]],
  ["wooden_lantern_01", 8.15, 0.02, -0.35, 0, 1.3, null],
].map(([id, x, y, z, turn, scale, footprint]) => ({ id, x, y, z, turn, scale, footprint }));

for (const { x, y, z, turn, footprint } of MODELS) {
  if (!footprint) continue;
  const [w, d, height] = footprint;
  const a = (turn * Math.PI) / 180;
  const halfX = (Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * d) / 2;
  const halfZ = (Math.abs(Math.sin(a)) * w + Math.abs(Math.cos(a)) * d) / 2;
  const floor = Math.round(y / UPPER) * UPPER;
  solidArea(x - halfX, x + halfX, floor, Math.max(height, 0.5), z - halfZ, z + halfZ);
}

// ---------- yard ----------
const P = POOL;
for (const [x0, x1, z0, z1] of [[-60, P.x0, -60, 60], [P.x1, 76, -60, 60], [P.x0, P.x1, -60, P.z0], [P.x0, P.x1, P.z1, 60]]) {
  box(x0, x1, -0.3, 0, z0, z1, "grass");
}
// deck around the pool
for (const [x0, x1, z0, z1] of [[0, P.x0, 12.1, 21.5], [P.x1, 16, 12.1, 21.5], [P.x0, P.x1, 12.1, P.z0], [P.x0, P.x1, P.z1, 21.5]]) {
  box(x0, x1, -0.1, 0.015, z0, z1, "deck");
}
for (const [x0, x1, z0, z1] of [[P.x0 - 0.3, P.x1 + 0.3, P.z0 - 0.3, P.z0], [P.x0 - 0.3, P.x1 + 0.3, P.z1, P.z1 + 0.3], [P.x0 - 0.3, P.x0, P.z0, P.z1], [P.x1, P.x1 + 0.3, P.z0, P.z1]]) {
  box(x0, x1, 0, 0.07, z0, z1, "marble", { solid: false });
}
// basin
decor(P.x0, P.x1, -1.7, -1.5, P.z0, P.z1, "pooltile");
decor(P.x0 - 0.05, P.x0 + 0.01, -1.5, 0, P.z0, P.z1, "pooltile");
decor(P.x1 - 0.01, P.x1 + 0.05, -1.5, 0, P.z0, P.z1, "pooltile");
decor(P.x0, P.x1, -1.5, 0, P.z0 - 0.05, P.z0 + 0.01, "pooltile");
decor(P.x0, P.x1, -1.5, 0, P.z1 - 0.01, P.z1 + 0.05, "pooltile");
box(P.x0, P.x1, -1.5, 1, P.z0, P.z1, null); // nobody walks into the water
// sun loungers
for (const x of [12.3, 13.7]) {
  box(x, x + 0.75, 0.25, 0.34, 16.4, 18.2, "deck", { solid: false });
  decor(x + 0.04, x + 0.71, 0.34, 0.42, 16.45, 17.7, "linen");
  decor(x + 0.04, x + 0.71, 0.34, 0.6, 17.7, 18.15, "linen");
  for (const [lx, lz] of [[0.02, 16.45], [0.67, 16.45], [0.02, 18.09], [0.67, 18.09]]) decor(x + lx, x + lx + 0.06, 0, 0.25, lz, lz + 0.06, "beam");
  solidArea(x, x + 0.75, 0, 0.6, 16.4, 18.2);
}
// path and porch at the entrance
decor(6.3, 7.9, 0, 0.015, YARD.z0, -0.1, "pathstone");
decor(5.9, 8.3, 2.55, 2.68, -1.3, -0.1, "beam");
for (const x of [5.95, 8.15]) box(x, x + 0.1, 0, 2.55, -1.25, -1.15, "beam");
decor(6.42, 6.48, 0.02, 2.18, 0.1, 1.35, "door"); // the front door, standing open
// fence
const Y = YARD;
for (const [x0, x1, z0, z1] of [[Y.x0, Y.x1, Y.z0, Y.z0 + 0.1], [Y.x0, Y.x1, Y.z1 - 0.1, Y.z1], [Y.x0, Y.x0 + 0.1, Y.z0, Y.z1], [Y.x1 - 0.1, Y.x1, Y.z0, Y.z1]]) {
  box(x0, x1, 0, 1.4, z0, z1, null);
  decor(x0, x1, 0.35, 0.45, z0, z1, "beam");
  decor(x0, x1, 0.95, 1.05, z0, z1, "beam");
}
for (let x = Y.x0; x <= Y.x1; x += 1.4) for (const z of [Y.z0, Y.z1 - 0.12]) decor(x, x + 0.12, 0, 1.2, z, z + 0.12, "beam");
for (let z = Y.z0; z <= Y.z1; z += 1.4) for (const x of [Y.x0, Y.x1 - 0.12]) decor(x, x + 0.12, 0, 1.2, z, z + 0.12, "beam");

export const TREES = [
  [-5.5, -4, "olive"], [-6, 5, "cypress"], [-5, 14, "oak"], [-6.5, 21, "olive"], [-1, 22.5, "cypress"], [3.5, 23, "oak"],
  [12, 23, "cypress"], [17.5, 22, "olive"], [21.5, 18, "oak"], [20, 10, "cypress"], [22, 2, "oak"], [19, -5, "olive"],
  [12.5, -5, "cypress"], [2.5, -5.5, "oak"], [-2, 17.5, "olive"], [19, 14.5, "olive"],
].map(([x, z, kind]) => ({ x, z, kind }));
for (const { x, z } of TREES) box(x - 0.25, x + 0.25, 0, 2.5, z - 0.25, z + 0.25, null);

// ---------- walking ----------
const solids = boxes.filter((b) => b.solid);

function pushOut(point, b) {
  const cx = Math.min(Math.max(point.x, b.x0), b.x1);
  const cz = Math.min(Math.max(point.z, b.z0), b.z1);
  const distance = Math.hypot(point.x - cx, point.z - cz);
  if (distance >= RADIUS) return point;
  if (distance > 0) return { x: cx + ((point.x - cx) / distance) * RADIUS, z: cz + ((point.z - cz) / distance) * RADIUS };
  // The centre is inside the box: leave through the nearest face.
  const exits = [[point.x - b.x0, { x: b.x0 - RADIUS, z: point.z }], [b.x1 - point.x, { x: b.x1 + RADIUS, z: point.z }],
    [point.z - b.z0, { x: point.x, z: b.z0 - RADIUS }], [b.z1 - point.z, { x: point.x, z: b.z1 + RADIUS }]];
  return exits.reduce((best, exit) => (exit[0] < best[0] ? exit : best))[1];
}

const standsIn = (point, y) => (b) => b.y1 > y + STEP_UP && b.y0 < y + BODY && Math.hypot(point.x - Math.min(Math.max(point.x, b.x0), b.x1), point.z - Math.min(Math.max(point.z, b.z0), b.z1)) < RADIUS - 0.005;

// Height of the surface under the feet, or null where there is nothing to stand on.
export function groundAt(x, z, y) {
  let ground = null;
  for (const b of solids) {
    if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && b.y1 <= y + STEP_UP && (ground === null || b.y1 > ground)) ground = b.y1;
  }
  return ground;
}

// Moves a walker {x, y (feet), z} by (dx, dz): walls stop it, low steps lift it.
export function walk(position, dx, dz) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.08));
  let at = { x: position.x, y: position.y, z: position.z };
  for (let i = 0; i < steps; i++) {
    const near = solids.filter((b) => b.y1 > at.y + STEP_UP && b.y0 < at.y + BODY);
    const next = near.reduce(pushOut, { x: at.x + dx / steps, z: at.z + dz / steps });
    if (near.some(standsIn(next, at.y))) break; // squeezed between two things
    const y = groundAt(next.x, next.z, at.y);
    if (y === null || at.y - y > STEP_UP) break; // never step off a ledge
    at = { x: next.x, y, z: next.z };
  }
  return at;
}

export const roomAt = ({ x, y, z }) =>
  ROOMS.find((r) => Math.abs(r.y - y) < 1.4 && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1)?.name ?? "Yard";

export const START = { x: 7.1, y: 0, z: -4.5, yaw: 180 };
