import type { SpriteRigDefinition } from "@fableon/sprite-motion";

import type { StorybookBirdArt } from "./bird-art";
import { createStorybookBirdArt } from "./bird-art";
import {
  createLandingRig,
  evaluateLandingRig,
  LANDING_CONTACT_FRAME,
  LANDING_FRAME_COUNT,
} from "./landing-rig";
import { createLandingSceneArt, type LandingSceneArt } from "./scene-art";

export interface LandingBenchmark {
  readonly scene: LandingSceneArt;
  readonly bird: StorybookBirdArt;
  readonly rig: SpriteRigDefinition;
}

export interface LandingRenderOptions {
  readonly hiddenPartIds?: readonly string[];
}

let cachedBenchmark: LandingBenchmark | undefined;
let cachedSeed: number | undefined;

export function createLandingBenchmark(seed = 20261109): LandingBenchmark {
  if (cachedBenchmark && cachedSeed === seed) {
    return cachedBenchmark;
  }

  const scene = createLandingSceneArt(seed);
  const bird = createStorybookBirdArt(seed);
  const rig = createLandingRig();
  cachedBenchmark = Object.freeze({ scene, bird, rig });
  cachedSeed = seed;
  return cachedBenchmark;
}

function drawContactShadow(context: CanvasRenderingContext2D, frame: number): void {
  const ramp = Math.min(Math.max((frame - 20) / 10, 0), 1);
  const alpha = frame >= LANDING_CONTACT_FRAME ? 0.3 : ramp * 0.3;
  if (alpha <= 0) {
    return;
  }

  context.save();
  try {
    context.translate(965, 932);
    context.scale(1, 0.16);
    const shadow = context.createRadialGradient(0, 0, 8, 0, 0, 150);
    shadow.addColorStop(0, `rgba(12, 9, 6, ${alpha})`);
    shadow.addColorStop(0.65, `rgba(12, 9, 6, ${alpha * 0.4})`);
    shadow.addColorStop(1, "rgba(12, 9, 6, 0)");
    context.fillStyle = shadow;
    context.beginPath();
    context.arc(0, 0, 150, 0, Math.PI * 2);
    context.fill();
  } finally {
    context.restore();
  }
}

export function renderLandingCharacter(
  context: CanvasRenderingContext2D,
  frame: number,
  benchmark: LandingBenchmark,
  options: LandingRenderOptions = {},
): void {
  if (!Number.isInteger(frame) || frame < 0 || frame >= LANDING_FRAME_COUNT) {
    throw new Error(`Landing frame must be an integer from 0 to ${LANDING_FRAME_COUNT - 1}.`);
  }

  const hidden = new Set(options.hiddenPartIds ?? []);
  const resolved = evaluateLandingRig(frame);
  context.save();
  try {
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    for (const node of resolved) {
      if (!node.visible || hidden.has(node.id)) {
        continue;
      }
      const part = benchmark.bird.parts[node.id as keyof typeof benchmark.bird.parts];
      if (!part) {
        throw new Error(`No artwork exists for rig part "${node.id}".`);
      }

      context.save();
      try {
        context.setTransform(
          node.world.a,
          node.world.b,
          node.world.c,
          node.world.d,
          node.world.e,
          node.world.f,
        );
        context.drawImage(part.canvas, 0, 0);
      } finally {
        context.restore();
      }
    }
  } finally {
    context.restore();
  }
}

export function renderLandingFrame(
  context: CanvasRenderingContext2D,
  frame: number,
  benchmark: LandingBenchmark,
  options: LandingRenderOptions = {},
): void {
  if (!Number.isInteger(frame) || frame < 0 || frame >= LANDING_FRAME_COUNT) {
    throw new Error(`Landing frame must be an integer from 0 to ${LANDING_FRAME_COUNT - 1}.`);
  }

  context.save();
  try {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, benchmark.scene.width, benchmark.scene.height);
    context.drawImage(benchmark.scene.background, 0, 0);
    drawContactShadow(context, frame);
    renderLandingCharacter(context, frame, benchmark, options);
  } finally {
    context.restore();
  }
}
