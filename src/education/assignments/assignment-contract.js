// Native ESM bridge to the unchanged, instructor-approved UMD reference files.
// This repository is type:module, so both Node and browsers use their global branch.
import "./reference/assignment-rules.js";
import "./reference/assignment-validator.js";

export const { normalizeUnit, normalizeManifest, validateUnit, validateUnitV1,
  validateUnitV2, validateManifest, acceptsAnswer } = globalThis.AssignmentValidator;

export function validateOrThrow(issues, file) {
  if (!issues.length) return;
  const error = new Error(`${file} failed validation: ` + issues.slice(0, 3)
    .map((issue) => `${issue.path}: ${issue.message}`).join("; "));
  error.issues = issues;
  throw error;
}
