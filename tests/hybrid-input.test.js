import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three/webgpu";
import { createWalkControls } from "../src/controls/createWalkControls.js";
import { createUiIdleManager } from "../src/ui/chrome/createUiVisibilityCoordinator.js";

function fire(target, type, data = {}) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, data); target.dispatchEvent(event);
}
class Canvas extends EventTarget {
  captures = new Set();
  closest() { return null; }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) {
    this.captures.delete(id); fire(this, "lostpointercapture", { pointerId: id });
  }
}
let controls;
afterEach(() => controls?.dispose());
function setup({ coarse = false, fine = true, points = 10 } = {}) {
  globalThis.HTMLElement = globalThis.Element = Canvas;
  const win = globalThis.window = new EventTarget(), doc = globalThis.document = new EventTarget();
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { maxTouchPoints: points } });
  win.innerWidth = 1092;
  win.matchMedia = query => ({ matches: { "(pointer: coarse)": coarse,
    "(any-pointer: fine)": fine, "(pointer: fine)": fine && !coarse }[query] ?? false });
  let focus = true, requests = 0;
  doc.hidden = false; doc.hasFocus = () => focus; doc.pointerLockElement = null;
  const canvas = new Canvas(), camera = new THREE.PerspectiveCamera(); camera.position.y = 1.55;
  canvas.requestPointerLock = () => { requests++; doc.pointerLockElement = canvas; fire(doc, "pointerlockchange"); };
  doc.exitPointerLock = () => { doc.pointerLockElement = null; fire(doc, "pointerlockchange"); };
  controls = createWalkControls({ camera, domElement: canvas, settings: { moveSpeed: 4.5, sprintMultiplier: 2 } });
  controls.setActive(true);
  return { win, doc, canvas, camera, requests: () => requests, focus: value => { focus = value; } };
}
const step = (n = 60) => { for (let i = 0; i < n; i++) controls.update(1 / 60); };
const touch = (canvas, type, x = 100, y = 100, id = 7) =>
  fire(canvas, type, { pointerType: "touch", pointerId: id, clientX: x, clientY: y });

