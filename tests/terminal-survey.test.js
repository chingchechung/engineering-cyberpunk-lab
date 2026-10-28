import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { TERMINAL_LAYOUT, INTERACTION_RADIUS } from "../src/education/terminalLayout.js";

test("five fixed terminal sites derive from the original geometry's connected walking survey", () => {
  const survey = JSON.parse(readFileSync(new URL("./fixtures/terminal-survey.json", import.meta.url)));
  assert.deepEqual(TERMINAL_LAYOUT.map((terminal) => terminal.id), ["Q01", "Q02", "Q03", "Q04", "Q05"]);
  assert.equal(INTERACTION_RADIUS, 2.6);
  for (const [name, hash] of Object.entries(survey.sourceAssets)) {
    assert.equal(createHash("sha256").update(readFileSync(new URL(`../public/models/${name}`, import.meta.url))).digest("hex"), hash);
  }
  for (const terminal of TERMINAL_LAYOUT) {
    const index = survey.terminalNodes[terminal.id];
    assert.ok(survey.candidates.includes(index));
    const surveyed = survey.nodes[index].position;
    assert.ok(Math.hypot(terminal.position[0] - surveyed[0], terminal.position[2] - surveyed[2]) < 0.001);
    assert.equal(terminal.position[1], -5.4);
    const route = survey.routes[terminal.id];
    assert.equal(route[0], 0);
    assert.equal(route.at(-1), survey.approachNodes[terminal.id]);
  }
  for (const route of [...Object.values(survey.routes), ...Object.values(survey.pairRoutes)]) {
    for (let i = 1; i < route.length; i++) assert.ok(survey.nodes[route[i - 1]].edges.includes(route[i]));
  }
  const firstFour = TERMINAL_LAYOUT.slice(0, 4);
  assert.ok(Math.max(...firstFour.map((terminal) => terminal.position[0])) - Math.min(...firstFour.map((terminal) => terminal.position[0])) > 190);
  for (const a of TERMINAL_LAYOUT) for (const b of TERMINAL_LAYOUT) if (a !== b) {
    assert.ok(Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]) >= 49);
  }
});
