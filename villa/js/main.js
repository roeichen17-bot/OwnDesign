// Camera, controls and the on-screen panel.
import * as THREE from "three";
import { buildScene } from "./scene.js";
import { EYE, ROOMS, START, roomAt, walk } from "./world.js";

const $ = (selector) => document.querySelector(selector);
const SPEED = 2.2; // metres per second
const TURN = 1.8; // radians per second
// Physical key codes, so walking also works with a Hebrew keyboard layout.
const KEYS = {
  KeyW: "forward", ArrowUp: "forward", KeyS: "back", ArrowDown: "back",
  KeyA: "left", KeyD: "right", ArrowLeft: "turnLeft", ArrowRight: "turnRight",
};
const QUALITY = [["Sharp", 1], ["Balanced", 0.75], ["Fast", 0.5]];

async function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // nothing in the villa moves, so shadows are drawn once
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "3D view of the villa. W and S or up and down arrows walk, A and D step sideways, left and right arrows turn.");

  const { scene, animate } = await buildScene(renderer, (done) => ($("#progress").value = done));
  renderer.shadowMap.needsUpdate = true;

  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 400);
  camera.rotation.order = "YXZ";
  let position;
  let yaw;
  let pitch;
  let eye;
  function jump(spawn) {
    position = { x: spawn.x, y: spawn.y, z: spawn.z };
    yaw = (spawn.yaw * Math.PI) / 180;
    pitch = -0.05;
    eye = spawn.y + EYE;
  }
  jump(START);

  let quality = 1;
  let dirty = true;
  function setQuality(index) {
    quality = index;
    renderer.setPixelRatio(QUALITY[index][1]);
    $("#quality").textContent = `Quality: ${QUALITY[index][0]}`;
    dirty = true;
  }
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  setQuality(quality);
  resize();
  addEventListener("resize", resize);
  $("#quality").addEventListener("click", () => setQuality((quality + 1) % QUALITY.length));

  $("#rooms").replaceChildren(
    ...[{ name: "Front gate", spawn: START }, ...ROOMS, { name: "Pool", spawn: { x: 2.2, y: 0.02, z: 13.4, yaw: -125 } }].map((room) => {
      const button = document.createElement("button");
      button.textContent = room.name;
      button.addEventListener("click", () => {
        jump(room.spawn);
        $("#menu").open = false;
        canvas.focus();
      });
      return button;
    }),
  );

  const held = new Map(); // key code or pointer id -> action
  addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Shift") held.set("Shift", "run");
    if (!KEYS[event.code]) return;
    held.set(event.code, KEYS[event.code]);
    event.preventDefault();
  });
  addEventListener("keyup", (event) => held.delete(event.key === "Shift" ? "Shift" : event.code));
  addEventListener("blur", () => held.clear());
  let drag = null;
  canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture(event.pointerId);
    canvas.focus();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener("pointermove", (event) => {
    if (drag?.id !== event.pointerId) return;
    yaw += (event.clientX - drag.x) * 0.005;
    pitch = Math.min(Math.max(pitch + (event.clientY - drag.y) * 0.004, -1.2), 1.2);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  for (const type of ["pointerup", "pointercancel"]) canvas.addEventListener(type, () => (drag = null));

  function advance(actions, seconds) {
    const axis = (plus, minus) => Number(actions.has(plus)) - Number(actions.has(minus));
    yaw += axis("turnLeft", "turnRight") * TURN * seconds;
    const forward = axis("forward", "back");
    const side = axis("right", "left");
    const scale = (SPEED * (actions.has("run") ? 1.8 : 1) * seconds) / (Math.hypot(forward, side) || 1);
    const dx = (side * Math.cos(yaw) - forward * Math.sin(yaw)) * scale;
    const dz = (-side * Math.sin(yaw) - forward * Math.cos(yaw)) * scale;
    if (dx || dz) position = walk(position, dx, dz);
  }
  for (const button of document.querySelectorAll("[data-move]")) {
    button.addEventListener("pointerdown", (event) => held.set(event.pointerId, button.dataset.move));
    for (const type of ["pointerup", "pointercancel", "pointerleave"]) button.addEventListener(type, (event) => held.delete(event.pointerId));
    button.addEventListener("click", (event) => event.detail === 0 && advance(new Set([button.dataset.move]), 0.25));
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  document.body.prepend(canvas);
  $("#loading").hidden = true;
  $("#hud").hidden = false;
  canvas.focus();

  let last = performance.now();
  let drawnAt = 0;
  let view = "";
  renderer.setAnimationLoop((now) => {
    const seconds = Math.min(Math.max(now - last, 0) / 1000, 0.1);
    last = now;
    advance(new Set(held.values()), seconds);
    eye += (position.y + EYE - eye) * Math.min(1, seconds * 12); // smooths the steps on the stairs
    const next = `${position.x},${eye},${position.z},${yaw},${pitch}`;
    // While standing still only the water moves, so a few frames a second are enough.
    if (!dirty && next === view && now - drawnAt < 120) return;
    view = next;
    dirty = false;
    drawnAt = now;
    camera.position.set(position.x, eye, position.z);
    camera.rotation.set(pitch, yaw, 0);
    animate(now / 1000);
    renderer.render(scene, camera);
    $("#where").textContent = `${roomAt(position)} · ${position.y > 1.5 ? "Upper floor" : "Ground floor"}`;
    canvas.dataset.position = [position.x, position.y, position.z].map((v) => v.toFixed(2)).join(",");
    canvas.dataset.triangles = renderer.info.render.triangles;
  });
}

start().catch((error) => {
  console.error(error);
  $("#loading p").textContent = "Loading failed. Download the assets (in frontend: npm run villa:assets) and use a browser with WebGL.";
});
