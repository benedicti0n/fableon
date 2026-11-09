import { describe, expect, it } from "vitest";

import {
  CAMERA_TRACKS,
  evaluateFilmFrame,
  FILM_BRANCH_Y,
  FILM_TOTAL_FRAMES,
  previousGlobalFrameForTransition,
  WHERE_THE_LIGHT_LANDS,
} from "./where-the-light-lands";

describe("Where the Light Lands film specification", () => {
  it("declares exactly 720 frames at 24 fps across four shots", () => {
    expect(FILM_TOTAL_FRAMES).toBe(720);
    expect(WHERE_THE_LIGHT_LANDS.fps).toBe(24);
    expect(WHERE_THE_LIGHT_LANDS.shots).toHaveLength(4);
    expect(WHERE_THE_LIGHT_LANDS.shots.reduce((total, shot) => total + shot.frameCount, 0)).toBe(
      720,
    );
    expect(Object.keys(CAMERA_TRACKS)).toHaveLength(4);
  });

  it("maps every required boundary to the intended shot and local frame", () => {
    const boundaries = [
      [0, "shot-1", 0],
      [143, "shot-1", 143],
      [144, "shot-2", 0],
      [359, "shot-2", 215],
      [360, "shot-3", 0],
      [527, "shot-3", 167],
      [528, "shot-4", 0],
      [719, "shot-4", 191],
    ] as const;
    for (const [frame, shotId, localFrame] of boundaries) {
      const state = evaluateFilmFrame(frame);
      expect(state.composition.shot.id).toBe(shotId);
      expect(state.composition.localFrame).toBe(localFrame);
    }
  });

  it("animates camera, character wings, and the landing contact", () => {
    const openingStart = evaluateFilmFrame(0);
    const openingEnd = evaluateFilmFrame(143);
    expect(openingStart.character).toBeNull();
    expect(openingEnd.camera.zoom).toBeGreaterThan(openingStart.camera.zoom);

    const flightA = evaluateFilmFrame(150);
    const flightB = evaluateFilmFrame(190);
    expect(flightA.character).not.toBeNull();
    expect(flightB.character).not.toBeNull();
    expect(flightA.character?.x).not.toBe(flightB.character?.x);
    expect(
      Math.abs((flightA.character?.wingNear ?? 0) - (flightB.character?.wingNear ?? 0)),
    ).toBeGreaterThan(1);

    const beforeContact = evaluateFilmFrame(469);
    const atContact = evaluateFilmFrame(470);
    expect(beforeContact.character?.contact).toBe(false);
    expect(atContact.character?.contact).toBe(true);
    expect(atContact.footPoints).not.toBeNull();
    if (atContact.footPoints) {
      expect(Math.max(atContact.footPoints.left.y, atContact.footPoints.right.y)).toBeCloseTo(
        FILM_BRANCH_Y,
        6,
      );
    }

    const rest = evaluateFilmFrame(620);
    expect(rest.composition.shot.id).toBe("shot-4");
    expect(rest.character?.contact).toBe(true);
    expect(rest.composition.titles[0]?.id).toBe("ending-title");
  });

  it("crossfades from the previous shot without changing the global frame", () => {
    const state = evaluateFilmFrame(144);
    expect(state.composition.previousShot?.id).toBe("shot-1");
    expect(state.composition.previousOpacity).toBe(1);
    expect(state.composition.incomingOpacity).toBe(0);
    expect(previousGlobalFrameForTransition(state.composition)).toBe(143);
  });

  it("is deterministic and does not mutate the composition spec", () => {
    const before = JSON.stringify(WHERE_THE_LIGHT_LANDS);
    const first = evaluateFilmFrame(500);
    const second = evaluateFilmFrame(500);
    expect(second).toEqual(first);
    expect(JSON.stringify(WHERE_THE_LIGHT_LANDS)).toBe(before);
  });

  it("has a black opening, a black ending, and visible story frames between", () => {
    expect(evaluateFilmFrame(0).composition.blackOpacity).toBe(1);
    expect(evaluateFilmFrame(719).composition.blackOpacity).toBe(1);
    expect(evaluateFilmFrame(200).composition.blackOpacity).toBe(0);
    expect(evaluateFilmFrame(60).composition.titles[0]?.text).toBe("Where the Light Lands");
  });
});
