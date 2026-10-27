import { test } from "node:test";
import assert from "node:assert/strict";
import { createMouseLook, MAX_PITCH, POINTER_LOCK_SETTLE_MS } from "../src/controls/createMouseLook.js";

test("ordinary look is proportional, reversible, and idle has no drift", () => {
  const look = createMouseLook();
  look.apply(8, -5);
  assert.ok(Math.abs(look.getAngles().yaw + 0.016) < 1e-12);
  assert.equal(look.getAngles().pitch, 0.01);
  look.apply(-8, 5);
  assert.ok(Math.abs(look.getAngles().yaw) < 1e-12);
  assert.equal(look.getAngles().pitch, 0);
  const idleAngles = look.getAngles();
  for (let i = 0; i < 1000; i++) look.apply(0, 0);
  assert.deepEqual(look.getAngles(), idleAngles);
});

test("non-finite and spurious mouse events never rotate the camera", () => {
  const look = createMouseLook();
  for (const delta of [[NaN, 0], [0, undefined], [Infinity, 0], [0, -12000], [3000, 1], [1, -181]]) {
    assert.equal(look.apply(...delta), false);
    assert.deepEqual(look.getAngles(), { yaw: 0, pitch: 0 });
  }
});

test("individual steps and sustained vertical motion stay bounded away from poles", () => {
  const look = createMouseLook();
  look.apply(180, -180);
  assert.ok(Math.abs(look.getAngles().yaw) <= 0.120001);
  assert.equal(look.getAngles().pitch, 0.12);
  for (let i = 0; i < 500; i++) look.apply(4, -50);
  assert.equal(look.getAngles().pitch, MAX_PITCH);
  for (let i = 0; i < 500; i++) look.apply(-4, 50);
  assert.equal(look.getAngles().pitch, -MAX_PITCH);
  assert.ok(Math.abs(look.getAngles().yaw) <= Math.PI);
});

test("lock entry/re-entry discards stale first events and settling events", () => {
  const look = createMouseLook();
  assert.equal(look.applyMouse(20, -20, 0), false);
  look.setLocked(true, 100);
  assert.equal(look.applyMouse(150, -150, 101), false);
  assert.equal(look.applyMouse(20, -20, 100 + POINTER_LOCK_SETTLE_MS - 1), false);
  assert.equal(look.applyMouse(5, 3, 200), true);
  const before = look.getAngles();
  look.setLocked(false, 201);
  look.applyMouse(0, -80, 202);
  assert.deepEqual(look.getAngles(), before);
  look.setLocked(true, 300);
  assert.equal(look.applyMouse(150, -150, 500), false);
  assert.deepEqual(look.getAngles(), before);
  assert.equal(look.applyMouse(0, 0, 501), false);
  assert.deepEqual(look.getAngles(), before);
});

test("horizontal-only mode and level recovery preserve heading", () => {
  const look = createMouseLook();
  look.sync(0.7, 1.2);
  look.level();
  assert.deepEqual(look.getAngles(), { yaw: 0.7, pitch: 0 });
  assert.equal(look.toggleHorizontalOnly(), true);
  look.apply(10, -40);
  assert.equal(look.getAngles().pitch, 0);
  assert.ok(look.getAngles().yaw < 0.7);
  look.sync(2, 1.5);
  assert.equal(look.getAngles().pitch, 0);
  assert.equal(look.toggleHorizontalOnly(), false);
  look.apply(0, -10);
  assert.equal(look.getAngles().pitch, 0.02);
});
