import { test } from "node:test";
import assert from "node:assert/strict";
import { createQuizProgress, DEMO_QUESTIONS } from "../src/education/demoQuestions.js";
import { findNearbyTerminal, TERMINAL_LAYOUT, INTERACTION_RADIUS } from "../src/education/terminalLayout.js";

test("five independent demo questions support retries and retained passes", () => {
  const quiz = createQuizProgress();
  assert.deepEqual(quiz.questions.map((q) => q.id), ["Q01", "Q02", "Q03", "Q04", "Q05"]);
  assert.equal(quiz.getCompleted(), 0);
  for (const question of DEMO_QUESTIONS) {
    assert.equal(quiz.submit(question.id, (question.answer + 1) % 3).correct, false);
    assert.equal(quiz.hasPassed(question.id), false);
    assert.equal(quiz.submit(question.id, question.answer).correct, true);
    assert.equal(quiz.hasPassed(question.id), true);
  }
  assert.equal(quiz.getCompleted(), 5);
  quiz.submit("Q01", 2);
  assert.equal(quiz.getCompleted(), 5);
  assert.equal(quiz.hasPassed("Q01"), true);
  assert.equal(createQuizProgress().getCompleted(), 0);
});

test("invalid answers and question identifiers cannot advance progress", () => {
  const quiz = createQuizProgress();
  for (const answer of [undefined, NaN, -1, 3, "0", 0.5]) assert.equal(quiz.submit("Q01", answer), null);
  assert.equal(quiz.getQuestion("Q99"), null);
  assert.equal(quiz.submit("Q99", 0), null);
  assert.equal(quiz.getCompleted(), 0);
});

test("terminal interaction uses bounded 3D distance and nearest identifier", () => {
  assert.equal(TERMINAL_LAYOUT.length, 5);
  for (const terminal of TERMINAL_LAYOUT) {
    const [x, y, z] = terminal.position;
    assert.equal(findNearbyTerminal({ x, y: y + 1.2, z }).id, terminal.id);
    assert.equal(findNearbyTerminal({ x, y: y + 1.2, z: z + INTERACTION_RADIUS - 0.001 }, [terminal]).id, terminal.id);
    assert.equal(findNearbyTerminal({ x, y: y + 1.2, z: z + INTERACTION_RADIUS + 0.001 }, [terminal]), null);
    assert.equal(findNearbyTerminal({ x, y: y + 10, z }, [terminal]), null);
  }
});
