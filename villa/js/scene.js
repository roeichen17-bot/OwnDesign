// Turns the villa data into a three.js scene.
import * as THREE from "three";
import { GLTFLoader } from "../../vendor/three-0.180.0/addons/loaders/GLTFLoader.js";
import { HDRLoader } from "../../vendor/three-0.180.0/addons/loaders/HDRLoader.js";
import { mergeGeometries } from "../../vendor/three-0.180.0/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "../../vendor/three-0.180.0/addons/geometries/RoundedBoxGeometry.js";
import { boxes, CURTAINS, MODELS, PAINTINGS, POOL, ROOF, RUGS, TREES, UPPER } from "./world.js";

// material name: texture (or null), metres per texture repeat, tint, extra settings
const SURFACES = {
  plaster: [null, 2.6, 0xf2dfbd, { roughness: 0.95, emissive: 0x241c10, bumps: "painted_plaster_wall" }],
  ceiling: [null, 2.6, 0xfbf1dc, { roughness: 1, emissive: 0x4a4030, bumps: "painted_plaster_wall" }],
  stone: ["rustic_stone_wall_02", 2, 0xffffff, { roughness: 0.95 }],
  pathstone: ["rustic_stone_wall_02", 1.4, 0xcfc6b8, { roughness: 1 }],
  wood: ["wood_floor", 2.2, 0xe8c9a0, { roughness: 0.55 }],
  tiles: ["floor_tiles_06", 2, 0xf0cba6, { roughness: 0.4 }],
  beam: ["weathered_brown_planks", 1.6, 0xb08a66, { roughness: 0.7 }],
  door: ["dark_wood", 1, 0x8a5a38, { roughness: 0.5 }],
  cabinet: [null, 1, 0x8d9a7c, { roughness: 0.55 }],
  deck: ["weathered_brown_planks", 2, 0xffe2c0, { roughness: 0.8 }],
  grass: ["leafy_grass", 3, 0xc4dc8c, { roughness: 1 }],
  roof: ["clay_roof_tiles_02", 2.2, 0xffd9c0, { roughness: 0.8, side: THREE.DoubleSide }],
  pooltile: ["long_white_tiles", 1.2, 0x7fd0e6, { roughness: 0.3, emissive: 0x0a3540 }],
  linen: ["rough_linen", 0.8, 0xfff3df, { roughness: 1 }],
  terracotta: ["rough_linen", 0.8, 0xc4704a, { roughness: 1 }],
  blue: ["rough_linen", 0.8, 0x5f7f9a, { roughness: 1 }],
  marble: [null, 1, 0xd8cfc0, { roughness: 0.25 }],
  ceramic: [null, 1, 0xf7f5f0, { roughness: 0.15 }],
  iron: [null, 1, 0x2b2724, { roughness: 0.5, metalness: 0.7 }],
  steel: [null, 1, 0xbfc3c6, { roughness: 0.3, metalness: 0.9 }],
  screen: [null, 1, 0x07080a, { roughness: 0.1, metalness: 0.4 }],
  soot: [null, 1, 0x120d0a, { roughness: 1 }],
  fire: [null, 1, 0xff7a1a, { emissive: 0xff6a00, emissiveIntensity: 2.5 }],
  water: [null, 1, 0x7fc4d8, { roughness: 0.05, transparent: true, opacity: 0.6 }],
  glass: [null, 1, 0xcfe8f2, { roughness: 0.03, metalness: 0.3, transparent: true, opacity: 0.16, depthWrite: false }],
};

// Texture coordinates in world metres, so a texture keeps its size on every box.
function worldUVs(geometry, tile) {
  const { position, normal, uv } = geometry.attributes;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    if (Math.abs(normal.getX(i)) > 0.5) uv.setXY(i, z / tile, y / tile);
    else if (Math.abs(normal.getY(i)) > 0.5) uv.setXY(i, x / tile, z / tile);
    else uv.setXY(i, x / tile, y / tile);
  }
}

let seed = 7;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const between = (a, b) => a + random() * (b - a);

function canvasTexture(size, paint) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  paint(canvas.getContext("2d"), size);
  return new THREE.CanvasTexture(canvas);
}

