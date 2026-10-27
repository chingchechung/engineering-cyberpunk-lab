import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three/webgpu";
import { createWalkControls } from "../src/controls/createWalkControls.js";

class FakeElement extends EventTarget { closest() { return null; } }
let doc, win, canvas, camera, controls, focused, coarse;
function fire(target, type, values = {}) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, values);
  target.dispatchEvent(event);
}
function key(code, type = "keydown", values = {}) { fire(win, type, { code, ...values }); }
function step(count = 60) { for (let i = 0; i < count; i++) controls.update(1 / 60); }
function lock() { canvas.requestPointerLock(); }

beforeEach(() => {
  focused = true;
  coarse = false;
  globalThis.HTMLElement = FakeElement;
  globalThis.Element = FakeElement;
  doc = globalThis.document = new EventTarget();
  win = globalThis.window = new EventTarget();
  doc.hidden = false;
  doc.hasFocus = () => focused;
  doc.pointerLockElement = null;
  win.matchMedia = () => ({ matches: coarse });
  canvas = new FakeElement();
  canvas.requestPointerLock = () => { doc.pointerLockElement = canvas; fire(doc, "pointerlockchange"); };
  doc.exitPointerLock = () => { doc.pointerLockElement = null; fire(doc, "pointerlockchange"); };
  camera = new THREE.PerspectiveCamera();
  camera.position.y = 1.55;
  controls = createWalkControls({ camera, domElement: canvas });
  controls.setActive(true);
});

test("WASD, sprint, and crouch retain their movement behavior", () => {
  lock();
  const start = camera.position.clone();
  key("KeyW"); step(); key("KeyW", "keyup");
  assert.ok(camera.position.z < start.z - 2);
  const walkingDistance = start.z - camera.position.z;
  controls.clearInput();
  const sprintStart = camera.position.z;
  key("ShiftLeft", "keydown", { shiftKey: true }); key("KeyW", "keydown", { shiftKey: true }); step();
  assert.ok(sprintStart - camera.position.z > walkingDistance);
  controls.clearInput();
  for (const [code, axis, sign] of [["KeyA", "x", -1], ["KeyD", "x", 1], ["KeyS", "z", 1]]) {
    const before = camera.position[axis]; key(code); step(); controls.clearInput();
    assert.ok((camera.position[axis] - before) * sign > 2);
  }
  key("KeyC"); assert.equal(controls.isCrouched(), true);
  assert.ok(camera.position.y < 1);
  key("KeyC"); assert.equal(camera.position.y, 1.55);
  controls.dispose();
});

test("unlock, blur, and hidden tabs discard held input and velocity", () => {
  key("KeyW"); lock(); step();
  assert.equal(camera.position.z, 0, "unlocked keys must not accumulate");
  for (const transition of ["unlock", "blur", "hidden"]) {
    key("KeyW"); step();
    if (transition === "unlock") doc.exitPointerLock();
    if (transition === "blur") { focused = false; fire(win, "blur"); }
    if (transition === "hidden") { doc.hidden = true; fire(doc, "visibilitychange"); }
    const before = camera.position.clone();
    key("KeyW"); step(); controls.applyLookDelta(10, -60);
    assert.ok(camera.position.equals(before));
    assert.equal(controls.getHorizontalSpeed(), 0);
    focused = true; doc.hidden = false; fire(win, "focus"); lock(); step();
    assert.ok(camera.position.equals(before), "relocking must need a new movement key");
  }
  controls.dispose();
});

test("suspension clears input, rejects late lock, and requires explicit reacquisition", () => {
  lock(); key("KeyW"); step();
  controls.setInputSuspended(true);
  const position = camera.position.clone(), rotation = camera.quaternion.clone();
  lock(); key("KeyW"); controls.setMoveAxes(1, 1); controls.applyLookDelta(10, -40); step();
  assert.equal(doc.pointerLockElement, null);
  assert.ok(camera.position.equals(position));
  assert.ok(camera.quaternion.equals(rotation));
  controls.setInputSuspended(false); step();
  assert.equal(controls.isPointerLocked(), false);
  lock(); step();
  assert.ok(camera.position.equals(position));
  controls.dispose();
});

test("camera synchronization, R/P shortcuts, and idle updates cannot introduce roll or drift", () => {
  camera.quaternion.setFromEuler(new THREE.Euler(1.56, 0.4, 0.2, "YXZ"));
  controls.syncEulerFromCamera(); lock();
  key("KeyR");
  let euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
  assert.ok(Math.abs(euler.x) < 1e-10 && Math.abs(euler.z) < 1e-10);
  key("KeyP"); assert.equal(controls.isHorizontalOnly(), true);
  controls.applyLookDelta(10, -50);
  euler.setFromQuaternion(camera.quaternion, "YXZ");
  assert.ok(Math.abs(euler.x) < 1e-10);
  const rotation = camera.quaternion.clone(); step(600);
  assert.ok(camera.quaternion.equals(rotation));
  controls.setActive(false); controls.setActive(true); step(60);
  assert.ok(camera.quaternion.angleTo(rotation) < 1e-7);
  controls.dispose();
});

test("touch look and joystick survive suspension without replaying a held gesture", () => {
  coarse = true;
  fire(canvas, "pointerdown", { pointerType: "touch", pointerId: 1, clientX: 100, clientY: 100 });
  fire(canvas, "pointermove", { pointerId: 1, clientX: 110, clientY: 104 });
  assert.equal(controls.hasTouchLooked(), true);
  controls.setMoveAxes(0, -1); step();
  assert.ok(camera.position.z < -2);
  controls.setInputSuspended(true);
  const before = camera.position.clone(), rotation = camera.quaternion.clone();
  fire(canvas, "pointermove", { pointerId: 1, clientX: 130, clientY: 140 });
  controls.setInputSuspended(false); step();
  assert.ok(camera.position.equals(before));
  assert.ok(camera.quaternion.angleTo(rotation) < 1e-7);
  controls.dispose();
});
