import type { z } from "zod";

import { PROJECT_SCHEMA_VERSION } from "./constants";
import { projectSchema, type Project } from "./schema";

export interface ValidationIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

function formatIssuePath(path: ReadonlyArray<PropertyKey>): string {
  if (path.length === 0) {
    return "$";
  }

  return path.reduce<string>((result, segment) => {
    if (typeof segment === "number") {
      return `${result}[${segment}]`;
    }

    return `${result}.${String(segment)}`;
  }, "$");
}

function toValidationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: formatIssuePath(issue.path),
    code: issue.code,
    message: issue.message,
  }));
}

export class ProjectValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    const detail = issues.map((issue) => `- ${issue.path}: ${issue.message}`).join("\n");
    super(
      `Project validation failed with ${issues.length} issue${issues.length === 1 ? "" : "s"}:\n${detail}`,
    );
    this.name = "ProjectValidationError";
    this.issues = issues;
  }
}

export type ProjectValidationResult =
  | { readonly success: true; readonly data: Project }
  | { readonly success: false; readonly error: ProjectValidationError };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unsupportedVersionIssue(input: unknown): ValidationIssue | null {
  if (!isRecord(input) || !("schemaVersion" in input)) {
    return null;
  }

  const version = input.schemaVersion;
  if (typeof version === "number" && version !== PROJECT_SCHEMA_VERSION) {
    return {
      path: "$.schemaVersion",
      code: "unsupported_schema_version",
      message: `Unsupported schema version ${version}. This build supports version ${PROJECT_SCHEMA_VERSION}.`,
    };
  }

  return null;
}

/**
 * Validates an unknown value as a Fableon project. The input is never mutated.
 * Errors keep Zod's structured path information in a stable, readable format.
 */
export function validateProject(input: unknown): ProjectValidationResult {
  const versionIssue = unsupportedVersionIssue(input);
  if (versionIssue) {
    return {
      success: false,
      error: new ProjectValidationError([versionIssue]),
    };
  }

  const result = projectSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: new ProjectValidationError(toValidationIssues(result.error)),
    };
  }

  return { success: true, data: result.data };
}

/** Parses a project or throws a ProjectValidationError with actionable paths. */
export function parseProject(input: unknown): Project {
  const result = validateProject(input);
  if (!result.success) {
    throw result.error;
  }

  return result.data;
}
