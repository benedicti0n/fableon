import type { PreparedImageImport } from "./browser-import";
import type {
  IllustrationPack,
  IllustrationPart,
  IllustrationProvenance,
  IllustrationTransform,
} from "./schema";
import { partDrawOffset, validateIllustrationPack } from "./schema";
import { roleKey } from "./character";

export interface EnvironmentLayerTemplate {
  readonly id: string;
  readonly name: string;
  readonly category: IllustrationPart["category"];
  readonly zIndex: number;
  readonly recommended: boolean;
  readonly description: string;
}

export const ENVIRONMENT_LAYER_TEMPLATE: readonly EnvironmentLayerTemplate[] = Object.freeze([
  {
    id: "sky",
    name: "Sky",
    category: "background",
    zIndex: 0,
    recommended: true,
    description: "Full background plate, sky, or atmospheric base.",
  },
  {
    id: "distant-forest",
    name: "Distant forest",
    category: "background",
    zIndex: 10,
    recommended: true,
    description: "Low-contrast distant tree line and haze.",
  },
  {
    id: "midground-trees",
    name: "Midground trees",
    category: "midground",
    zIndex: 20,
    recommended: true,
    description: "Midground trunks and canopy masses.",
  },
  {
    id: "foreground-trees",
    name: "Foreground trees",
    category: "foreground",
    zIndex: 30,
    recommended: false,
    description: "Transparent foreground framing foliage.",
  },
  {
    id: "landing-branch",
    name: "Landing branch",
    category: "prop",
    zIndex: 40,
    recommended: true,
    description: "Independent branch or interaction prop.",
  },
  {
    id: "atmospheric-light",
    name: "Atmospheric light",
    category: "atmosphere",
    zIndex: 50,
    recommended: false,
    description: "Transparent light shafts, mist, or glow overlay.",
  },
  {
    id: "foreground-details",
    name: "Foreground details",
    category: "foreground",
    zIndex: 60,
    recommended: false,
    description: "Small transparent leaves, dust, or framing details.",
  },
]);

export function environmentTemplateFor(role: string): EnvironmentLayerTemplate | undefined {
  const key = roleKey(role);
  return ENVIRONMENT_LAYER_TEMPLATE.find((template) => roleKey(template.id) === key);
}

export function createEmptyEnvironmentPack(input: {
  readonly id: string;
  readonly name: string;
  readonly canvas?: { readonly width: number; readonly height: number };
}): IllustrationPack {
  return {
    format: "fableon.illustration-pack",
    version: 1,
    id: input.id,
    name: input.name,
    kind: "environment",
    canvas: input.canvas ?? { width: 1920, height: 1080 },
    parts: [],
  };
}

function safeSourceFileName(fileName: string): string {
  const cleaned = fileName.replace(/[^A-Za-z0-9._-]/g, "-").replace(/-+/g, "-");
  const withExtension = /\.[A-Za-z0-9]+$/.test(cleaned) ? cleaned : `${cleaned}.png`;
  return withExtension.startsWith(".") ? `imported${withExtension}` : withExtension;
}

export interface AssignEnvironmentLayerOptions {
  readonly role: string;
  readonly imported: PreparedImageImport;
  readonly registration?: { readonly x: number; readonly y: number };
  readonly transform?: IllustrationTransform;
  readonly provenance?: IllustrationProvenance;
  readonly alphaThreshold?: number;
  readonly originalSource?: string;
}