const leafTexture = () =>
  canvasTexture(256, (g, s) => {
    for (let i = 0; i < 170; i++) {
      const r = Math.sqrt(random()) * s * 0.44;
      const a = random() * Math.PI * 2;
      g.save();
      g.translate(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r);
      g.rotate(random() * Math.PI * 2);
      const light = between(55, 100);
      g.fillStyle = `rgb(${light * 1.7}, ${light * 2.3}, ${light * 1.2})`;
      g.beginPath();
      g.ellipse(0, 0, s * 0.055, s * 0.024, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  });

// Ripples as a normal map that repeats without seams.
const rippleTexture = () =>
  canvasTexture(128, (g, s) => {
    const image = g.createImageData(s, s);
    const k = (Math.PI * 2) / s;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const nx = Math.cos(k * (3 * x + y)) * 0.25 + Math.cos(k * (x * 5 - 2 * y)) * 0.15;
        const ny = Math.sin(k * (x + 4 * y)) * 0.25 + Math.sin(k * (6 * y + 3 * x)) * 0.12;
        image.data.set([128 + nx * 127, 128 + ny * 127, 235, 255], (y * s + x) * 4);
      }
    }
    g.putImageData(image, 0, 0);
  });

const KINDS = {
  olive: { trunk: [1.7, 0.2], crown: [2.7, 1.5, 1.1], leaves: 230, size: 0.75, color: 0xb4c4a0 },
  oak: { trunk: [2.4, 0.28], crown: [4, 2.1, 1.7], leaves: 340, size: 0.95, color: 0x86b25a },
  cypress: { trunk: [0.8, 0.14], crown: [3.1, 0.7, 2.6], leaves: 260, size: 0.6, color: 0x5c8a4a },
  bush: { trunk: [0, 0], crown: [0.35, 0.5, 0.35], leaves: 40, size: 0.4, color: 0x93b860 },
  flowers: { trunk: [0, 0], crown: [0.2, 0.45, 0.2], leaves: 26, size: 0.22, color: 0xff8f6b },
  far: { trunk: [0, 0], crown: [2.4, 3.4, 2.8], leaves: 60, size: 2.6, color: 0x6f9455 },
};

function addPlants(scene, bark) {
  const BEDS = [
    ...[-0.6, 0.4, 1.4, 2.4, 3.4, 4.4, 5.3, 8.9, 9.9, 10.9, 11.9, 12.9, 13.9, 14.9, 15.9].map((x) => ({ x, z: -0.75, kind: x % 2 > 1 ? "flowers" : "bush" })),
    ...[1, 3, 5, 7, 9, 11].flatMap((z) => [{ x: -0.75, z, kind: "bush" }, { x: 16.75, z: z + 0.5, kind: "flowers" }]),
    ...[0, 2.5, 5, 7.5, 10, 12.5, 15].map((x) => ({ x, z: 24, kind: "bush" })),
  ];
  // A ring of far trees beyond the fence closes the view.
  const horizon = Array.from({ length: 70 }, (_, i) => {
    const a = (i / 70) * Math.PI * 2;
    const r = between(36, 54);
    return { x: 8 + Math.cos(a) * r, z: 8 + Math.sin(a) * r, kind: "far" };
  });
  const plants = [...TREES, ...BEDS, ...horizon];
  const dummy = new THREE.Object3D();
  const leaves = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshLambertMaterial({ map: leafTexture(), alphaTest: 0.45, side: THREE.DoubleSide, emissive: 0x1c2a10 }),
    plants.reduce((sum, p) => sum + KINDS[p.kind].leaves, 0),
  );
  leaves.material.map.colorSpace = THREE.SRGBColorSpace;
  let n = 0;
  const color = new THREE.Color();
  for (const plant of plants) {
    const kind = KINDS[plant.kind];
    const [height, radius] = kind.trunk;
    if (height) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius, height + 0.6, 7), bark);
      trunk.position.set(plant.x, (height + 0.6) / 2, plant.z);
      trunk.castShadow = true;
      scene.add(trunk);
    }
    const [y, wide, tall] = kind.crown;
    for (let i = 0; i < kind.leaves; i++, n++) {
      const a = random() * Math.PI * 2;
      const up = between(-1, 1);
      // A cypress narrows towards its tip; the others are round.
      const reach = Math.cbrt(random()) * (plant.kind === "cypress" ? (1 - up) / 2 + 0.15 : Math.sqrt(1 - up * up));
      dummy.position.set(plant.x + Math.cos(a) * reach * wide, y + up * tall, plant.z + Math.sin(a) * reach * wide);
      dummy.rotation.set(between(-1, 1), random() * Math.PI * 2, between(-1, 1));
      dummy.scale.setScalar(kind.size * between(0.7, 1.3));
      dummy.updateMatrix();
      leaves.setMatrixAt(n, dummy.matrix);
      leaves.setColorAt(n, color.set(kind.color).multiplyScalar(between(0.75, 1.15)));
    }
  }
  leaves.castShadow = true;
  scene.add(leaves);
}

