// Adapter for the approved Python/reference corpus. No browser or network.
import { readFileSync } from 'node:fs';
import * as validator from '../src/education/assignments/assignment-contract.js';
const { cases, answers } = JSON.parse(readFileSync(0, 'utf8'));
process.stdout.write(JSON.stringify({ rules: globalThis.AssignmentRules,
  results: cases.map(item => ({
    errors: item.kind === 'unit' ? validator.validateUnit(item.data, item.filename ?? null) : validator.validateManifest(item.data),
    normalized: item.kind === 'unit' ? validator.normalizeUnit(item.data) : validator.normalizeManifest(item.data)
  })), answers: answers.map(item => validator.acceptsAnswer(item.question, item.selected))
}));