export function createEnvironmentPartFromImport(
  options: AssignEnvironmentLayerOptions,
): IllustrationPart {
  const template = environmentTemplateFor(options.role);
  if (!template) {
    throw new Error(`Unknown environment layer role "${options.role}".`);
  }

  const imported = options.imported;
  const originalFileName = safeSourceFileName(imported.inspection.fileName);

  return {
    id: template.id,
    name: template.name,
    category: template.category,
    source: `assets/${template.id}.png`,
    originalSource: options.originalSource ?? `source/${template.id}-${originalFileName}`,
    originalSize: {
      width: imported.inspection.width,
      height: imported.inspection.height,
    },
    preparedSize: {
      width: imported.preparedWidth,
      height: imported.preparedHeight,
    },
    registration: options.registration ?? { x: 0, y: 0 },
    pivot: {
      space: "source",
      x: imported.inspection.width / 2,
      y: imported.inspection.height / 2,
    },
    preparedOffset: {
      x: imported.preparedOffsetX,
      y: imported.preparedOffsetY,
    },
    trim: {
      applied: imported.trim.applied,
      alphaThreshold: options.alphaThreshold ?? 0,
      contentBounds: imported.trim.contentBounds,
    },
    alpha: imported.inspection.analysis.hasAlpha ? "required" : "opaque",
    parentId: null,
    zIndex: template.zIndex,
    role: template.id,
    ...(options.transform ? { transform: options.transform } : {}),
    hashes: {
      algorithm: "sha256",
      source: imported.inspection.sourceHash,
      prepared: imported.preparedHash,
    },
    provenance: options.provenance ?? {
      kind: "user-created",
      notes: `Imported from ${imported.inspection.fileName}.`,
    },
  };
}

export function assignEnvironmentLayer(
  pack: IllustrationPack,
  options: AssignEnvironmentLayerOptions,
): IllustrationPack {
  const part = createEnvironmentPartFromImport(options);
  const existingIndex = pack.parts.findIndex(
    (candidate) => roleKey(candidate.id) === roleKey(part.id),
  );
  const parts =
    existingIndex === -1
      ? [...pack.parts, part]
      : pack.parts.map((candidate, index) => (index === existingIndex ? part : candidate));

  return { ...pack, parts };
}

export function updateEnvironmentLayerOrder(
  pack: IllustrationPack,
  partId: string,
  zIndex: number,
): IllustrationPack {
  return {
    ...pack,
    parts: pack.parts.map((part) => (part.id === partId ? { ...part, zIndex } : part)),
  };
}

export interface EnvironmentPreparationIssue {
  readonly code: string;
  readonly severity: "error" | "warning";
  readonly path: string;
  readonly message: string;
}

export interface EnvironmentPreparationReport {
  readonly ready: boolean;
  readonly missingRecommendedRoles: readonly string[];
  readonly issues: readonly EnvironmentPreparationIssue[];
}

export function validateEnvironmentPreparation(
  pack: IllustrationPack,
): EnvironmentPreparationReport {
  const validation = validateIllustrationPack(pack);
  if (!validation.ok) {
    return {
      ready: false,
      missingRecommendedRoles: ENVIRONMENT_LAYER_TEMPLATE.map((template) => template.id),
      issues: validation.issues.map((issue) => ({
        code: `schema.${issue.code}`,
        severity: "error",
        path: issue.path,
        message: issue.message,
      })),
    };
  }

  const issues: EnvironmentPreparationIssue[] = [];
  const missingRecommendedRoles = ENVIRONMENT_LAYER_TEMPLATE.filter(
    (template) =>
      template.recommended &&
      !validation.pack.parts.some(
        (part) =>
          roleKey(part.id) === roleKey(template.id) ||
          (part.role !== undefined && roleKey(part.role) === roleKey(template.id)),
      ),
  ).map((template) => template.id);

  for (const role of missingRecommendedRoles) {
    issues.push({
      code: "missing-recommended-layer",
      severity: "warning",
      path: `parts.${role}`,
      message: `Recommended environment layer "${role}" is missing. A single background plate is still valid.`,
    });
  }

  if (validation.pack.kind !== "environment" && validation.pack.kind !== "mixed") {
    issues.push({
      code: "pack-kind-mismatch",
      severity: "warning",
      path: "kind",
      message: `Environment packs normally use kind "environment"; received "${validation.pack.kind}".`,
    });
  }

  const hasBackground = validation.pack.parts.some(
    (part) =>
      part.category === "background" ||
      roleKey(part.id) === "sky" ||
      roleKey(part.id) === "distantforest",
  );
  if (!hasBackground) {
    issues.push({
      code: "missing-background",
      severity: "error",
      path: "parts",
      message:
        "An environment pack requires at least one background plate or background-category layer.",
    });
  }

  for (const part of validation.pack.parts) {
    if (
      (part.category === "foreground" || part.category === "atmosphere") &&
      part.alpha === "opaque"
    ) {
      issues.push({
        code: "opaque-overlay",
        severity: "error",
        path: `parts.${part.id}.alpha`,
        message: `${part.category} layer "${part.id}" is opaque and would hide the character or scene beneath it.`,
      });
    }

    if (part.category === "prop" && part.alpha === "opaque") {
      issues.push({
        code: "opaque-prop",
        severity: "warning",
        path: `parts.${part.id}.alpha`,
        message: `Prop layer "${part.id}" is opaque; confirm that this is a full-frame prop rather than a transparent interaction element.`,
      });
    }

    const template = environmentTemplateFor(part.role ?? part.id);
    if (template && part.zIndex !== template.zIndex) {
      issues.push({
        code: "depth-order-differs",
        severity: "warning",
        path: `parts.${part.id}.zIndex`,
        message: `Layer "${part.id}" uses zIndex ${part.zIndex}; the template recommends ${template.zIndex}. The explicit order is preserved.`,
      });
    }

    if (!part.hashes) {
      issues.push({
        code: "missing-hash",
        severity: "warning",
        path: `parts.${part.id}.hashes`,
        message: `Layer "${part.id}" has no source/prepared hashes.`,
      });
    }

    if (
      part.registration.x < 0 ||
      part.registration.y < 0 ||
      part.registration.x > validation.pack.canvas.width ||
      part.registration.y > validation.pack.canvas.height
    ) {
      issues.push({
        code: "registration-outside-canvas",
        severity: "warning",
        path: `parts.${part.id}.registration`,
        message: `Layer "${part.id}" registers outside the pack canvas.`,
      });
    }
  }

  return {
    ready: !issues.some((issue) => issue.severity === "error"),
    missingRecommendedRoles,
    issues,
  };
}

