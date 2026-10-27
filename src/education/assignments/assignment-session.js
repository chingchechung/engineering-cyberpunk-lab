import { DEMO_QUESTIONS, createQuizProgress } from "../demoQuestions.js";
import { validateUnit, normalizeUnit, acceptsAnswer, validateOrThrow } from "./assignment-contract.js";

function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

// Adapted from Engineering City Lab's assignment-session. Only a confirmed,
// validated replacement changes the active snapshot. Progress is memory-only.
export function createAssignmentSession() {
  const demo = createQuizProgress();
  const listeners = new Set();
  let unit = null;
  let passed = new Set();
  const notify = () => { for (const listener of listeners) listener(); };
  function question(id) { return (unit?.questions ?? DEMO_QUESTIONS).find((item) => item.id === id) ?? null; }
  function answer(id, label) {
    const item = question(id);
    const correct = unit ? acceptsAnswer(item, label) :
      typeof label === "string" && label.length === 1 && "ABCD".includes(label) &&
      Boolean(demo.submit(id, "ABCD".indexOf(label))?.correct);
    if (correct) {
      if (unit) passed.add(id);
      notify();
    }
    return correct;
  }
  const session = {
    get mode() { return unit ? "assignment" : "demo"; },
    get unit() { return unit; },
    get unitId() { return unit?.unitId ?? null; },
    get questions() { return unit?.questions ?? DEMO_QUESTIONS; },
    get total() { return session.questions.length; },
    get count() { return unit ? passed.size : demo.getCompleted(); },
    get complete() { return session.count === session.total; },
    question,
    getQuestion: question,
    getCompleted: () => session.count,
    hasPassed: (id) => unit ? passed.has(id) : demo.hasPassed(id),
    answer,
    submit(id, index) {
      const item = question(id);
      if (!item || !Number.isInteger(index) || index < 0 || index >= item.options.length) return null;
      const correct = answer(id, "ABCD"[index]);
      return { correct, passed: session.hasPassed(id), completed: session.count };
    },
    activate(data, filename) {
      validateOrThrow(validateUnit(data, filename), filename ?? "Assignment");
      const next = freeze(normalizeUnit(data));
      unit = next;
      passed = new Set();
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return Object.freeze(session);
}
