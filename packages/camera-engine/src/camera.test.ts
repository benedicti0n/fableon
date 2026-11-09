import { describe, expect, it } from "vitest";

import {
  applyCameraMatrix,
  CameraError,
  CANONICAL_VIEWPORT,
  evaluateCamera,
  layerCameraMatrix,
  screenToWorld,
  worldToScreen,
  type CameraTrack,
} from "./index";

const TRACK: CameraTrack = {
  id: "camera-test",
  world: { width: 2400, height: 1350 },
  keyframes: [
    { frame: 0, x: 1000, y: 675, zoom: 1, easing: "linear" },
    { frame: 100, x: 1400, y: 700, zoom: 1.2, easing: "linear" },
  ],
};

describe("camera engine", () => {
  it("interpolates pan and zoom deterministically", () => {
    const state = evaluateCamera(TRACK, 50);
    expect(state.centerX).toBeCloseTo(1200, 10);
    expect(state.centerY).toBeCloseTo(687.5, 10);
    expect(state.zoom).toBeCloseTo(1.1, 10);
    expect(evaluateCamera(TRACK, 50)).toEqual(state);
  });

  it("clamps the camera center so the viewport stays inside the world", () => {
    const left = evaluateCamera(
      {
        ...TRACK,
        keyframes: [{ frame: 0, x: -500, y: -500, zoom: 1 }],
      },
      0,
    );
    expect(left.centerX).toBe(960);
    expect(left.centerY).toBe(540);

    const right = evaluateCamera(
      {
        ...TRACK,
        keyframes: [{ frame: 0, x: 5000, y: 5000, zoom: 1 }],
      },
      0,
    );
    expect(right.centerX).toBe(1440);
    expect(right.centerY).toBe(810);
  });

  it("maps world and screen coordinates in both directions", () => {
    const camera = evaluateCamera(TRACK, 100);
    const center = worldToScreen(camera, CANONICAL_VIEWPORT, {
      x: camera.centerX,
      y: camera.centerY,
    });
    expect(center).toEqual({ x: 960, y: 540 });
    const world = screenToWorld(camera, CANONICAL_VIEWPORT, { x: 1200, y: 600 });
    expect(world.x).toBeCloseTo(camera.centerX + 240 / camera.zoom, 10);
    expect(world.y).toBeCloseTo(camera.centerY + 60 / camera.zoom, 10);
  });

  it("moves near layers more than far layers during a camera pan", () => {
    const start = evaluateCamera(TRACK, 0);
    const end = evaluateCamera(TRACK, 100);
    const worldCenter = { x: 1200, y: 675 };
    const farStart = applyCameraMatrix(
      layerCameraMatrix(start, CANONICAL_VIEWPORT, TRACK.world, 0.2),
      worldCenter,
    );
    const farEnd = applyCameraMatrix(
      layerCameraMatrix(end, CANONICAL_VIEWPORT, TRACK.world, 0.2),
      worldCenter,
    );
    const nearStart = applyCameraMatrix(
      layerCameraMatrix(start, CANONICAL_VIEWPORT, TRACK.world, 1),
      worldCenter,
    );
    const nearEnd = applyCameraMatrix(
      layerCameraMatrix(end, CANONICAL_VIEWPORT, TRACK.world, 1),
      worldCenter,
    );
    expect(Math.abs(farEnd.x - farStart.x)).toBeLessThan(Math.abs(nearEnd.x - nearStart.x));
    expect(Math.abs(farEnd.y - farStart.y)).toBeLessThan(Math.abs(nearEnd.y - nearStart.y));
  });

  it("keeps adjacent frames continuous and rejects invalid input", () => {
    const frame99 = evaluateCamera(TRACK, 99);
    const frame100 = evaluateCamera(TRACK, 100);
    expect(Math.abs(frame100.centerX - frame99.centerX)).toBeLessThan(5);
    expect(Math.abs(frame100.zoom - frame99.zoom)).toBeLessThan(0.01);
    expect(() => evaluateCamera(TRACK, -1)).toThrow(CameraError);
    expect(() => evaluateCamera(TRACK, 1.5)).toThrow(CameraError);
    expect(() =>
      evaluateCamera(
        {
          ...TRACK,
          keyframes: [
            { frame: 10, x: 0, y: 0, zoom: 1 },
            { frame: 5, x: 0, y: 0, zoom: 1 },
          ],
        },
        0,
      ),
    ).toThrow(CameraError);
  });
});
