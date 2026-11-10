#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  ARTISAN_V2_RIG,
  connectorDiagnostics,
  resolveConnectorPose,
  resolveFolkPose,
} from "../packages/folk-motion/src/index.ts";
import {
  buildConnectorRig,
  bellConnectorProp,
} from "../apps/web/lib/providers/stage2b2-connectors.ts";
import {
  STAGE2B1_BASE_CONFIG,
  stage2b1FrameStates,
} from "../apps/web/lib/providers/stage2b1-motion.ts";

async function main() {
  const root = process.cwd();
  const stage = path.join(root, "outputs", "folk-provider-benchmark", "stage-2b2");
  const docs = path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2b2");
  await mkdir(stage, { recursive: true });
  await mkdir(docs, { recursive: true });
  const report: Record<string, unknown> = {};
  for (const provider of ["openai", "gemini"] as const) {
    const manifestPath = path.join(
      root,
      "outputs",
      "folk-provider-benchmark",
      "stage-2b",
      provider,
      "pack",
      "manifest.json",
    );
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const rig = buildConnectorRig(provider, manifest);
    const states = stage2b1FrameStates(STAGE2B1_BASE_CONFIG, ARTISAN_V2_RIG);
    let maxConnectorError = 0;
    let maxLegacyDelta = 0;
    const jointSamples: Record<string, number> = {};
    for (const state of states) {
      const base = resolveFolkPose(ARTISAN_V2_RIG, state.pose);
      const pelvis = base.find((node) => node.id === "pelvis");
      if (!pelvis) throw new Error("Missing pelvis.");
      const resolved = resolveConnectorPose(rig, state.pose, pelvis.world);
      maxConnectorError = Math.max(
        maxConnectorError,
        ...resolved.map((part) => part.alignmentError),
      );
      for (const diagnostic of connectorDiagnostics(resolved, rig)) {
        jointSamples[`${diagnostic.parentPartId}->${diagnostic.childPartId}`] = Math.max(
          jointSamples[`${diagnostic.parentPartId}->${diagnostic.childPartId}`] ?? 0,
          diagnostic.alignmentError,
        );
      }
      for (const part of resolved) {
        const legacy = base.find((node) => node.partId === part.partId);
        if (!legacy) continue;
        for (const [key, value] of [
          ["a", legacy.world.a - part.world.a],
          ["b", legacy.world.b - part.world.b],
          ["c", legacy.world.c - part.world.c],
          ["d", legacy.world.d - part.world.d],
          ["e", legacy.world.e - part.world.e],
          ["f", legacy.world.f - part.world.f],
        ] as const) {
          maxLegacyDelta = Math.max(maxLegacyDelta, Math.abs(value));
          void key;
        }
      }
    }
    const providerDir = path.join(stage, provider);
    await mkdir(providerDir, { recursive: true });
    const payload = {
      format: "fableon.connector-rig",
      version: 1,
      provider,
      generatedAt: new Date().toISOString(),
      sourcePack: path.relative(root, manifestPath),
      rig,
      bell: bellConnectorProp(),
    };
    await writeFile(
      path.join(providerDir, "connectors.json"),
      `${JSON.stringify(payload, null, 2)}\n`,
    );
    report[provider] = {
      rigId: rig.id,
      parts: rig.parts.length,
      attachments: rig.parts.filter((part) => part.attachment).length,
      maxConnectorErrorRigPx: maxConnectorError,
      maxConnectorErrorRenderedPx: maxConnectorError * 0.62,
      maxLegacyMatrixDelta: maxLegacyDelta,
      jointSamples,
      connectors: Object.fromEntries(
        rig.parts.map((part) => [part.id, part.connectors.map((connector) => connector.id)]),
      ),
      flaggedForManualCalibration: [
        "shoulder socket hidden under torso",
        "Gemini turban/eye registration",
        "OpenAI wrist band overlap",
        "foot sole contact against stylized shoe silhouette",
      ],
    };
    console.log(JSON.stringify({ provider, ...report[provider] }, null, 2));
  }
  await writeFile(path.join(stage, "calibration.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(docs, "calibration.json"), `${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