export interface EnvironmentRenderCommand {
  readonly part: IllustrationPart;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly transform: IllustrationTransform;
}

const IDENTITY_TRANSFORM: IllustrationTransform = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  opacity: 1,
};

export function createEnvironmentRenderPlan(
  pack: IllustrationPack,
): readonly EnvironmentRenderCommand[] {
  return [...pack.parts]
    .sort((left, right) => left.zIndex - right.zIndex || left.id.localeCompare(right.id))
    .map((part) => {
      const offset = partDrawOffset(part);
      const transform = part.transform ?? IDENTITY_TRANSFORM;
      return {
        part,
        x: offset.x + transform.x,
        y: offset.y + transform.y,
        width: part.preparedSize.width,
        height: part.preparedSize.height,
        transform,
      };
    });
}

export interface EnvironmentRenderOptions {
  readonly hiddenPartIds?: readonly string[];
}

export class EnvironmentRenderError extends Error {
  override readonly name = "EnvironmentRenderError";
  readonly missingPartIds: readonly string[];

  constructor(missingPartIds: readonly string[]) {
    super(`No decoded image was supplied for environment layer(s): ${missingPartIds.join(", ")}.`);
    this.missingPartIds = missingPartIds;
  }
}

export function renderEnvironmentPack(
  context: CanvasRenderingContext2D,
  pack: IllustrationPack,
  images: ReadonlyMap<string, CanvasImageSource>,
  options: EnvironmentRenderOptions = {},
): readonly EnvironmentRenderCommand[] {
  const hidden = new Set(options.hiddenPartIds ?? []);
  const plan = createEnvironmentRenderPlan(pack);
  const missing = plan
    .filter((command) => !hidden.has(command.part.id) && !images.has(command.part.id))
    .map((command) => command.part.id);

  if (missing.length > 0) {
    throw new EnvironmentRenderError(missing);
  }

  context.save();
  try {
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    for (const command of plan) {
      if (hidden.has(command.part.id)) {
        continue;
      }
      const image = images.get(command.part.id);
      if (!image) {
        continue;
      }

      context.save();
      try {
        context.globalAlpha = command.transform.opacity;
        context.translate(command.x, command.y);
        context.rotate((command.transform.rotation * Math.PI) / 180);
        context.scale(command.transform.scaleX, command.transform.scaleY);
        context.drawImage(image, 0, 0, command.width, command.height);
      } finally {
        context.restore();
      }
    }
  } finally {
    context.restore();
  }

  return plan;
}
