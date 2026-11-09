import { evaluateCamera, type CameraState, type CameraTrack } from "@fableon/camera-engine";
import {
  ARTISAN_RIG,
  CART_RIG,
  HORSE_RIG,
  artisanPose,
  cartPose,
  horsePose,
  resolveFolkPose,
  type FolkPose,
  type ResolvedFolkNode,
} from "@fableon/folk-motion";
import { transformPoint, type Matrix2D, type Vec2 } from "@fableon/sprite-motion";

import type { FolkFilmConfig, FolkShot, FolkTitle } from "./config";

export interface FolkActorPlacement {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export interface FolkActorState {
  readonly placement: FolkActorPlacement;
  readonly pose: FolkPose;
  readonly nodes: readonly ResolvedFolkNode[];
}

export interface FolkBellState {
  readonly visible: boolean;
  readonly placement: "hand" | "harness";
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rotation: number;
}

export interface FolkFrameState {
  readonly frame: number;
  readonly shot: FolkShot;
  readonly shotIndex: number;
  readonly localFrame: number;
  readonly globalFrame: number;
  readonly previousShot: FolkShot | null;
  readonly previousLocalFrame: number | null;
  readonly incomingOpacity: number;
  readonly previousOpacity: number;
  readonly blackOpacity: number;
  readonly camera: CameraState;
  readonly background: string;
  readonly titles: readonly (FolkTitle & { readonly opacity: number })[];
  readonly artisan: FolkActorState | null;
  readonly horse: FolkActorState | null;
  readonly cart: FolkActorState | null;
  readonly bell: FolkBellState | null;
}

export const ARTISAN_MASTER_FOOT_Y = 1020;
export const HORSE_MASTER_FOOT_Y = 894;
export const CART_MASTER_FOOT_Y = 760;

function mix(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function actorProgress(frame: number, startFrame: number, endFrame: number): number {
  if (endFrame <= startFrame) return 0;
  return clamp((frame - startFrame) / (endFrame - startFrame), 0, 1);
}

function placementFor(
  x: number,
  scale: number,
  groundY: number,
  masterFootY: number,
): FolkActorPlacement {
  return { x, y: groundY - masterFootY * scale, scale };
}

export function cameraTrackFor(shot: FolkShot, config: FolkFilmConfig): CameraTrack {
  return {
    id: `folk-camera-${shot.id}`,
    world: config.world,
    keyframes: shot.camera,
  };
}

export function evaluateFolkFrame(config: FolkFilmConfig, globalFrame: number): FolkFrameState {
  if (!Number.isInteger(globalFrame) || globalFrame < 0 || globalFrame >= 720) {
    throw new Error(`Folk frame must be an integer in 0..719; received ${globalFrame}.`);
  }
  const shotIndex = config.shots.findIndex(
    (shot) => globalFrame >= shot.startFrame && globalFrame < shot.startFrame + shot.frameCount,
  );
  const shot = config.shots[shotIndex];
  if (!shot) throw new Error(`No folk shot contains frame ${globalFrame}.`);
  const previousShot = shotIndex > 0 ? (config.shots[shotIndex - 1] ?? null) : null;
  const localFrame = globalFrame - shot.startFrame;
  const camera = evaluateCamera(cameraTrackFor(shot, config), localFrame, {
    width: config.width,
    height: config.height,
  });

  let incomingOpacity = 1;
  let previousOpacity = 0;
  let blackOpacity = 0;

  if (shot.transitionIn.type !== "cut" && localFrame < shot.transitionIn.frames) {
    const frames = shot.transitionIn.frames;
    const progress = frames <= 1 ? 1 : clamp(localFrame / (frames - 1), 0, 1);
    if (shot.transitionIn.type === "crossfade") {
      incomingOpacity = progress;
      previousOpacity = 1 - progress;
    } else if (shot.transitionIn.type === "fadeFromBlack") {
      incomingOpacity = progress;
      blackOpacity = 1 - progress;
    } else {
      incomingOpacity = progress;
      blackOpacity = 1 - progress;
    }
  }

  if (shot.transitionOut?.type === "fadeToBlack" && shot.transitionOut.frames > 0) {
    const fadeStart = shot.frameCount - shot.transitionOut.frames;
    if (localFrame >= fadeStart) {
      const progress =
        shot.transitionOut.frames <= 1
          ? 1
          : (localFrame - fadeStart) / (shot.transitionOut.frames - 1);
      blackOpacity = Math.max(blackOpacity, clamp(progress, 0, 1));
    }
  }

  let artisan: FolkActorState | null = null;
  if (shot.artisan) {
    const actor = shot.artisan;
    const progress = actorProgress(localFrame, actor.startFrame, actor.endFrame);
    const x = actor.action === "walk" ? mix(actor.fromX, actor.toX, progress) : actor.fromX;
    const placement = placementFor(x, actor.scale, config.groundY, ARTISAN_MASTER_FOOT_Y);
    const reach =
      actor.action === "reach" && actor.reach
        ? {
            target: {
              x: (actor.reach.targetX - placement.x) / placement.scale,
              y: (actor.reach.targetY - placement.y) / placement.scale,
            },
            startFrame: actor.reach.startFrame,
            endFrame: actor.reach.endFrame,
            gripFrame: actor.reach.gripFrame,
            releaseFrame: actor.reach.releaseFrame,
          }
        : undefined;
    const pose = artisanPose({
      action: actor.action,
      frame: localFrame,
      globalFrame,
      scale: actor.scale,
      config: { ...config.motion.artisan, walkSpeed: actor.speed },
      ...(reach ? { reach } : {}),
    });
    artisan = { placement, pose, nodes: resolveFolkPose(ARTISAN_RIG, pose) };
  }

  let horse: FolkActorState | null = null;
  if (shot.horse) {
    const actor = shot.horse;
    const progress = actorProgress(localFrame, actor.startFrame, actor.endFrame);
    const x = actor.action === "walk" ? mix(actor.fromX, actor.toX, progress) : actor.fromX;
    const placement = placementFor(x, actor.scale, config.groundY, HORSE_MASTER_FOOT_Y);
    const pose = horsePose({
      action: actor.action,
      frame: localFrame,
      globalFrame,
      scale: actor.scale,
      config: { ...config.motion.horse, walkSpeed: actor.speed },
      ...(actor.nodStartFrame !== undefined ? { nodStartFrame: actor.nodStartFrame } : {}),
    });
    horse = { placement, pose, nodes: resolveFolkPose(HORSE_RIG, pose) };
  }

  let cart: FolkActorState | null = null;
  if (shot.cart) {
    const cartConfig = shot.cart;
    const x = horse ? horse.placement.x + cartConfig.offsetX : cartConfig.offsetX;
    const placement = placementFor(x, cartConfig.scale, config.groundY, CART_MASTER_FOOT_Y);
    const distance = cartConfig.distanceStart + cartConfig.speed * (localFrame / config.fps);
    const wheelDegrees =
      (distance / Math.max(1, cartConfig.wheelRadius * cartConfig.scale)) * (180 / Math.PI);
    const pose = cartPose({
      frame: localFrame,
      wheelDegrees,
      bounce: config.motion.cart.bounce,
    });
    cart = { placement, pose, nodes: resolveFolkPose(CART_RIG, pose) };
  }

  const bell = evaluateBell(config, shot, globalFrame, localFrame, artisan, horse);

  return {
    frame: globalFrame,
    shot,
    shotIndex,
    localFrame,
    globalFrame,
    previousShot,
    previousLocalFrame: previousShot ? previousShot.frameCount - 1 : null,
    incomingOpacity,
    previousOpacity,
    blackOpacity,
    camera,
    background: shot.background,
    titles: evaluateTitles(config, globalFrame),
    artisan,
    horse,
    cart,
    bell,
  };
}

function placementPoint(placement: FolkActorPlacement, point: Vec2): Vec2 {
  return {
    x: placement.x + point.x * placement.scale,
    y: placement.y + point.y * placement.scale,
  };
}

function nodePoint(node: ResolvedFolkNode | undefined, point: Vec2): Vec2 {
  if (!node) return point;
  return transformPoint(node.world, point);
}

function evaluateBell(
  config: FolkFilmConfig,
  shot: FolkShot,
  globalFrame: number,
  localFrame: number,
  artisan: FolkActorState | null,
  horse: FolkActorState | null,
): FolkBellState | null {
  const mode = shot.bell.mode;
  if (mode === "hidden") return null;
  const transferAttached =
    mode === "transfer" &&
    shot.bell.attachFrame !== undefined &&
    localFrame >= shot.bell.attachFrame;
  const attached = mode === "harness" || transferAttached;
  if (attached) {
    if (!horse) return null;
    const anchor = horse.nodes.find((node) => node.id === "harnessAnchor");
    const local = nodePoint(anchor, { x: 930, y: 452 });
    const point = placementPoint(horse.placement, local);
    return {
      visible: true,
      placement: "harness",
      x: point.x,
      y: point.y,
      scale: 0.38,
      rotation: Math.sin((globalFrame / config.fps) * Math.PI * 2 * 0.8) * 3.2,
    };
  }
  if (!artisan) return null;
  const hand =
    artisan.nodes.find((node) => node.id === "handGrip") ??
    artisan.nodes.find((node) => node.id === "handOpen");
  const local = nodePoint(hand, { x: 548, y: 742 });
  const point = placementPoint(artisan.placement, local);
  return {
    visible: true,
    placement: "hand",
    x: point.x,
    y: point.y,
    scale: 0.38,
    rotation: Math.sin((globalFrame / config.fps) * Math.PI * 2 * 0.7) * 2.4 - 4,
  };
}

function evaluateTitles(
  config: FolkFilmConfig,
  globalFrame: number,
): readonly (FolkTitle & { readonly opacity: number })[] {
  const active: (FolkTitle & { opacity: number })[] = [];
  for (const title of config.titles) {
    if (globalFrame < title.startFrame || globalFrame > title.endFrame) continue;
    const fadeIn =
      title.fadeInFrames <= 0
        ? 1
        : Math.min((globalFrame - title.startFrame + 1) / title.fadeInFrames, 1);
    const fadeOut =
      title.fadeOutFrames <= 0
        ? 1
        : Math.min((title.endFrame - globalFrame + 1) / title.fadeOutFrames, 1);
    active.push({ ...title, opacity: Math.min(fadeIn, fadeOut, 1) });
  }
  return active;
}

export function previousFolkFrame(state: FolkFrameState): number | null {
  return state.previousShot
    ? state.previousShot.startFrame + state.previousShot.frameCount - 1
    : null;
}

export type FolkTransform = Matrix2D;
