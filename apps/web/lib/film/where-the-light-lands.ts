import { evaluateCamera, type CameraState, type CameraTrack } from "@fableon/camera-engine";
import {
  flightPose,
  footPointsForPose,
  idlePose,
  landingPose,
  solveFootContact,
  type CharacterPose,
} from "@fableon/character-motion";
import {
  evaluateCompositionFrame,
  type CompositionFrame,
  type FilmComposition,
} from "@fableon/composition-core";

import { evaluateAmbientState, type AmbientState } from "./ambient";

export const FILM_WORLD = Object.freeze({ width: 2400, height: 1350 });
export const FILM_VIEWPORT = Object.freeze({ width: 1920, height: 1080 });
export const FILM_FPS = 24;
export const FILM_TOTAL_FRAMES = 720;
export const FILM_BRANCH_Y = 1250;
export const FILM_CONTACT_POINT = Object.freeze({ x: 1450, y: 1250 });
export const FILM_BIRD_SCALE = 2;
export const FILM_SPEC_VERSION = "where-the-light-lands-v1";

export const CAMERA_TRACKS: Readonly<Record<string, CameraTrack>> = Object.freeze({
  "camera-awakening": {
    id: "camera-awakening",
    world: FILM_WORLD,
    keyframes: [
      { frame: 0, x: 1180, y: 680, zoom: 1, easing: "easeInOutCubic" },
      { frame: 143, x: 1300, y: 710, zoom: 1.06, easing: "easeInOutCubic" },
    ],
  },
  "camera-flight": {
    id: "camera-flight",
    world: FILM_WORLD,
    keyframes: [
      { frame: 0, x: 980, y: 700, zoom: 1.02, easing: "easeInOutCubic" },
      { frame: 108, x: 1180, y: 780, zoom: 1.04, easing: "easeInOutCubic" },
      { frame: 215, x: 1360, y: 830, zoom: 1.03, easing: "easeInOutCubic" },
    ],
  },
  "camera-landing": {
    id: "camera-landing",
    world: FILM_WORLD,
    keyframes: [
      { frame: 0, x: 1300, y: 790, zoom: 1.04, easing: "easeInOutCubic" },
      { frame: 110, x: 1420, y: 830, zoom: 1.06, easing: "easeInOutCubic" },
      { frame: 167, x: 1450, y: 835, zoom: 1.07, easing: "easeInOutCubic" },
    ],
  },
  "camera-rest": {
    id: "camera-rest",
    world: FILM_WORLD,
    keyframes: [
      { frame: 0, x: 1450, y: 820, zoom: 1.07, easing: "easeInOutCubic" },
      { frame: 191, x: 1520, y: 840, zoom: 1.16, easing: "easeInOutCubic" },
    ],
  },
});

export const WHERE_THE_LIGHT_LANDS: FilmComposition = {
  id: "where-the-light-lands-30s",
  title: "Where the Light Lands",
  fps: FILM_FPS,
  width: FILM_VIEWPORT.width,
  height: FILM_VIEWPORT.height,
  seed: 20261110,
  shots: [
    {
      id: "shot-1",
      title: "Awakening Forest",
      startFrame: 0,
      frameCount: 144,
      sceneId: "forest-awakening",
      renderingMethod: "local-canvas",
      cameraTrackId: "camera-awakening",
      characterMotionId: null,
      transitionIn: { type: "fadeFromBlack", frames: 12 },
      transitionOut: null,
      notes: "Slow painterly forest reveal with drifting light and opening title.",
    },
    {
      id: "shot-2",
      title: "Little Bird in Flight",
      startFrame: 144,
      frameCount: 216,
      sceneId: "forest-flight",
      renderingMethod: "local-canvas",
      cameraTrackId: "camera-flight",
      characterMotionId: "flight",
      transitionIn: { type: "crossfade", frames: 12 },
      transitionOut: null,
      notes: "Articulated wing beats through layered forest with gentle camera follow.",
    },
    {
      id: "shot-3",
      title: "The Landing",
      startFrame: 360,
      frameCount: 168,
      sceneId: "forest-landing",
      renderingMethod: "local-canvas",
      cameraTrackId: "camera-landing",
      characterMotionId: "landing",
      transitionIn: { type: "crossfade", frames: 12 },
      transitionOut: null,
      notes: "Braking, leg extension, exact branch contact, compression, and wing fold.",
    },
    {
      id: "shot-4",
      title: "A Place to Rest",
      startFrame: 528,
      frameCount: 192,
      sceneId: "forest-rest",
      renderingMethod: "local-canvas",
      cameraTrackId: "camera-rest",
      characterMotionId: "idle",
      transitionIn: { type: "crossfade", frames: 12 },
      transitionOut: { type: "fadeToBlack", frames: 24 },
      notes: "Perched idle, breathing, blink, slow push-in, closing title, final fade.",
    },
  ],
  titles: [
    {
      id: "opening-title",
      text: "Where the Light Lands",
      startFrame: 24,
      endFrame: 108,
      fadeInFrames: 18,
      fadeOutFrames: 18,
      x: 960,
      y: 260,
      maxWidth: 1000,
      fontSize: 64,
      color: "#f8f5ed",
      align: "center",
    },
    {
      id: "ending-title",
      text: "Sometimes, the smallest journeys lead us home.",
      startFrame: 600,
      endFrame: 688,
      fadeInFrames: 18,
      fadeOutFrames: 18,
      x: 960,
      y: 900,
      maxWidth: 900,
      fontSize: 38,
      color: "#f8f5ed",
      align: "center",
    },
  ],
};

