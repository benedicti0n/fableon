import { z } from "zod";

import {
  INTERPOLATION_MODES,
  PROJECT_CANVAS_HEIGHT,
  PROJECT_CANVAS_WIDTH,
  PROJECT_FORMAT,
  PROJECT_FRAME_RATE,
  PROJECT_MAX_SEED,
  PROJECT_SCHEMA_VERSION,
  TRANSFORM_PROPERTIES,
} from "./constants";

const finiteNumber = z.number().finite();
const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
    "IDs must start with a letter or digit and contain only letters, digits, underscores, or hyphens.",
  );
const displayNameSchema = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => value.trim().length > 0, "Names must not be blank.");
const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Colors must use six-digit hexadecimal notation (#RRGGBB).");
const nonNegativeInteger = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

function isSafeRelativeAssetPath(value: string): boolean {
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.includes("?") ||
    value.includes("#")
  ) {
    return false;
  }

  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) {
    return false;
  }

  return value
    .split("/")
    .every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

export const interpolationSchema = z.enum(INTERPOLATION_MODES);

export const transformSchema = z.strictObject({
  x: finiteNumber,
  y: finiteNumber,
  scaleX: finiteNumber,
  scaleY: finiteNumber,
  rotation: finiteNumber,
  opacity: finiteNumber.min(0).max(1),
});

export const keyframeSchema = z.strictObject({
  frame: nonNegativeInteger,
  value: finiteNumber,
  interpolation: interpolationSchema,
});

