#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0 || process.argv[i + 1] === undefined) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing --${name}`);
  }
  return process.argv[i + 1]!;
}
async function api<T>(pathname: string, body?: unknown): Promise<T> {
  const r = await fetch(`${process.env.FABLEON_BASE_URL ?? "http://localhost:3173"}${pathname}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const t = await r.text();
  let p: unknown = null;
  try {
    p = t ? JSON.parse(t) : null;
  } catch {
    p = null;
  }
  if (!r.ok) {
    const m =
      typeof p === "object" &&
      p !== null &&
      typeof (p as Record<string, unknown>)["error"] === "object"
        ? String(
            ((p as Record<string, unknown>)["error"] as Record<string, unknown>)["message"] ?? t,
          )
        : t;
    throw new Error(`${pathname} → ${r.status}: ${m}`);
  }
  return p as T;
}
async function main() {
  const provider = arg("provider");
  if (provider !== "openai" && provider !== "gemini") throw new Error("provider");
  const assembly = arg("assembly");
  if (assembly !== "arm" && assembly !== "leg") throw new Error("assembly");
  const mode = arg("mode", "estimate");
  const requestKey = arg("request-key", `stage2c2-${provider}-${assembly}`);
  const model = provider === "openai" ? "gpt-image-2.6-sunburst" : "gemini-nano-banana-2.1";
  const master = path.resolve(
    arg(
      "master",
      path.join(
        process.cwd(),
        "docs",
        "benchmarks",
        "phase-05.1",
        "stage-2a",
        `${provider}-master.png`,
      ),
    ),
  );
  const bytes = await readFile(master);
  const mime = bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg" : "image/png";
  const prompt = `Use the approved artisan master as the exact identity, palette, outline weight and decorative reference. Create a single horizontal 2x1 rig-part sheet containing ONLY two isolated ${assembly === "arm" ? "near-arm" : "near-leg"} parts, separated by a wide empty gutter. Do not draw a full body, torso, head, other limbs, background, shadow, label or text.

${assembly === "arm" ? "Left cell: the near upper arm/sleeve with a concealed shoulder cap and a hidden elbow extension. Right cell: the near forearm with a matching elbow cuff, hidden wrist overlap and the same fabric/skin design as the master." : "Left cell: the near thigh with a concealed hip/dhoti overlap and hidden knee extension. Right cell: the near shin with a matching knee cuff, hidden ankle overlap and the same fabric/skin design as the master."}

Preserve the master's blue sleeve motifs, ochre garment accents, gold bands, dark ink outlines and body proportions. Parts must be full-length anatomical segments, not tiny fragments. The hidden joint extensions must be part of the part artwork, not a separate circle. ${provider === "openai" ? "Use a fully transparent background with clean alpha." : "Use a perfectly flat #00FF00 chroma background; no green on the character."}`;
  const body = {
    experimentId: "phase-05.1-stage-2c",
    provider,
    model,
    operation: "generate-part",
    prompt,
    width: 1536,
    height: 1024,
    quality: provider === "openai" ? "medium" : "standard",
    ...(provider === "gemini" ? { imageSize: "2K" } : {}),
    aspectRatio: "3:2",
    outputCount: 1,
    transparentBackground: provider === "openai",
    requestKey,
    references: [{ id: "artisan-master", path: master, mimeType: mime }],
  };
  if (mode === "generate") {
    const s = await api<{
      authorizations: Array<{
        experimentId: string;
        provider: string;
        model: string;
        status: string;
      }>;
    }>("/api/studio/providers/status");
    if (
      !s.authorizations.some(
        (a) =>
          a.experimentId === "phase-05.1-stage-2c" &&
          a.provider === provider &&
          a.model === model &&
          a.status === "active",
      )
    )
      throw new Error("No active Stage 2C authorization.");
  }
  const dir = path.join(
    process.cwd(),
    "outputs",
    "folk-provider-benchmark",
    "stage-2c2",
    provider,
    "requests",
  );
  await mkdir(dir, { recursive: true });
  const estimate = await api<{ estimate: unknown; authorizationError: string | null }>(
    "/api/studio/providers/estimate",
    body,
  );
  const rec = {
    requestKey,
    provider,
    model,
    mode,
    assembly,
    prompt,
    body,
    estimate: estimate.estimate,
    authorizationError: estimate.authorizationError,
    attemptedAt: new Date().toISOString(),
  };
  await writeFile(
    path.join(dir, `${requestKey}.request.json`),
    JSON.stringify(rec, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      { requestKey, estimate: estimate.estimate, authorizationError: estimate.authorizationError },
      null,
      2,
    ),
  );
  if (mode === "estimate") return;
  const result = await api<unknown>("/api/studio/providers/generate", body);
  await writeFile(
    path.join(dir, `${requestKey}.response.json`),
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
}
main().catch((e) => {
  console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
  process.exitCode = 1;
});
