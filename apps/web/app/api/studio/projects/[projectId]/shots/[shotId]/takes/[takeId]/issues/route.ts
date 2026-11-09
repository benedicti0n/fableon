import { NextResponse } from "next/server";

import { StudioError } from "@/lib/studio/errors";
import {
  errorResponse,
  readBodyNullableNumber,
  readBodyNullableString,
  readBodyString,
  readJsonObject,
} from "@/lib/studio/http";
import { addIssue } from "@/lib/studio/repository";
import {
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  type IssueCategory,
  type IssueSeverity,
} from "@/lib/studio/types";

export const dynamic = "force-dynamic";

interface IssuesContext {
  readonly params: Promise<{
    readonly projectId: string;
    readonly shotId: string;
    readonly takeId: string;
  }>;
}

export async function POST(request: Request, context: IssuesContext): Promise<NextResponse> {
  try {
    const { projectId, shotId, takeId } = await context.params;
    const body = await readJsonObject(request);
    const category = readBodyString(body, "category", { required: true }) as IssueCategory;
    const severity = readBodyString(body, "severity", { required: true }) as IssueSeverity;
    if (!ISSUE_CATEGORIES.includes(category)) {
      throw new StudioError("invalid_input", "Invalid issue category.");
    }
    if (!ISSUE_SEVERITIES.includes(severity)) {
      throw new StudioError("invalid_input", "Invalid issue severity.");
    }
    const timestampSeconds = readBodyNullableNumber(body, "timestampSeconds");
    if (timestampSeconds !== null && timestampSeconds < 0) {
      throw new StudioError("invalid_input", "Issue timestamp cannot be negative.");
    }
    const project = await addIssue(projectId, shotId, takeId, {
      category,
      severity,
      description: readBodyString(body, "description", { required: true, max: 4000 }),
      timestampSeconds,
      frameImageMediaId: readBodyNullableString(body, "frameImageMediaId"),
    });
    const take = project.shots
      .find((shot) => shot.id === shotId)
      ?.takes.find((item) => item.id === takeId);
    const issue = take?.issues.at(-1);
    if (!issue) {
      throw new StudioError("internal", "The created issue could not be located.");
    }
    return NextResponse.json({ project, issue }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
