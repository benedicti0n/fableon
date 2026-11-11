import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

import {
  createSeedMask,
  getSourcePath,
  isStage2C5Provider,
  listMaskRevisions,
  readMaskBuffer,
  saveMaskRevision,
  sniffImageFormat,
  Stage2C5StorageError,
  type Stage2C5Provider,
  type Stage2C5SourceSheet,
} from "@/lib/providers/stage2c5-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Context {
  readonly params: Promise<{ readonly path: readonly string[] }>;
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof Stage2C5StorageError) {
    const status = error.code === "not_found" ? 404 : error.code === "conflict" ? 409 : 400;
    return NextResponse.json(
      { error: error.message, code: error.code, currentRevision: error.currentRevision ?? null },
      { status },
    );
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : String(error) },
    { status: 400 },
  );
}

function parseProvider(value: string | undefined): Stage2C5Provider {
  if (!value || !isStage2C5Provider(value)) {
    throw new Stage2C5StorageError("not_found", "Unknown provider.");
  }
  return value;
}

function parseSheet(value: string | undefined): Stage2C5SourceSheet {
  if (value !== "arm" && value !== "leg") {
    throw new Stage2C5StorageError("not_found", "Unknown source sheet.");
  }
  return value;
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  const { path: segments } = await context.params;
  try {
    const [kind, providerValue, second, third] = segments;
    const provider = parseProvider(providerValue);
    if (kind === "source") {
      const sheet = parseSheet(second);
      const bytes = await readFile(getSourcePath(provider, sheet));
      const format = sniffImageFormat(bytes);
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          "Content-Type": format === "jpeg" ? "image/jpeg" : "image/png",
          "Content-Length": String(bytes.length),
          "Cache-Control": "no-store",
        },
      });
    }
    if (kind === "seed") {
      const part = second;
      if (!part) throw new Stage2C5StorageError("not_found", "Part is required.");
      const seed = await createSeedMask(provider, part);
      return new NextResponse(new Uint8Array(seed.bytes), {
        headers: {
          "Content-Type": "image/png",
          "Content-Length": String(seed.bytes.length),
          "Cache-Control": "no-store",
          "X-Source-Sha256": seed.metadata.sourceSha256,
        },
      });
    }
    if (kind === "mask") {
      const part = second;
      const revision = third ?? "latest";
      if (!part) throw new Stage2C5StorageError("not_found", "Part is required.");
      if (revision !== "latest" && !/^\d+$/.test(revision)) {
        throw new Stage2C5StorageError("invalid", "Invalid mask revision.");
      }
      const { bytes, metadata } = await readMaskBuffer(
        provider,
        part,
        revision === "latest" ? "latest" : Number(revision),
      );
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          "Content-Type": "image/png",
          "Content-Length": String(bytes.length),
          "Cache-Control": "no-store",
          "X-Mask-Sha256": metadata.maskSha256,
          "X-Mask-Revision": String(metadata.revision),
        },
      });
    }
    if (kind === "revisions") {
      const part = second;
      if (!part) throw new Stage2C5StorageError("not_found", "Part is required.");
      return NextResponse.json({
        provider,
        part,
        revisions: await listMaskRevisions(provider, part),
      });
    }
    return NextResponse.json({ error: "Unknown Stage 2C.5 endpoint." }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: Context): Promise<NextResponse> {
  const { path: segments } = await context.params;
  try {
    const [kind, providerValue, part] = segments;
    const provider = parseProvider(providerValue);
    if (kind !== "masks" || !part) {
      return NextResponse.json({ error: "Unknown Stage 2C.5 endpoint." }, { status: 404 });
    }
    const body = (await request.json()) as {
      maskPngBase64?: unknown;
      sourceSha256?: unknown;
      width?: unknown;
      height?: unknown;
      expectedRevision?: unknown;
      editOrigin?: unknown;
      notes?: unknown;
    };
    if (typeof body.maskPngBase64 !== "string" || body.maskPngBase64.length > 12_000_000) {
      throw new Stage2C5StorageError("invalid", "Mask payload is missing or too large.");
    }
    if (
      typeof body.sourceSha256 !== "string" ||
      typeof body.width !== "number" ||
      typeof body.height !== "number" ||
      typeof body.expectedRevision !== "number" ||
      !Number.isInteger(body.expectedRevision) ||
      body.expectedRevision < 0
    ) {
      throw new Stage2C5StorageError("invalid", "Mask metadata is incomplete.");
    }
    const revision = await saveMaskRevision(provider, part, {
      maskPngBase64: body.maskPngBase64,
      sourceSha256: body.sourceSha256,
      width: body.width,
      height: body.height,
      expectedRevision: body.expectedRevision,
      editOrigin: typeof body.editOrigin === "string" ? body.editOrigin : "studio-brush",
      notes: typeof body.notes === "string" ? body.notes : "",
    });
    return NextResponse.json({ ok: true, revision }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
