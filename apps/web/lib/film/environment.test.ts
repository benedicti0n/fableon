import { describe, expect, it } from "vitest";

import { evaluateCamera, type CameraTrack } from "@fableon/camera-engine";

import {
  assertEnvironmentLayerOrder,
  ENVIRONMENT_LAYERS,
  environmentLayerPoint,
} from "./environment";

const TRACK: CameraTrack = {
  id: "environment-test",
  world: { width: 2400, height: 1350 },
  keyframes: [
    { frame: 0, x: 1200, y: 675, zoom: 1, easing: "linear" },
    { frame: 100, x: 1400, y: 675, zoom: 1, easing: "linear" },
  ],
};

const VIEWPORT = { width: 1920, height: 1080 };
const WORLD = TRACK.world;
const CENTER = { x: 1200, y: 675 };

describe("layered parallax environment", () => {
  it("orders layers from distant to near and rejects invalid order", () => {
    expect(() => assertEnvironmentLayerOrder()).not.toThrow();
    expect(ENVIRONMENT_LAYERS.map((layer) => layer.id)).toEqual([
      "distant-forest",
      "midground-forest",
      "atmospheric-overlay",
    ]);
    expect(() => assertEnvironmentLayerOrder([...ENVIRONMENT_LAYERS].reverse())).toThrow();
  });

  it("moves distant layers less than midground layers during a camera pan", () => {
    const start = evaluateCamera(TRACK, 0);
    const end = evaluateCamera(TRACK, 100);
    const distant = ENVIRONMENT_LAYERS.find((layer) => layer.id === "distant-forest");
    const midground = ENVIRONMENT_LAYERS.find((layer) => layer.id === "midground-forest");
    expect(distant).toBeDefined();
    expect(midground).toBeDefined();
    if (!distant || !midground) return;

    const distantStart = environmentLayerPoint(start, VIEWPORT, WORLD, distant, CENTER);
    const distantEnd = environmentLayerPoint(end, VIEWPORT, WORLD, distant, CENTER);
    const midStart = environmentLayerPoint(start, VIEWPORT, WORLD, midground, CENTER);
    const midEnd = environmentLayerPoint(end, VIEWPORT, WORLD, midground, CENTER);

    expect(Math.abs(distantEnd.x - distantStart.x)).toBeLessThan(Math.abs(midEnd.x - midStart.x));
    expect(distantStart.y).toBeCloseTo(midStart.y, 8);
  });
});
