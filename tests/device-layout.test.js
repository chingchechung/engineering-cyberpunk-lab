import { test } from "node:test";
import assert from "node:assert/strict";
import { hasTouchCapability, hasFinePointer, isCoarsePointerDevice, isDesktopPointerLayout, isMobileDevice } from "../src/platform/deviceLayout.js";

const cases = [
  ["desktop", 0, false, true, 1280, false],
  ["confirmed Windows laptop", 10, false, true, 1092, false],
  ["hybrid coarse and fine pointers", 10, true, true, 1092, false],
  ["touch-only phone", 5, true, false, 390, true],
  ["touch-only tablet", 10, true, false, 1024, true],
  ["narrow fine-pointer laptop", 10, false, true, 700, false],
  ["mouse without touch, primary coarse also reported", 0, true, true, 1280, false],
];
for (const [name, points, coarse, fine, width, touchDefault] of cases) {
  test(`input capabilities: ${name}`, () => {
    globalThis.window = { innerWidth: width, matchMedia: query => ({ matches: {
      "(pointer: coarse)": coarse, "(pointer: fine)": !coarse && fine,
      "(any-pointer: fine)": fine, "(max-width: 768px)": width <= 768,
    }[query] ?? false }) };
    Object.defineProperty(globalThis, "navigator", { configurable: true,
      value: { maxTouchPoints: points, platform: "Win32", userAgent: "Chrome" } });
    assert.equal(hasTouchCapability(), points > 0);
    assert.equal(hasFinePointer(), fine);
    assert.equal(isCoarsePointerDevice(), touchDefault);
    assert.equal(isDesktopPointerLayout(), width > 768 && !touchDefault);
    assert.equal(isMobileDevice(), width <= 768 || coarse || points > 0,
      "accepted graphics budgets must remain separate from input preference");
    if (name === "confirmed Windows laptop") {
      assert.equal(coarse || points > 0, true, "v1.0.0's predicate reproduces the reported failure");
      assert.equal(isCoarsePointerDevice(), false, "the exact same capabilities now allow desktop controls");
    }
  });
}

test("touch-point fallback applies only when pointer media queries are unavailable", () => {
  globalThis.window = { innerWidth: 1092 };
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { maxTouchPoints: 10 } });
  assert.equal(isCoarsePointerDevice(), true);
  navigator.maxTouchPoints = 0;
  assert.equal(isCoarsePointerDevice(), false);
});
