import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ARTISAN_RIG, BELL_RIG, CART_RIG, HORSE_RIG } from "@fableon/folk-motion";

import { parseFolkConfig } from "./config";
import { evaluateFolkFrame } from "./evaluate";

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(path.join(process.cwd(), relativePath), "utf8")) as unknown;
}

const film = parseFolkConfig(readJson("apps/web/public/assets/folk-pilot/film.json"));
const variation = parseFolkConfig(
  readJson("apps/web/public/assets/folk-pilot/film-variation.json"),
);
const manifest = readJson("apps/web/public/assets/folk-pilot/manifest.json") as {
  readonly parts: readonly { readonly id: string }[];
};

describe("folk film contract", () => {
  it("has exactly five contiguous shots and 720 frames", () => {
    expect(film.shots).toHaveLength(5);
    expect(film.shots.map((shot) => shot.startFrame)).toEqual([0, 120, 264, 432, 600]);
    expect(film.shots.reduce((sum, shot) => sum + shot.frameCount, 0)).toBe(720);
    expect(film.fps).toBe(24);
    expect(film.width).toBe(1920);
    expect(film.height).toBe(1080);
  });

  it("has a unique transparent part for every rig node", () => {
    const ids = new Set(manifest.parts.map((part) => part.id));
    expect(ids.size).toBe(manifest.parts.length);
    for (const rig of [ARTISAN_RIG, HORSE_RIG, CART_RIG, BELL_RIG]) {
      for (const node of rig.nodes) {
        expect(ids.has(node.partId), `${rig.id}.${node.id} -> ${node.partId}`).toBe(true);
      }
    }
  });

  it("carries one artisan, one horse, one cart, and one bell through the film", () => {
    const artisanXs = film.shots
      .map((shot) => shot.artisan)
      .filter((actor) => actor !== null)
      .map((actor) => actor.fromX);
    expect(artisanXs.length).toBeGreaterThanOrEqual(4);
    expect(film.shots.filter((shot) => shot.horse !== null).length).toBe(3);
    expect(film.shots.filter((shot) => shot.cart !== null).length).toBe(3);
  });
});

describe("folk frame evaluation", () => {
  it("walks the artisan into the courtyard in shot 2", () => {
    const start = evaluateFolkFrame(film, 120);
    const end = evaluateFolkFrame(film, 263);
    expect(start.artisan?.placement.x).toBeCloseTo(150, 3);
    expect(end.artisan?.placement.x).toBeCloseTo(680, 3);
    expect(start.horse).toBeNull();
    expect(end.horse).toBeNull();
  });

  it("keeps the horse and cart attached by the configured shaft offset", () => {
    const state = evaluateFolkFrame(film, 340);
    expect(state.horse).not.toBeNull();
    expect(state.cart).not.toBeNull();
    expect((state.cart?.placement.x ?? 0) - (state.horse?.placement.x ?? 0)).toBeCloseTo(-275, 3);
  });

  it("transfers the bell from the hand to the harness at the attach frame", () => {
    const before = evaluateFolkFrame(film, 500);
    const after = evaluateFolkFrame(film, 520);
    expect(before.bell?.placement).toBe("hand");
    expect(after.bell?.placement).toBe("harness");
    expect(after.bell?.x).toBeCloseTo(1039.4, 3);
  });

  it("presents incoming actors at full opacity on the first crossfade frame", () => {
    const state = evaluateFolkFrame(film, 600);
    expect(state.previousOpacity).toBe(1);
    expect(state.incomingOpacity).toBe(0);
    expect(state.artisan?.placement.x).toBe(220);
    expect(state.horse?.placement.x).toBe(800);
    expect(state.cart?.placement.x).toBe(525);
    expect(state.bell?.placement).toBe("harness");
  });
});

describe("folk reusability configuration", () => {
  it("changes walking speed, reach target, horse gait timing, and camera by data only", () => {
    expect(variation.motion.artisan.walkSpeed).not.toBe(film.motion.artisan.walkSpeed);
    expect(variation.motion.horse.cycleSeconds).not.toBe(film.motion.horse.cycleSeconds);
    expect(variation.shots[3]?.artisan?.reach?.targetX).not.toBe(
      film.shots[3]?.artisan?.reach?.targetX,
    );
    expect(variation.shots[2]?.camera[0]?.zoom).not.toBe(film.shots[2]?.camera[0]?.zoom);
  });

  it("reuses the same asset pack for the variation", () => {
    expect(variation.id).not.toBe(film.id);
    expect(variation.shots).toHaveLength(film.shots.length);
    expect(variation.motion.cart).toEqual(film.motion.cart);
  });
});