for (const coarse of [false, true]) test(`fine-pointer hybrid permits lock and keyboard without a prior touch (primary coarse=${coarse})`, () => {
  const { win, camera, requests } = setup({ coarse });
  assert.equal(controls.getInputMethod(), "mouse");
  assert.equal(controls.hasTouchLooked(), false);
  controls.requestPointerLock(); assert.equal(requests(), 1);
  fire(win, "keydown", { code: "KeyW" }); step();
  assert.ok(camera.position.z < -3);
  fire(win, "keyup", { code: "KeyW" });
  fire(win, "keydown", { code: "KeyC" }); assert.equal(controls.isCrouched(), true);
  fire(win, "keydown", { code: "KeyC" }); assert.equal(controls.isCrouched(), false);
  fire(win, "keydown", { code: "KeyP" }); assert.equal(controls.isHorizontalOnly(), true);
  fire(win, "keydown", { code: "KeyR" });
  assert.equal(new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ").z, 0);
});

test("mouse-to-touch handoff discards keys/velocity and survives the queued native unlock", () => {
  const { win, doc, canvas, camera } = setup();
  controls.requestPointerLock(); fire(win, "keydown", { code: "KeyW" }); step();
  touch(canvas, "pointerdown");
  assert.equal(controls.getInputMethod(), "touch"); assert.equal(doc.pointerLockElement, null);
  assert.equal(controls.getHorizontalSpeed(), 0); assert.equal(canvas.captures.size, 1);
  fire(doc, "pointerlockchange"); // A real browser queues this after exitPointerLock.
  const rotation = camera.quaternion.clone(), position = camera.position.clone();
  touch(canvas, "pointermove", 112, 105);
  assert.ok(camera.quaternion.angleTo(rotation) < 1e-7, "first unlocked touch sample must anchor without jumping");
  touch(canvas, "pointermove", 124, 110);
  assert.ok(camera.quaternion.angleTo(rotation) > .01);
  touch(canvas, "pointerup", 112, 105); step(180);
  assert.ok(camera.position.equals(position), "the old held W must not replay during touch");
  assert.equal(canvas.captures.size, 0);
});

test("touch-to-mouse handoff releases captures/axes and retains first-event filtering", () => {
  const { win, canvas, camera } = setup();
  touch(canvas, "pointerdown"); touch(canvas, "pointermove", 110, 104);
  controls.setMoveAxes(0, -1); step();
  fire(canvas, "pointerdown", { pointerType: "mouse" });
  assert.equal(controls.getInputMethod(), "mouse"); assert.equal(canvas.captures.size, 0);
  const position = camera.position.clone(), rotation = camera.quaternion.clone();
  controls.requestPointerLock(); step(180);
  touch(canvas, "pointermove", 160, 140);
  fire(win, "mousemove", { movementX: 130, movementY: -130 });
  assert.ok(camera.position.equals(position)); assert.ok(camera.quaternion.angleTo(rotation) < 1e-7);
  fire(win, "keydown", { code: "KeyW" }); step();
  assert.ok(camera.position.distanceTo(position) > 3);
});

test("touch-only drag/joystick work and lost capture cannot replay an old look", () => {
  const { canvas, camera, requests } = setup({ coarse: true, fine: false });
  assert.equal(controls.getInputMethod(), "touch");
  touch(canvas, "pointerdown"); touch(canvas, "pointermove", 112, 104);
  assert.equal(controls.hasTouchLooked(), true);
  controls.setMoveAxes(0, -1); step(); assert.ok(camera.position.z < -3);
  canvas.releasePointerCapture(7);
  const rotation = camera.quaternion.clone();
  touch(canvas, "pointermove", 150, 140); assert.ok(camera.quaternion.angleTo(rotation) < 1e-7);
  controls.setMoveAxes(0, 0); step(180); assert.ok(controls.getHorizontalSpeed() < .01);
  assert.equal(requests(), 0);
});

for (const transition of ["modal", "blur", "hidden"]) test(`${transition} clears touch capture/input and blocks stale events`, () => {
  const { win, doc, canvas, camera, focus } = setup();
  touch(canvas, "pointerdown"); touch(canvas, "pointermove", 110, 104); controls.setMoveAxes(0, -1); step();
  if (transition === "modal") controls.setInputSuspended(true);
  if (transition === "blur") { focus(false); fire(win, "blur"); }
  if (transition === "hidden") { doc.hidden = true; fire(doc, "visibilitychange"); }
  const position = camera.position.clone(), rotation = camera.quaternion.clone();
  assert.equal(canvas.captures.size, 0);
  touch(canvas, "pointermove", 150, 140); controls.setMoveAxes(1, 1); controls.requestPointerLock(); step();
  if (transition === "modal") controls.setInputSuspended(false);
  focus(true); doc.hidden = false; fire(win, "focus"); step(180);
  assert.ok(camera.position.equals(position)); assert.ok(camera.quaternion.angleTo(rotation) < 1e-7);
});

test("idle hints follow actual touch/mouse activity without reacting to touch-generated mouse events", () => {
  const { win, doc } = setup();
  let delay = 0;
  win.setTimeout = (_, ms) => { delay = ms; return 1; }; win.clearTimeout = () => {};
  const manager = createUiIdleManager({ state: { uiVisible: true }, activityTarget: doc });
  manager.start(); assert.equal(delay, 5000);
  fire(doc, "pointerdown", { pointerType: "touch" }); assert.equal(delay, 12000);
  fire(doc, "mousemove", { sourceCapabilities: { firesTouchEvents: true } }); assert.equal(delay, 12000);
  fire(doc, "pointermove", { pointerType: "mouse" }); assert.equal(delay, 5000);
  manager.destroy();
});