function addRoof(scene, material, gableMaterial) {
  const quad = (points, tile) => {
    const geometry = new THREE.BufferGeometry();
    const [a, b, c, d] = points;
    const corners = d ? [a, b, c, a, c, d] : [a, b, c];
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(corners.flat(), 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(corners.flatMap(([x, y, z]) => [(d ? x : z) / tile, (d ? Math.hypot(y, z) : y) / tile]), 2));
    geometry.computeVertexNormals();
    return geometry;
  };
  const eave = ROOF - 0.05;
  const ridge = ROOF + 2.4;
  for (const [edge, mid] of [[-0.8, 6], [12.8, 6]]) {
    const slope = new THREE.Mesh(quad([[-0.6, eave, edge], [16.6, eave, edge], [16.6, ridge, mid], [-0.6, ridge, mid]], 2.2), material);
    slope.castShadow = slope.receiveShadow = true;
    scene.add(slope);
  }
  for (const x of [-0.1, 16.1]) {
    const gable = new THREE.Mesh(quad([[x, ROOF, -0.1], [x, ROOF, 12.1], [x, ridge - 0.2, 6]], 2.6), gableMaterial);
    gable.castShadow = true;
    scene.add(gable);
  }
}

// Soft dark patch under furniture, which seats it on the floor.
function addContactShadows(scene) {
  const map = canvasTexture(64, (g, s) => {
    const gradient = g.createRadialGradient(s / 2, s / 2, s * 0.15, s / 2, s / 2, s / 2);
    gradient.addColorStop(0, "rgba(0,0,0,0.55)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, s, s);
  });
  const material = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
  for (const { x, y, z, turn, footprint } of MODELS) {
    if (!footprint) continue;
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(footprint[0] * 1.35, footprint[1] * 1.5), material);
    patch.rotation.set(-Math.PI / 2, 0, (turn * Math.PI) / 180);
    patch.position.set(x, Math.round(y / UPPER) * UPPER + 0.034, z);
    scene.add(patch);
  }
}

// A small landscape, different for every frame.
const painting = () =>
  canvasTexture(256, (g, s) => {
    const sky = g.createLinearGradient(0, 0, 0, s);
    sky.addColorStop(0, `hsl(${between(195, 215)} 45% ${between(55, 75)}%)`);
    sky.addColorStop(0.65, `hsl(${between(15, 45)} 70% 80%)`);
    g.fillStyle = sky;
    g.fillRect(0, 0, s, s);
    for (let layer = 0; layer < 4; layer++) {
      g.fillStyle = `hsl(${between(60, 130) - layer * 10} ${between(25, 45)}% ${52 - layer * 11}%)`;
      g.beginPath();
      g.moveTo(0, s);
      for (let x = 0; x <= s; x += 32) g.lineTo(x, s * (0.52 + layer * 0.12) + between(-18, 18));
      g.lineTo(s, s);
      g.fill();
    }
  });

