import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import { validateConnectorRig, type ConnectorRig } from "@fableon/folk-motion";

import { getRepoRoot } from "@/lib/studio/repository";

export const dynamic = "force-dynamic";

interface Context {
  readonly params: Promise<{ readonly provider: string }>;
}

function fileFor(provider: string): string {
  if (provider !== "openai" && provider !== "gemini") throw new Error("Unknown provider.");
  return path.join(
    getRepoRoot(),
    "outputs",
    "folk-provider-benchmark",
    "stage-2b2",
    provider,
    "connectors.json",
  );
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  const { provider } = await context.params;
  try {
    const body = await readFile(fileFor(provider), "utf8");
    return new NextResponse(body, {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Connector rig not found." }, { status: 404 });
  }
}

export async function POST(request: Request, context: Context): Promise<NextResponse> {
  const { provider } = await context.params;
  try {
    const body = (await request.json()) as { rig?: ConnectorRig };
    if (!body.rig) throw new Error("Missing rig.");
    validateConnectorRig(body.rig);
    const file = fileFor(provider);
    const existing = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
    await writeFile(
      file,
      `${JSON.stringify({ ...existing, generatedAt: new Date().toISOString(), rig: body.rig }, null, 2)}\n`,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
