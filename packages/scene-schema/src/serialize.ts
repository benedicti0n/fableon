import { parseProject, ProjectValidationError } from "./validation";
import type { Project } from "./schema";

/**
 * Produces a stable, human-readable JSON document after validating the input.
 * The returned document is self-contained; it contains no runtime objects.
 */
export function serializeProject(project: Project): string {
  const validated = parseProject(project);
  return `${JSON.stringify(validated, null, 2)}\n`;
}

/**
 * Parses and validates a project JSON document. Syntax errors are surfaced as
 * structured validation issues; no migration or repair is attempted.
 */
export function deserializeProject(json: string): Project {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON parse error.";
    throw new ProjectValidationError([
      {
        path: "$",
        code: "invalid_json",
        message: `Project JSON could not be parsed: ${message}`,
      },
    ]);
  }

  return parseProject(parsed);
}