const rug = (main, accent) =>
  canvasTexture(256, (g, s) => {
    g.fillStyle = main;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = accent;
    for (const [inset, width] of [[10, 8], [26, 3], [54, 2]]) {
      g.lineWidth = width;
      g.strokeRect(inset, inset, s - 2 * inset, s - 2 * inset);
    }
    g.fillStyle = accent;
    for (let x = 76; x < s - 60; x += 34) {
      for (let y = 76; y < s - 60; y += 34) {
        g.beginPath();
        g.moveTo(x, y - 9);
        g.lineTo(x + 9, y);
        g.lineTo(x, y + 9);
        g.lineTo(x - 9, y);
        g.fill();
      }
    }
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = random() > 0.5 ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.12)";
      g.fillRect(random() * s, random() * s, 2, 2);
    }
  });

function addDecorations(scene) {
  const flat = (map, width, height) => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map, roughness: 0.9 }));
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };
  for (const [x, y, z, width, depth, main, accent] of RUGS) {
    const mesh = flat(rug(main, accent), width, depth);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y + 0.004, z);
  }
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.5 });
  for (const [x, y, z, turn, width, height] of PAINTINGS) {
    const canvas = flat(painting(), width, height);
    canvas.position.set(x, y, z);
    canvas.rotation.y = (turn * Math.PI) / 180;
    const back = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, height + 0.1, 0.02), wood);
    back.position.set(0, 0, -0.012);
    canvas.add(back);
  }
  // Curtains: a pleated cloth on each side of the window, and the rod they hang from.
  const cloth = new THREE.MeshStandardMaterial({ color: 0xe3c795, roughness: 1, side: THREE.DoubleSide, emissive: 0x2a2012 });
  const pleats = new THREE.PlaneGeometry(0.55, 2.45, 30, 1);
  const points = pleats.attributes.position;
  for (let i = 0; i < points.count; i++) points.setZ(i, Math.sin(points.getX(i) * 52) * 0.045);
  pleats.computeVertexNormals();
  for (const [x, y, z, turn, width] of CURTAINS) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = (turn * Math.PI) / 180;
    for (const side of [-1, 1]) {
      const curtain = new THREE.Mesh(pleats, cloth);
      curtain.position.set(side * (width / 2 + 0.1), 1.27, 0);
      curtain.receiveShadow = true;
      group.add(curtain);
    }
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, width + 0.9, 8), wood);
    rod.rotation.z = Math.PI / 2;
    rod.position.y = 2.52;
    group.add(rod);
    scene.add(group);
  }
}

