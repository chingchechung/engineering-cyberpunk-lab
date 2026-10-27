// Synthetic examples only. Assignment loading and external links are later phases.
export const DEMO_QUESTIONS = Object.freeze([
  { id: "Q01", prompt: "An AND gate has inputs 1 and 0. What is its output?", options: ["0", "1", "It always alternates"], answer: 0 },
  { id: "Q02", prompt: "What is the output of a NOT gate when its input is 0?", options: ["0", "1", "It has no output"], answer: 1 },
  { id: "Q03", prompt: "How many distinct values can one binary bit represent?", options: ["One", "Two", "Ten"], answer: 1 },
  { id: "Q04", prompt: "What is the decimal value of binary 10?", options: ["Ten", "One", "Two"], answer: 2 },
  { id: "Q05", prompt: "Which gate outputs 1 when its two binary inputs differ?", options: ["AND", "XOR", "NOR"], answer: 1 },
].map((question) => Object.freeze({ ...question, options: Object.freeze(question.options) })));

export function createQuizProgress(questions = DEMO_QUESTIONS) {
  const passed = new Set();
  const byId = new Map(questions.map((question) => [question.id, question]));
  return {
    questions,
    getQuestion: (id) => byId.get(id) ?? null,
    hasPassed: (id) => passed.has(id),
    getCompleted: () => passed.size,
    submit(id, option) {
      const question = byId.get(id);
      if (!question || !Number.isInteger(option) || option < 0 || option >= question.options.length) return null;
      const correct = option === question.answer;
      if (correct) passed.add(id);
      return { correct, passed: passed.has(id), completed: passed.size };
    },
  };
}