export interface FilmFrameState {
  readonly frame: number;
  readonly composition: CompositionFrame;
  readonly camera: CameraState;
  readonly character: CharacterPose | null;
  readonly footPoints: {
    readonly left: { readonly x: number; readonly y: number };
    readonly right: { readonly x: number; readonly y: number };
  } | null;
  readonly ambient: AmbientState;
}

export function evaluateFilmFrame(frame: number): FilmFrameState {
  const composition = evaluateCompositionFrame(WHERE_THE_LIGHT_LANDS, frame);
  const cameraTrack = CAMERA_TRACKS[composition.shot.cameraTrackId];
  if (!cameraTrack) {
    throw new Error(`Missing camera track "${composition.shot.cameraTrackId}".`);
  }
  const camera = evaluateCamera(cameraTrack, composition.localFrame, FILM_VIEWPORT);
  const character = characterForShot(composition);
  const footPoints = character === null ? null : feetForCharacter(character);
  return {
    frame,
    composition,
    camera,
    character,
    footPoints,
    ambient: evaluateAmbientState(frame, WHERE_THE_LIGHT_LANDS.seed),
  };
}

function characterForShot(composition: CompositionFrame): CharacterPose | null {
  switch (composition.shot.id) {
    case "shot-2":
      return flightPose({
        frame: composition.localFrame,
        startFrame: 0,
        endFrame: composition.shot.frameCount - 1,
        start: { x: 420, y: 640 },
        end: { x: 1150, y: 760 },
        scale: FILM_BIRD_SCALE,
        seed: 7,
      });
    case "shot-3": {
      const pose = landingPose({
        frame: composition.localFrame,
        startFrame: 0,
        endFrame: composition.shot.frameCount - 1,
        start: { x: 1100, y: 650 },
        end: FILM_CONTACT_POINT,
        contactPoint: FILM_CONTACT_POINT,
        contactFrame: 110,
        settleFrame: 150,
        scale: FILM_BIRD_SCALE,
        seed: 11,
      });
      return pose.contact ? solveFootContact(pose, FILM_BRANCH_Y).pose : pose;
    }
    case "shot-4": {
      const pose = idlePose({
        frame: composition.localFrame,
        position: FILM_CONTACT_POINT,
        scale: FILM_BIRD_SCALE,
        seed: 19,
      });
      return solveFootContact(pose, FILM_BRANCH_Y).pose;
    }
    default:
      return null;
  }
}

function feetForCharacter(character: CharacterPose): {
  readonly left: { readonly x: number; readonly y: number };
  readonly right: { readonly x: number; readonly y: number };
} {
  return footPointsForPose(character);
}

export function previousGlobalFrameForTransition(composition: CompositionFrame): number | null {
  const previous = composition.previousShot;
  return previous === null ? null : previous.startFrame + previous.frameCount - 1;
}