// Turned shapes for the bath, the toilet and the basin.
function addBathroom(scene, ceramic, water) {
  const turned = (profile) => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32);
  const china = ceramic.clone();
  china.side = THREE.DoubleSide;
  const bath = turned([[0, 0.05], [0.3, 0.05], [0.42, 0.18], [0.5, 0.55], [0.47, 0.57], [0.43, 0.54], [0.36, 0.2], [0, 0.16]]);
  const bowl = turned([[0, 0], [0.15, 0], [0.11, 0.1], [0.2, 0.34], [0.22, 0.42], [0.17, 0.43], [0.13, 0.3], [0, 0.27]]);
  const basin = turned([[0, 0], [0.12, 0.01], [0.21, 0.13], [0.19, 0.14], [0.1, 0.04], [0, 0.03]]);
  const surface = new THREE.CircleGeometry(0.42, 32).rotateX(-Math.PI / 2);
  for (const floor of [0, UPPER]) {
    for (const [shape, x, y, z, wide, deep, material] of [
      [bath, 14.98, floor, 0.55, 1.76, 0.84, china],
      [surface, 14.98, floor + 0.45, 0.55, 1.76, 0.84, water],
      [bowl, 12.05, floor, 0.55, 0.95, 1.2, china],
      [basin, 15.6, floor + 0.86, 4.55, 0.95, 1.3, china],
    ]) {
      const mesh = new THREE.Mesh(shape, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(wide, 1, deep);
      mesh.castShadow = material !== water;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
  }
}

export async function buildScene(renderer, onProgress) {
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_, done, total) => onProgress(done / total);
  const failed = [];
  manager.onError = (url) => failed.push(url);
  const textures = new THREE.TextureLoader(manager);
  const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const load = async (url, color) => {
    const texture = await textures.loadAsync(url);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = anisotropy;
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  const materials = Object.fromEntries(
    await Promise.all(
      Object.entries(SURFACES).map(async ([name, [file, , color, { bumps, ...extra }]]) => {
        const maps = file
          ? { map: await load(`assets/textures/${file}_diff.jpg`, true), normalMap: await load(`assets/textures/${file}_nor.jpg`) }
          : {};
        // Smooth paint: the colour stays clean and only the surface relief comes from the texture.
        if (bumps) Object.assign(maps, { normalMap: await load(`assets/textures/${bumps}_nor.jpg`), normalScale: new THREE.Vector2(0.4, 0.4) });
        return [name, new THREE.MeshStandardMaterial({ color, ...maps, ...extra })];
      }),
    ),
  );

  const scene = new THREE.Scene();
  const sky = await new HDRLoader(manager).loadAsync("assets/sky.hdr");
  sky.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = scene.environment = sky;
  scene.environmentIntensity = 0.85;
  scene.backgroundIntensity = 0.9;
  scene.fog = new THREE.Fog(0xc9d8e4, 45, 130);
  scene.add(new THREE.HemisphereLight(0xfff2dc, 0xc09a74, 1.35));
  const sun = new THREE.DirectionalLight(0xffe3b8, 2.6);
  sun.position.set(8 + 14, 26, 6 + 20);
  sun.target.position.set(8, 0, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 5, far: 70 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  // All boxes of one material become one mesh, which keeps a weak graphics card fast.
  const groups = Map.groupBy(boxes.filter((b) => b.material), (b) => b.material);
  groups.set("stone", [...groups.get("stone"), { x0: 0.08, x1: 0.62, y0: ROOF, y1: ROOF + 3, z0: 6.7, z1: 7.45 }]); // chimney
  for (const [name, list] of groups) {
    const soft = ["linen", "blue", "terracotta"].includes(name);
    const geometry = mergeGeometries(list.map((b) => {
      const size = [b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0];
      const part = soft ? new RoundedBoxGeometry(...size, 3, Math.min(...size) * 0.45) : new THREE.BoxGeometry(...size);
      part.translate((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2);
      worldUVs(part, SURFACES[name][1]);
      return part;
    }));
    const mesh = new THREE.Mesh(geometry, materials[name]);
    mesh.castShadow = !["glass", "water", "grass"].includes(name);
    mesh.receiveShadow = name !== "glass";
    scene.add(mesh);
  }
  addRoof(scene, materials.roof, materials.plaster);
  addPlants(scene, materials.beam);
  addContactShadows(scene);
  addDecorations(scene);
  addBathroom(scene, materials.ceramic, materials.water);

  const ripples = rippleTexture();
  ripples.wrapS = ripples.wrapT = THREE.RepeatWrapping;
  ripples.repeat.set(3, 2);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(POOL.x1 - POOL.x0, POOL.z1 - POOL.z0),
    new THREE.MeshStandardMaterial({ color: 0x2fa9c4, roughness: 0.04, metalness: 0.35, transparent: true, opacity: 0.72, normalMap: ripples, normalScale: new THREE.Vector2(0.35, 0.35) }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set((POOL.x0 + POOL.x1) / 2, -0.1, (POOL.z0 + POOL.z1) / 2);
  scene.add(water);

  const loader = new GLTFLoader(manager);
  const ids = [...new Set(MODELS.map((m) => m.id))];
  const originals = new Map(await Promise.all(ids.map(async (id) => {
    const { scene: model } = await loader.loadAsync(`assets/models/${id}/model.gltf`);
    model.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = node.receiveShadow = true;
      if (node.material.map) node.material.map.anisotropy = anisotropy;
    });
    return [id, model];
  })));
  for (const { id, x, y, z, turn, scale } of MODELS) {
    const model = originals.get(id).clone();
    model.position.set(x, y, z);
    model.rotation.y = (turn * Math.PI) / 180;
    model.scale.setScalar(scale);
    scene.add(model);
  }
  if (failed.length) throw new Error(`Missing files: ${failed.join(", ")}`);

  return { scene, animate: (seconds) => ripples.offset.set(seconds * 0.02, seconds * 0.013) };
}