const orderedTrackSchema = z
  .strictObject({
    keyframes: z.array(keyframeSchema).min(1),
  })
  .superRefine((track, ctx) => {
    const seenFrames = new Set<number>();
    let previousFrame = -1;

    track.keyframes.forEach((keyframe, index) => {
      if (seenFrames.has(keyframe.frame)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate keyframe at frame ${keyframe.frame}.`,
          path: ["keyframes", index, "frame"],
        });
      } else if (keyframe.frame <= previousFrame) {
        ctx.addIssue({
          code: "custom",
          message: `Keyframes must be sorted in strictly ascending frame order; frame ${keyframe.frame} follows ${previousFrame}.`,
          path: ["keyframes", index, "frame"],
        });
      }

      seenFrames.add(keyframe.frame);
      previousFrame = Math.max(previousFrame, keyframe.frame);
    });
  });

const opacityTrackSchema = orderedTrackSchema.superRefine((track, ctx) => {
  track.keyframes.forEach((keyframe, index) => {
    if (keyframe.value < 0 || keyframe.value > 1) {
      ctx.addIssue({
        code: "custom",
        message: `Opacity keyframe values must be between 0 and 1; received ${keyframe.value}.`,
        path: ["keyframes", index, "value"],
      });
    }
  });
});

export const animationTrackSchema = orderedTrackSchema;

export const layerAnimationSchema = z.strictObject({
  x: orderedTrackSchema.optional(),
  y: orderedTrackSchema.optional(),
  scaleX: orderedTrackSchema.optional(),
  scaleY: orderedTrackSchema.optional(),
  rotation: orderedTrackSchema.optional(),
  opacity: opacityTrackSchema.optional(),
});

const layerBaseShape = {
  id: identifierSchema,
  name: displayNameSchema,
  visible: z.boolean(),
  order: nonNegativeInteger,
  transform: transformSchema,
  animation: layerAnimationSchema.optional(),
};

export const assetLayerSchema = z.strictObject({
  ...layerBaseShape,
  type: z.literal("asset"),
  assetId: identifierSchema,
});

export const textLayerSchema = z.strictObject({
  ...layerBaseShape,
  type: z.literal("text"),
  text: z.string().min(1).max(10_000),
  fontFamily: z.string().min(1).max(200),
  fontSize: finiteNumber.positive().max(10_000),
  color: colorSchema,
});

export const solidLayerSchema = z.strictObject({
  ...layerBaseShape,
  type: z.literal("solid"),
  color: colorSchema,
});

export const layerSchema = z.discriminatedUnion("type", [
  assetLayerSchema,
  textLayerSchema,
  solidLayerSchema,
]);

export const assetSchema = z.strictObject({
  id: identifierSchema,
  type: z.enum(["image", "audio", "video"]),
  name: displayNameSchema,
  path: z
    .string()
    .min(1)
    .max(512)
    .refine(
      isSafeRelativeAssetPath,
      "Asset paths must be safe relative POSIX paths without '..', absolute roots, URLs, backslashes, query strings, or fragments.",
    ),
});

export const sceneSchema = z
  .strictObject({
    id: identifierSchema,
    name: displayNameSchema,
    durationFrames: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    layers: z.array(layerSchema),
  })
  .superRefine((scene, ctx) => {
    const layerIds = new Set<string>();
    const layerOrders = new Set<number>();

    scene.layers.forEach((layer, layerIndex) => {
      if (layerIds.has(layer.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate layer ID "${layer.id}" within scene "${scene.id}".`,
          path: ["layers", layerIndex, "id"],
        });
      }
      layerIds.add(layer.id);

      if (layerOrders.has(layer.order)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate layer stacking order ${layer.order} within scene "${scene.id}".`,
          path: ["layers", layerIndex, "order"],
        });
      }
      layerOrders.add(layer.order);

      for (const property of TRANSFORM_PROPERTIES) {
        const track = layer.animation?.[property];

        track?.keyframes.forEach((keyframe, keyframeIndex) => {
          if (keyframe.frame >= scene.durationFrames) {
            ctx.addIssue({
              code: "custom",
              message: `Keyframe frame ${keyframe.frame} is outside scene "${scene.id}" (valid local frames: 0..${scene.durationFrames - 1}).`,
              path: [
                "layers",
                layerIndex,
                "animation",
                property,
                "keyframes",
                keyframeIndex,
                "frame",
              ],
            });
          }
        });
      }
    });
  });

export const canvasSchema = z.strictObject({
  width: z.literal(PROJECT_CANVAS_WIDTH),
  height: z.literal(PROJECT_CANVAS_HEIGHT),
});

export const projectSchema = z
  .strictObject({
    format: z.literal(PROJECT_FORMAT),
    schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
    id: identifierSchema,
    title: displayNameSchema,
    frameRate: z.literal(PROJECT_FRAME_RATE),
    canvas: canvasSchema,
    seed: z.number().int().min(0).max(PROJECT_MAX_SEED),
    assets: z.array(assetSchema),
    scenes: z.array(sceneSchema).min(1),
  })
  .superRefine((project, ctx) => {
    const sceneIds = new Set<string>();
    const assetIds = new Map<string, z.infer<typeof assetSchema>>();

    project.assets.forEach((asset, assetIndex) => {
      if (assetIds.has(asset.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate asset ID "${asset.id}".`,
          path: ["assets", assetIndex, "id"],
        });
      }
      assetIds.set(asset.id, asset);
    });

    project.scenes.forEach((scene, sceneIndex) => {
      if (sceneIds.has(scene.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate scene ID "${scene.id}".`,
          path: ["scenes", sceneIndex, "id"],
        });
      }
      sceneIds.add(scene.id);

      scene.layers.forEach((layer, layerIndex) => {
        if (layer.type !== "asset") {
          return;
        }

        const asset = assetIds.get(layer.assetId);

        if (!asset) {
          ctx.addIssue({
            code: "custom",
            message: `Layer "${layer.id}" references missing asset "${layer.assetId}".`,
            path: ["scenes", sceneIndex, "layers", layerIndex, "assetId"],
          });
          return;
        }

        if (asset.type === "audio") {
          ctx.addIssue({
            code: "custom",
            message: `Layer "${layer.id}" cannot use audio asset "${layer.assetId}" as visual content.`,
            path: ["scenes", sceneIndex, "layers", layerIndex, "assetId"],
          });
        }
      });
    });

    const totalFrames = project.scenes.reduce((sum, scene) => sum + scene.durationFrames, 0);
    if (!Number.isSafeInteger(totalFrames)) {
      ctx.addIssue({
        code: "custom",
        message: "Total project duration exceeds the safe integer frame range.",
        path: ["scenes"],
      });
    }
  });

export type Interpolation = z.infer<typeof interpolationSchema>;
export type Transform = z.infer<typeof transformSchema>;
export type Keyframe = z.infer<typeof keyframeSchema>;
export type AnimationTrack = z.infer<typeof animationTrackSchema>;
export type LayerAnimation = z.infer<typeof layerAnimationSchema>;
export type AssetLayer = z.infer<typeof assetLayerSchema>;
export type TextLayer = z.infer<typeof textLayerSchema>;
export type SolidLayer = z.infer<typeof solidLayerSchema>;
export type Layer = z.infer<typeof layerSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type AssetType = Asset["type"];
export type Canvas = z.infer<typeof canvasSchema>;
export type Project = z.infer<typeof projectSchema>;
export type TransformProperty = (typeof TRANSFORM_PROPERTIES)[number];
