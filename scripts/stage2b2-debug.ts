#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

import {
  ARTISAN_V2_RIG,
  resolveConnectorPose,
  resolveFolkPose,
  type ConnectorRig,
} from "../packages/folk-motion/src/index.ts";
import {
  STAGE2B1_BASE_CONFIG,
  stage2b1FrameState,
} from "../apps/web/lib/providers/stage2b1-motion.ts";

const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const sharp = require("sharp");

async function main() {
  const root = process.cwd();
  const calibration = JSON.parse(
    await readFile(
      path.join(root, "outputs", "folk-provider-benchmark", "stage-2b2", "calibration.json"),
      "utf8",
    ),
  ) as Record<string, { maxConnectorErrorRenderedPx: number }>;
  const docs = path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2b2");
  await mkdir(docs, { recursive: true });
  for (const provider of ["openai", "gemini"] as const) {
    const connectorPayload = JSON.parse(
      await readFile(
        path.join(
          root,
          "outputs",
          "folk-provider-benchmark",
          "stage-2b2",
          provider,
          "connectors.json",
        ),
        "utf8",
      ),
    ) as { rig: ConnectorRig };
    const renderReport = JSON.parse(
      await readFile(
        path.join(
          root,
          "outputs",
          "folk-provider-benchmark",
          "stage-2b2",
          provider,
          "render-report.json",
        ),
        "utf8",
      ),
    ) as { camera: { scale: number; x: number; y: number } };
    const frame = stage2b1FrameState(STAGE2B1_BASE_CONFIG, 120);
    const base = resolveFolkPose(ARTISAN_V2_RIG, frame.pose);
    const pelvis = base.find((node) => node.id === "pelvis")!;
    const resolved = resolveConnectorPose(connectorPayload.rig, frame.pose, pelvis.world);
    const cam = renderReport.camera;
    const placement = frame.placement;
    const points: Array<{ x: number; y: number; label: string; kind: string }> = [];
    const key = new Set([
      "nearUpperArm:socket",
      "nearForearm:socket",
      "handGrip:grip",
      "nearThigh:socket",
      "nearShin:socket",
      "nearFoot:sole",
      "farUpperArm:socket",
      "farForearm:socket",
      "farHand:socket",
      "farThigh:socket",
      "farShin:socket",
      "farFoot:sole",
    ]);
    for (const part of resolved) {
      const node = ARTISAN_V2_RIG.nodes.find((entry) => entry.partId === part.partId)!;
      for (const [id, point] of Object.entries(part.connectors)) {
        const isKey = key.has(`${node.id}:${id}`);
        const screenX = cam.x + cam.scale * (placement.x + point.x * placement.scale);
        const screenY = cam.y + cam.scale * (placement.y + point.y * placement.scale);
        points.push({ x: screenX, y: screenY, label: `${node.id}.${id}`, kind: id });
        void isKey;
      }
    }
    const svgPoints = points
      .map((point) => {
        const color =
          point.kind === "grip" ? "#ffd166" : point.kind === "sole" ? "#80ed99" : "#4cc9f0";
        const label =
          key.has(point.label.replace(".", ":")) || point.kind === "grip" || point.kind === "sole"
            ? `<text x="${point.x + 5}" y="${point.y - 5}" fill="${color}" font-family="Menlo,monospace" font-size="9">${point.label}</text>`
            : "";
        return `<circle cx="${point.x}" cy="${point.y}" r="3" fill="${color}" stroke="#1a0d08" stroke-width="1"/>${label}`;
      })
      .join("");
    const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
      <rect x="20" y="590" width="520" height="96" rx="6" fill="rgba(26,13,8,0.88)"/>
      <text x="36" y="616" fill="#fff2cf" font-family="Georgia,serif" font-size="18">${provider} · connector overlay (frame 120)</text>
      <text x="36" y="638" fill="#4cc9f0" font-family="Menlo,monospace" font-size="11">blue = joint socket · yellow = grip · green = sole contact</text>
      <text x="36" y="656" fill="#d2a164" font-family="Menlo,monospace" font-size="11">max rendered connector error: ${calibration[provider]!.maxConnectorErrorRenderedPx.toExponential(2)} px</text>
      <text x="36" y="674" fill="#d2a164" font-family="Menlo,monospace" font-size="11">31 parts · 30 socket attachments · debug overlay off for final export</text>
      ${svgPoints}
    </svg>`);
    const file = path.join(
      root,
      "outputs",
      "folk-provider-benchmark",
      "stage-2b2",
      provider,
      "frames",
      "frame-0120.png",
    );
    await sharp(file)
      .composite([{ input: overlay, left: 0, top: 0 }])
      .png()
      .toFile(path.join(docs, `connector-overlay-${provider}.png`));
    await writeFile(
      path.join(
        root,
        "outputs",
        "folk-provider-benchmark",
        "stage-2b2",
        provider,
        "connector-overlay.png",
      ),
      await readFile(path.join(docs, `connector-overlay-${provider}.png`)),
    );
    console.log(provider, points.length, "connector points");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
