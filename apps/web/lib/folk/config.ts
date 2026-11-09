import type { CameraEasing } from "@fableon/camera-engine";

export type FolkTransitionType = "cut" | "crossfade" | "fadeFromBlack" | "fadeToBlack";
export type FolkArtisanAction = "idle" | "walk" | "reach" | "watch";
export type FolkHorseAction = "idle" | "walk" | "nod";
export type FolkBellMode = "hidden" | "hand" | "harness" | "transfer";

export interface FolkCameraKeyframe {
  readonly frame: number;
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  readonly easing: CameraEasing;
}

export interface FolkTransition {
  readonly type: FolkTransitionType;
  readonly frames: number;
}

export interface FolkReachConfig {
  readonly targetX: number;
  readonly targetY: number;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly gripFrame: number;
  readonly releaseFrame: number;
}

export interface FolkArtisanConfig {
  readonly action: FolkArtisanAction;
  readonly fromX: number;
  readonly toX: number;
  readonly scale: number;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly speed: number;
  readonly bell: "hand" | "none";
  readonly reach?: FolkReachConfig;
}

export interface FolkHorseConfig {
  readonly action: FolkHorseAction;
  readonly fromX: number;
  readonly toX: number;
  readonly scale: number;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly speed: number;
  readonly nodStartFrame?: number;
}

export interface FolkCartConfig {
  readonly offsetX: number;
  readonly scale: number;
  readonly distanceStart: number;
  readonly speed: number;
  readonly wheelRadius: number;
}

export interface FolkBellConfig {
  readonly mode: FolkBellMode;
  readonly attachFrame?: number;
}

export interface FolkShot {
  readonly id: string;
  readonly title: string;
  readonly startFrame: number;
  readonly frameCount: number;
  readonly background: string;
  readonly camera: readonly FolkCameraKeyframe[];
  readonly transitionIn: FolkTransition;
  readonly transitionOut: FolkTransition | null;
  readonly artisan: FolkArtisanConfig | null;
  readonly horse: FolkHorseConfig | null;
  readonly cart: FolkCartConfig | null;
  readonly bell: FolkBellConfig;
  readonly notes: string;
}

export interface FolkTitle {
  readonly id: string;
  readonly text: string;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly fadeInFrames: number;
  readonly fadeOutFrames: number;
  readonly x: number;
  readonly y: number;
  readonly maxWidth: number;
  readonly fontSize: number;
  readonly color: string;
  readonly align: "left" | "center" | "right";
}

export interface FolkMotionConfig {
  readonly artisan: {
    readonly walkSpeed: number;
    readonly cycleSeconds: number;
    readonly bob: number;
    readonly armSwingDeg: number;
    readonly stepLift: number;
    readonly idleSwayDeg: number;
    readonly blinkIntervalFrames: number;
    readonly blinkDurationFrames: number;
    readonly headTurnDeg: number;
  };
  readonly horse: {
    readonly walkSpeed: number;
    readonly cycleSeconds: number;
    readonly bob: number;
    readonly stepLift: number;
    readonly headNodDeg: number;
    readonly tailSwayDeg: number;
    readonly legOffsets: {
      readonly nearFront: number;
      readonly farFront: number;
      readonly nearHind: number;
      readonly farHind: number;
    };
  };
  readonly cart: {
    readonly wheelRadius: number;
    readonly bounce: number;
  };
}

export interface FolkFilmConfig {
  readonly id: string;
  readonly title: string;
  readonly specVersion: string;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly world: { readonly width: number; readonly height: number };
  readonly groundY: number;
  readonly seed: number;
  readonly shots: readonly FolkShot[];
  readonly titles: readonly FolkTitle[];
  readonly motion: FolkMotionConfig;
}

export class FolkConfigError extends Error {
  override readonly name = "FolkConfigError";
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new FolkConfigError(message);
}

function finite(value: unknown, name: string, minimum?: number): number {
  assert(typeof value === "number" && Number.isFinite(value), `${name} must be a finite number.`);
  if (minimum !== undefined) assert(value >= minimum, `${name} must be at least ${minimum}.`);
  return value;
}

function integer(value: unknown, name: string, minimum = 0): number {
  assert(
    typeof value === "number" && Number.isInteger(value) && value >= minimum,
    `${name} must be an integer of at least ${minimum}.`,
  );
  return value;
}

function validateTransition(value: unknown, name: string): FolkTransition {
  assert(typeof value === "object" && value !== null, `${name} must be an object.`);
  const transition = value as Record<string, unknown>;
  const type = transition["type"];
  assert(
    type === "cut" || type === "crossfade" || type === "fadeFromBlack" || type === "fadeToBlack",
    `${name}.type is invalid.`,
  );
  const frames = integer(transition["frames"], `${name}.frames`);
  if (type === "cut") assert(frames === 0, `${name} must use 0 frames for a cut.`);
  else assert(frames > 0, `${name} requires at least one frame.`);
  return { type, frames };
}

