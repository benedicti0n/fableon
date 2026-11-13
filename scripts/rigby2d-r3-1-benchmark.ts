import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  importCharacter,
  readCharacter,
  readVersion,
  validateCharacterVersion,
} from "../apps/web/lib/rigby2d/assets";
import { placeFrame } from "../apps/web/lib/rigby2d/placement";
import { Rigby2DCharacterRuntime } from "../apps/web/lib/rigby2d/runtime";
import { sha256File } from "../apps/web/lib/rigby2d/storage";
import { verifyRigby2DInstallation } from "../apps/web/lib/rigby2d/mcp-client";

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, "outputs", "rigby2d-r3", "r3-1");
const SOURCE = path.join(ROOT, "outputs", "rigby2d-r2", "r2-2", "rig", "artisan-arm-pilot.rigby");
const FALLBACK_SOURCE = path.join(ROOT, "tests", "fixtures", "rigby2d", "artisan-arm-r22.rigby");
const R21_SOURCE = path.join(ROOT, "tests", "fixtures", "rigby2d", "artisan-arm-r21.rigby");

function arg(name: string, fallback: string | null = null): string | null {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] !== undefined ? process.argv[index + 1] : fallback;
}

async function writeJson(relative: string, value: unknown): Promise<void> {
  const file = path.join(OUTPUT, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const dataRoot = arg("data-root") ?? undefined;
  const source = (await stat(SOURCE).then(
    () => SOURCE,
    () => FALLBACK_SOURCE,
  )) as string;
  const sourceHash = await sha256File(source);
  const bytes = new Uint8Array(await readFile(source));
  const imported = await importCharacter({
    bytes,
    fileName: path.basename(source),
    name: "Artisan arm R2.2",
    sourceAttribution:
      "R2.2 corrected continuous-arm pilot; OpenAI-generated artwork; Rigby2D native AutoRig; arm motion only",
    artisticReviewStatus: "approved_arm_motion_only",
    characterId: "artisan-arm-r22",
    ...(dataRoot ? { dataRoot } : {}),
  });
  const runtime = new Rigby2DCharacterRuntime(dataRoot ? { dataRoot } : {});
  const manifest = await readCharacter("artisan-arm-r22", dataRoot);
  const version = await readVersion("artisan-arm-r22", manifest.currentVersionId, dataRoot);
  await writeJson("character-manifest.json", manifest);
  await writeJson("character-version.json", version);
  await writeJson("import.json", {
    created: imported.created,
    source,
    sourceHash,
    characterId: imported.version.characterId,
    versionId: imported.version.versionId,
    sha256: imported.version.sha256,
    bytes: imported.version.bytes,
    animations: imported.version.animations,
    validation: imported.version.validation,
    mcp: imported.version.mcp,
  });

  const installation = await verifyRigby2DInstallation();
  await writeJson("mcp-handshake.json", {
    runtime: "rigby2d",
    version: installation.version,
    commit: installation.commit,
    sourceHash: installation.sourceHash,
    protocolVersion: version.mcp.protocolVersion,
    toolCount: version.mcp.toolCount,
    allowlistedTools: [
      "inspect_project",
      "validate_project",
      "describe_rig",
      "describe_animation",
      "sample_pose",
      "export_sprite_sheet",
    ],
    trace: version.mcp.trace,
    stderr: version.mcp.stderr,
    elapsedMs: version.mcp.elapsedMs,
    peakRssKb: version.mcp.peakRssKb,
    requestCount: version.mcp.requestCount,
  });

  const inspected = await runtime.inspect("artisan-arm-r22");
  await writeJson("inspect.json", inspected);
  const validation = await validateCharacterVersion("artisan-arm-r22", version.versionId, dataRoot);
  await writeJson("validation.json", {
    checkedAt: new Date().toISOString(),
    versionId: version.versionId,
    validation: validation.validation,
    mcp: validation.mcp,
  });

  const regression: Record<string, unknown>[] = [];
  for (const [characterId, animation, times] of [
    ["artisan-arm-r21", "arm_angles", [0.25, 0.5, 0.75]],
    ["artisan-arm-r22", "arm_angles_ikfix", [0.25, 0.5, 0.75]],
  ] as const) {
    if (characterId === "artisan-arm-r21") {
      const r21 = new Uint8Array(await readFile(R21_SOURCE));
      await importCharacter({
        bytes: r21,
        fileName: "artisan-arm-r21.rigby",
        name: "Artisan arm R2.1",
        sourceAttribution: "R2.1 fixture for the historical angle regression",
        artisticReviewStatus: "experimental_unreviewed",
        characterId: "artisan-arm-r21",
        ...(dataRoot ? { dataRoot } : {}),
      });
    }
    for (const [index, time] of times.entries()) {
      const requested = [30, 60, 90][index] ?? 0;
      const check = await runtime.measureFlexion(characterId, {
        animation,
        timeSeconds: time,
        requestedFlexion: requested,
        tolerance: 3,
        chain: { a: "upperarm_r", b: "forearm_r", c: "hand_r" },
      });
      regression.push({ characterId, animation, ...check });
    }
  }
  await writeJson("ik-regression.json", {
    convention: "0 straight, 90 right angle, 180 folded; measured from sample_pose world joints",
    toleranceDegrees: 3,
    checks: regression,
  });

  const started = performance.now();
  const render = await runtime.renderAnimation("artisan-arm-r22", "showcase_ikfix", 24, {
    timeoutMs: 180_000,
  });
  const wallMs = Math.round(performance.now() - started);
  await writeJson("frame-export.json", {
    job: render.job,
    metadata: render.metadata,
    wallMs,
  });

  const diagnostics: Record<string, unknown>[] = [];
  for (const frameIndex of [
    0,
    Math.floor((render.metadata.frameCount - 1) / 2),
    render.metadata.frameCount - 1,
  ]) {
    const placement = placeFrame({
      frameWidth: render.metadata.frameWidth,
      frameHeight: render.metadata.frameHeight,
      pivot: render.metadata.pivot,
      actor: { x: 960, y: 1040, scale: 0.9 },
      camera: { centerX: 960, centerY: 540, zoom: 1 },
      viewport: { width: 1920, height: 1080 },
    });
    const pose = await runtime.samplePose("artisan-arm-r22", "showcase_ikfix", frameIndex / 24);
    diagnostics.push({
      frameIndex,
      timeSeconds: frameIndex / 24,
      frameWidth: render.metadata.frameWidth,
      frameHeight: render.metadata.frameHeight,
      pivot: render.metadata.pivot,
      origin: render.metadata.origin,
      anchor: { x: 960, y: 1040, scale: 0.9 },
      placement,
      root: pose.bones.find((bone) => bone.name === "root") ?? null,
      hand: pose.bones.find((bone) => bone.name === "hand_r") ?? null,
      bounds: pose.bounds,
    });
  }
  const pivots = new Set(
    diagnostics.map(
      (entry) => `${(entry["pivot"] as { x: number }).x},${(entry["pivot"] as { y: number }).y}`,
    ),
  );
  const drawPositions = new Set(
    diagnostics.map((entry) => {
      const placement = entry["placement"] as { drawX: number; drawY: number };
      return `${placement.drawX},${placement.drawY}`;
    }),
  );
  await writeJson("frame-origin-diagnostics.json", {
    frameCount: render.metadata.frameCount,
    frameWidth: render.metadata.frameWidth,
    frameHeight: render.metadata.frameHeight,
    pivot: render.metadata.pivot,
    origin: render.metadata.origin,
    pivotStable: pivots.size === 1,
    placementStable: drawPositions.size === 1,
    samples: diagnostics,
  });

  await writeJson("runtime-metrics.json", {
    importMs: imported.version.mcp.elapsedMs,
    validationMs: validation.mcp.elapsedMs,
    renderWallMs: wallMs,
    exportMs: render.metadata.exportMs,
    metadataMs: render.metadata.metadataMs,
    mcpElapsedMs: render.metadata.mcp.elapsedMs,
    peakRssKb: Math.max(
      imported.version.mcp.peakRssKb,
      validation.mcp.peakRssKb,
      render.metadata.mcp.peakRssKb,
    ),
    frameCount: render.metadata.frameCount,
    cacheBytes: render.metadata.cacheBytes,
    cached: render.job.cached,
  });

  const frameDir = path.join(OUTPUT, "frames");
  await mkdir(frameDir, { recursive: true });
  for (const frameIndex of [0, 18, 36, 54, render.metadata.frameCount - 1]) {
    const frame = await runtime.getFrame(render.job.id, frameIndex);
    await copyFile(
      frame.path,
      path.join(frameDir, `frame-${String(frameIndex).padStart(3, "0")}.png`),
    );
  }

  await writeJson("source-hashes.json", {
    source,
    sourceSha256: sourceHash,
    importedSha256: version.sha256,
    vendorCommit: installation.commit,
    vendorSourceHash: installation.sourceHash,
    frameCacheKey: render.metadata.cacheKey,
    frameMetadataSha256: await sha256File(path.join(OUTPUT, "frame-export.json")),
  });

  console.log(
    JSON.stringify(
      {
        source,
        sourceHash,
        versionId: version.versionId,
        validation: validation.validation.valid,
        frameCount: render.metadata.frameCount,
        frameWidth: render.metadata.frameWidth,
        frameHeight: render.metadata.frameHeight,
        pivot: render.metadata.pivot,
        pivotStable: pivots.size === 1,
        placementStable: drawPositions.size === 1,
        cacheBytes: render.metadata.cacheBytes,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
