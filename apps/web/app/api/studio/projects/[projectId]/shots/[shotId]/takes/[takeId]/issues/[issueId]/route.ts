import { NextResponse } from "next/server";

import { StudioError } from "@/lib/studio/errors";
import {
  errorResponse,
  readBodyNullableNumber,
  readBodyString,
  readJsonObject,
} from "@/lib/studio/http";
import { updateIssue, type IssuePatch } from "@/lib/studio/repository";
import {
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  type IssueCategory,
  type IssueSeverity,
  type IssueStatus,
} from "@/lib/studio/types";

export const dynamic = "force-dynamic";

interface IssueContext {
  readonly params: Promise<{
    readonly projectId: string;
    readonly shotId: string;
    readonly takeId: string;
    readonly issueId: string;
  }>;
}

export async function PATCH(request: Request, context: IssueContext): Promise<NextResponse> {
  try {
    const { projectId, shotId, takeId, issueId } = await context.params;
    const body = await readJsonObject(request);
    const patch: {
      category?: IssueCategory;
      severity?: IssueSeverity;
      description?: string;
      timestampSeconds?: number | null;
      status?: IssueStatus;
    } = {};
    if ("category" in body) {
      const category = readBodyString(body, "category", { required: true }) as IssueCategory;
      if (!ISSUE_CATEGORIES.includes(category)) {
        throw new StudioError("invalid_input", "Invalid issue category.");
      }
      patch.category = category;
    }
    if ("severity" in body) {
      const severity = readBodyString(body, "severity", { required: true }) as IssueSeverity;
      if (!ISSUE_SEVERITIES.includes(severity)) {
        throw new StudioError("invalid_input", "Invalid issue severity.");
      }
      patch.severity = severity;
    }
    if ("description" in body) {
      patch.description = readBodyString(body, "description", { required: true, max: 4000 });
    }
    if ("timestampSeconds" in body) {
      const timestamp = readBodyNullableNumber(body, "timestampSeconds");
      if (timestamp !== null && timestamp < 0) {
        throw new StudioError("invalid_input", "Issue timestamp cannot be negative.");
      }
      patch.timestampSeconds = timestamp;
    }
    if ("status" in body) {
      const status = readBodyString(body, "status", { required: true }) as IssueStatus;
      if (!ISSUE_STATUSES.includes(status)) {
        throw new StudioError("invalid_input", "Invalid issue status.");
      }
      patch.status = status;
    }
    if (Object.keys(patch).length === 0) {
      throw new StudioError("invalid_input", "No issue fields were provided.");
    }
    const project = await updateIssue(projectId, shotId, takeId, issueId, patch as IssuePatch);
    const issue = project.shots
      .find((shot) => shot.id === shotId)
      ?.takes.find((item) => item.id === takeId)
      ?.issues.find((item) => item.id === issueId);
    if (!issue) {
      throw new StudioError("internal", "The updated issue could not be located.");
    }
    return NextResponse.json({ project, issue });
  } catch (error) {
    return errorResponse(error);
  }
}
