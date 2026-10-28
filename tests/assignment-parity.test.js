import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as contract from "../src/education/assignments/assignment-contract.js";

// Frozen expected results generated from the independent approved Python
// validator and original mutation corpus. npm test needs only Node.
const corpus = JSON.parse(readFileSync(new URL("./fixtures/contract-corpus.json", import.meta.url)));
assert.equal(corpus.cases.length, 364);
assert.equal(corpus.answers.length, 76);
for (const item of corpus.cases) test(`reference validation: ${item.name}`, () => {
  const before = structuredClone(item.data);
  const issues = item.kind === "unit" ? contract.validateUnit(item.data, item.filename) : contract.validateManifest(item.data);
  const normalized = item.kind === "unit" ? contract.normalizeUnit(item.data) : contract.normalizeManifest(item.data);
  assert.equal(!issues.length, item.valid);
  assert.deepEqual(issues, item.errors);
  assert.deepEqual(normalized, item.normalized);
  assert.deepEqual(item.data, before);
});
for (const [index, item] of corpus.answers.entries()) test(`reference single-answer case ${index + 1}`, () => {
  assert.equal(contract.acceptsAnswer(item.question, item.selected), item.expected);
});
test("reference schema URL rules and all 15 imported artifacts keep their original bytes", () => {
  const schema = JSON.parse(readFileSync(new URL("../schemas/assignment-v1.schema.json", import.meta.url)));
  assert.deepEqual(globalThis.AssignmentRules, Object.fromEntries(["youtubeUrl", "googleFormUrl"].map((key) => [key, schema.$defs[key].pattern])));
  const files = JSON.parse(readFileSync(new URL("../docs/assignment-reuse-files.json", import.meta.url)));
  assert.equal(files.length, 15);
  for (const file of files) {
    assert.equal(createHash("sha256").update(readFileSync(new URL(`../${file.path}`, import.meta.url))).digest("hex"), file.sha256, file.path);
  }
});