export function parseFolkConfig(value: unknown): FolkFilmConfig {
  assert(typeof value === "object" && value !== null, "The folk film config must be an object.");
  const config = value as Record<string, unknown>;
  const fps = integer(config["fps"], "fps", 1);
  const width = integer(config["width"], "width", 1);
  const height = integer(config["height"], "height", 1);
  const worldValue = config["world"];
  assert(typeof worldValue === "object" && worldValue !== null, "world must be an object.");
  const world = worldValue as Record<string, unknown>;
  const worldWidth = finite(world["width"], "world.width", 1);
  const worldHeight = finite(world["height"], "world.height", 1);
  const shotsValue = config["shots"];
  assert(Array.isArray(shotsValue) && shotsValue.length > 0, "shots must be a non-empty array.");
  const shots = shotsValue.map((entry, index) => {
    assert(typeof entry === "object" && entry !== null, `shots[${index}] must be an object.`);
    const shot = entry as Record<string, unknown>;
    const startFrame = integer(shot["startFrame"], `shots[${index}].startFrame`);
    const frameCount = integer(shot["frameCount"], `shots[${index}].frameCount`, 1);
    const cameraValue = shot["camera"];
    assert(
      Array.isArray(cameraValue) && cameraValue.length > 0,
      `shots[${index}].camera is empty.`,
    );
    const camera = cameraValue.map((keyframeValue, keyframeIndex) => {
      assert(
        typeof keyframeValue === "object" && keyframeValue !== null,
        `shots[${index}].camera[${keyframeIndex}] is invalid.`,
      );
      const keyframe = keyframeValue as Record<string, unknown>;
      const easing = keyframe["easing"];
      assert(
        easing === "linear" || easing === "easeInOutCubic" || easing === "smooth",
        `shots[${index}].camera[${keyframeIndex}].easing is invalid.`,
      );
      return {
        frame: integer(keyframe["frame"], `shots[${index}].camera[${keyframeIndex}].frame`),
        x: finite(keyframe["x"], `shots[${index}].camera[${keyframeIndex}].x`),
        y: finite(keyframe["y"], `shots[${index}].camera[${keyframeIndex}].y`),
        zoom: finite(keyframe["zoom"], `shots[${index}].camera[${keyframeIndex}].zoom`, 0.01),
        easing: easing as FolkCameraKeyframe["easing"],
      };
    });
    const artisan = shot["artisan"] === null ? null : (shot["artisan"] as FolkArtisanConfig);
    const horse = shot["horse"] === null ? null : (shot["horse"] as FolkHorseConfig);
    return {
      id: String(shot["id"]),
      title: String(shot["title"]),
      startFrame,
      frameCount,
      background: String(shot["background"]),
      camera,
      transitionIn: validateTransition(shot["transitionIn"], `shots[${index}].transitionIn`),
      transitionOut:
        shot["transitionOut"] === null
          ? null
          : validateTransition(shot["transitionOut"], `shots[${index}].transitionOut`),
      artisan,
      horse,
      cart: shot["cart"] === null ? null : (shot["cart"] as FolkCartConfig),
      bell: shot["bell"] as FolkBellConfig,
      notes: String(shot["notes"] ?? ""),
    } satisfies FolkShot;
  });
  let expected = 0;
  for (const shot of shots) {
    assert(shot.startFrame === expected, `Shot "${shot.id}" must start at ${expected}.`);
    expected += shot.frameCount;
  }
  assert(expected === 720, `The folk pilot must contain exactly 720 frames; received ${expected}.`);
  assert(fps === 24, "The folk pilot must run at 24 fps.");
  assert(width === 1920 && height === 1080, "The folk pilot must target 1920x1080.");
  const titlesValue = config["titles"];
  assert(Array.isArray(titlesValue), "titles must be an array.");
  const titles = titlesValue.map((entry, index) => {
    assert(typeof entry === "object" && entry !== null, `titles[${index}] is invalid.`);
    const title = entry as Record<string, unknown>;
    return {
      id: String(title["id"]),
      text: String(title["text"]),
      startFrame: integer(title["startFrame"], `titles[${index}].startFrame`),
      endFrame: integer(title["endFrame"], `titles[${index}].endFrame`),
      fadeInFrames: integer(title["fadeInFrames"], `titles[${index}].fadeInFrames`),
      fadeOutFrames: integer(title["fadeOutFrames"], `titles[${index}].fadeOutFrames`),
      x: finite(title["x"], `titles[${index}].x`),
      y: finite(title["y"], `titles[${index}].y`),
      maxWidth: finite(title["maxWidth"], `titles[${index}].maxWidth`, 1),
      fontSize: finite(title["fontSize"], `titles[${index}].fontSize`, 1),
      color: String(title["color"]),
      align: title["align"] as FolkTitle["align"],
    } satisfies FolkTitle;
  });
  const motion = config["motion"] as FolkMotionConfig;
  assert(typeof motion === "object" && motion !== null, "motion must be an object.");
  return {
    id: String(config["id"]),
    title: String(config["title"]),
    specVersion: String(config["specVersion"]),
    fps,
    width,
    height,
    world: { width: worldWidth, height: worldHeight },
    groundY: finite(config["groundY"], "groundY"),
    seed: integer(config["seed"], "seed"),
    shots,
    titles,
    motion,
  };
}

export async function loadFolkConfig(
  url = "/assets/folk-pilot/film.json",
): Promise<FolkFilmConfig> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new FolkConfigError(`Could not load ${url} (HTTP ${response.status}).`);
  }
  return parseFolkConfig((await response.json()) as unknown);
}
