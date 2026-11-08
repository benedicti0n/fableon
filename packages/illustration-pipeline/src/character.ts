import type { IllustrationPack, IllustrationPart, IllustrationProvenance } from "./schema";
import { validateIllustrationPack } from "./schema";
import type { PreparedImageImport } from "./browser-import";
import { DEFAULT_TRIM_ALPHA_THRESHOLD } from "./constants";

export interface CharacterPartTemplate {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly zIndex: number;
  readonly required: boolean;
  readonly description: string;
}

/**
 * The Phase 2.5 rig template. This is a recommendation for storybook birds and
 * a compatibility contract for the benchmark-local landing rig, not a hard
 * schema limit for every future character.
 */
export const CHARACTER_RIG_TEMPLATE: readonly CharacterPartTemplate[] = Object.freeze([
  {
    id: "body",
    name: "Body",
    parentId: null,
    zIndex: 50,
    required: true,
    description: "Torso, breast, back, and primary body feather groups.",
  },
  {
    id: "head",
    name: "Head",
    parentId: "body",
    zIndex: 70,
    required: true,
    description: "Skull, cheek, crown, and neck attachment.",
  },
  {
    id: "eye",
    name: "Eye",
    parentId: "head",
    zIndex: 85,
    required: true,
    description: "Eye artwork, normally transparent except for the iris and ring.",
  },
  {
    id: "beak",
    name: "Beak",
    parentId: "head",
    zIndex: 80,
    required: true,
    description: "Upper and lower beak.",
  },
  {
    id: "wing-far",
    name: "Far wing",
    parentId: "body",
    zIndex: 20,
    required: true,
    description: "Recessed wing and its hidden-side attachment.",
  },
  {
    id: "wing-near",
    name: "Near wing",
    parentId: "body",
    zIndex: 60,
    required: true,
    description: "Foreground wing with layered primary feathers.",
  },
  {
    id: "tail",
    name: "Tail",
    parentId: "body",
    zIndex: 10,
    required: true,
    description: "Tail feather fan and rump attachment.",
  },
  {
    id: "leg-left",
    name: "Left leg",
    parentId: "body",
    zIndex: 30,
    required: true,
    description: "Far leg, foot, and toes.",
  },
  {
    id: "leg-right",
    name: "Right leg",
    parentId: "body",
    zIndex: 31,
    required: true,
    description: "Near leg, foot, and toes.",
  },
]);

export function roleKey(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
}

export function templatePartFor(templateId: string): CharacterPartTemplate | undefined {
  const key = roleKey(templateId);
  return CHARACTER_RIG_TEMPLATE.find((part) => roleKey(part.id) === key);
}

export function findTemplatePart(
  pack: IllustrationPack,
  template: CharacterPartTemplate,
): IllustrationPart | undefined {
  const key = roleKey(template.id);
  return pack.parts.find(
    (part) => roleKey(part.id) === key || (part.role && roleKey(part.role) === key),
  );
}

export function createEmptyCharacterPack(input: {
  readonly id: string;
  readonly name: string;
  readonly canvas?: { readonly width: number; readonly height: number };
}): IllustrationPack {
  return {
    format: "fableon.illustration-pack",
    version: 1,
    id: input.id,
    name: input.name,
    kind: "character",
    canvas: input.canvas ?? { width: 1024, height: 1024 },
    parts: [],
  };
}

function safeSourceFileName(fileName: string): string {
  const cleaned = fileName.replace(/[^A-Za-z0-9._-]/g, "-").replace(/-+/g, "-");
  const withExtension = /\.[A-Za-z0-9]+$/.test(cleaned) ? cleaned : `${cleaned}.png`;
  return withExtension.startsWith(".") ? `imported${withExtension}` : withExtension;
}

export interface CreateCharacterPartOptions {
  readonly templateId: string;
  readonly imported: PreparedImageImport;
  readonly registration?: { readonly x: number; readonly y: number };
  readonly pivot?: { readonly x: number; readonly y: number };
  readonly provenance?: IllustrationProvenance;
  readonly alphaThreshold?: number;
  readonly occlusion?: IllustrationPart["occlusion"];
  readonly originalSource?: string;
  readonly characterId?: string;
}

export function createCharacterPartFromImport(
  options: CreateCharacterPartOptions,
): IllustrationPart {
  const template = templatePartFor(options.templateId);
  if (!template) {
    throw new Error(`Unknown character template part "${options.templateId}".`);
  }

  const imported = options.imported;
  const sourceFileName = safeSourceFileName(imported.inspection.fileName);
  const preparedSource = `assets/${template.id}.png`;
  const originalSource = options.originalSource ?? `source/${template.id}-${sourceFileName}`;
  const alphaThreshold = options.alphaThreshold ?? DEFAULT_TRIM_ALPHA_THRESHOLD;

  return {
    id: template.id,
    name: template.name,
    category: "character-part",
    source: preparedSource,
    originalSource,
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
      x: options.pivot?.x ?? imported.inspection.width / 2,
      y: options.pivot?.y ?? imported.inspection.height / 2,
    },
    preparedOffset: {
      x: imported.preparedOffsetX,
      y: imported.preparedOffsetY,
    },
    trim: {
      applied: imported.trim.applied,
      alphaThreshold,
      contentBounds: imported.trim.contentBounds,
    },
    alpha: imported.inspection.analysis.hasAlpha ? "required" : "opaque",
    parentId: template.parentId,
    zIndex: template.zIndex,
    characterId: options.characterId ?? "storybook-bird",
    role: template.id,
    ...(options.occlusion ? { occlusion: options.occlusion } : {}),
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

export function assignCharacterPart(
  pack: IllustrationPack,
  options: CreateCharacterPartOptions,
): IllustrationPack {
  const part = createCharacterPartFromImport(options);
  const existingIndex = pack.parts.findIndex(
    (candidate) => roleKey(candidate.id) === roleKey(part.id),
  );
  const parts =
    existingIndex === -1
      ? [...pack.parts, part]
      : pack.parts.map((candidate, index) => (index === existingIndex ? part : candidate));

  return { ...pack, parts };
}

export function updatePartPivot(
  pack: IllustrationPack,
  partId: string,
  pivot: { readonly x: number; readonly y: number },
): IllustrationPack {
  return {
    ...pack,
    parts: pack.parts.map((part) =>
      part.id === partId ? { ...part, pivot: { space: "source", x: pivot.x, y: pivot.y } } : part,
    ),
  };
}

export function updatePartRegistration(
  pack: IllustrationPack,
  partId: string,
  registration: { readonly x: number; readonly y: number },
): IllustrationPack {
  return {
    ...pack,
    parts: pack.parts.map((part) => (part.id === partId ? { ...part, registration } : part)),
  };
}

export function updatePartOcclusion(
  pack: IllustrationPack,
  partId: string,
  occlusion: IllustrationPart["occlusion"],
): IllustrationPack {
  return {
    ...pack,
    parts: pack.parts.map((part) => {
      if (part.id !== partId) {
        return part;
      }
      if (!occlusion) {
        const copy = { ...part };
        delete copy.occlusion;
        return copy;
      }
      return { ...part, occlusion };
    }),
  };
}

export function removePartAndDescendants(pack: IllustrationPack, partId: string): IllustrationPack {
  const removed = new Set<string>([partId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const part of pack.parts) {
      if (part.parentId && removed.has(part.parentId) && !removed.has(part.id)) {
        removed.add(part.id);
        changed = true;
      }
    }
  }

  return { ...pack, parts: pack.parts.filter((part) => !removed.has(part.id)) };
}

export interface CharacterPreparationIssue {
  readonly code: string;
  readonly severity: "error" | "warning";
  readonly path: string;
  readonly message: string;
}

export interface CharacterPreparationReport {
  readonly ready: boolean;
  readonly missingPartIds: readonly string[];
  readonly extraPartIds: readonly string[];
  readonly issues: readonly CharacterPreparationIssue[];
}

export function validateCharacterPreparation(pack: IllustrationPack): CharacterPreparationReport {
  const validation = validateIllustrationPack(pack);
  if (!validation.ok) {
    return {
      ready: false,
      missingPartIds: CHARACTER_RIG_TEMPLATE.map((part) => part.id),
      extraPartIds: [],
      issues: validation.issues.map((issue) => ({
        code: `schema.${issue.code}`,
        severity: "error",
        path: issue.path,
        message: issue.message,
      })),
    };
  }

  const issues: CharacterPreparationIssue[] = [];
  const missingPartIds: string[] = [];
  const extraPartIds: string[] = [];
  const templateIds = new Set(CHARACTER_RIG_TEMPLATE.map((part) => roleKey(part.id)));
  const resolved = new Map<string, IllustrationPart>();

  for (const template of CHARACTER_RIG_TEMPLATE) {
    const part = findTemplatePart(validation.pack, template);
    if (!part) {
      missingPartIds.push(template.id);
      issues.push({
        code: "missing-part",
        severity: "error",
        path: `parts.${template.id}`,
        message: `Required character part "${template.name}" (${template.id}) is missing.`,
      });
      continue;
    }
    resolved.set(template.id, part);

    const expectedParent = template.parentId;
    if (expectedParent === null) {
      if (part.parentId !== null) {
        issues.push({
          code: "parent-mismatch",
          severity: "error",
          path: `parts.${part.id}.parentId`,
          message: `Root part "${part.id}" must have a null parent, not "${part.parentId}".`,
        });
      }
    } else {
      const resolvedParent = resolved.get(expectedParent);
      if (!resolvedParent) {
        const parentTemplate = templatePartFor(expectedParent);
        issues.push({
          code: "missing-parent-part",
          severity: "error",
          path: `parts.${part.id}.parentId`,
          message: `Part "${part.id}" requires parent "${parentTemplate?.id ?? expectedParent}".`,
        });
      } else if (part.parentId !== resolvedParent.id) {
        issues.push({
          code: "parent-mismatch",
          severity: "error",
          path: `parts.${part.id}.parentId`,
          message: `Part "${part.id}" is parented to "${part.parentId ?? "null"}"; the template expects "${resolvedParent.id}".`,
        });
      }
    }

    if (part.zIndex !== template.zIndex) {
      issues.push({
        code: "draw-order-mismatch",
        severity: "warning",
        path: `parts.${part.id}.zIndex`,
        message: `Part "${part.id}" has draw order ${part.zIndex}; the template uses ${template.zIndex}. The explicit order is preserved.`,
      });
    }

    if (part.alpha === "opaque") {
      issues.push({
        code: "opaque-character-part",
        severity: "error",
        path: `parts.${part.id}.alpha`,
        message: `Character part "${part.id}" is marked opaque. Independent character parts require transparency.`,
      });
    } else if (part.alpha === "either") {
      issues.push({
        code: "alpha-unverified",
        severity: "warning",
        path: `parts.${part.id}.alpha`,
        message: `Character part "${part.id}" may be opaque; verify its alpha before rigging.`,
      });
    }

    if (!part.hashes) {
      issues.push({
        code: "missing-hash",
        severity: "warning",
        path: `parts.${part.id}.hashes`,
        message: `Part "${part.id}" has no source/prepared hashes; provenance and cache identity are weaker.`,
      });
    }

    if (part.occlusion?.requiresReconstruction) {
      issues.push({
        code: "unresolved-occlusion",
        severity: "error",
        path: `parts.${part.id}.occlusion`,
        message: `Part "${part.id}" is marked as requiring hidden-anatomy reconstruction: ${part.occlusion.note ?? "no note supplied"}.`,
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
        message: `Part "${part.id}" registers outside the pack canvas and may be invisible in a composed preview.`,
      });
    }
  }

  for (const part of validation.pack.parts) {
    if (
      !templateIds.has(roleKey(part.id)) &&
      (!part.role || !templateIds.has(roleKey(part.role)))
    ) {
      extraPartIds.push(part.id);
      issues.push({
        code: "extra-part",
        severity: "warning",
        path: `parts.${part.id}`,
        message: `Part "${part.id}" is not part of the storybook-bird template. It is preserved but the benchmark rig may ignore it.`,
      });
    }
  }

  return {
    ready: !issues.some((issue) => issue.severity === "error"),
    missingPartIds,
    extraPartIds,
    issues,
  };
}

export function characterPreparationSummary(report: CharacterPreparationReport): string {
  if (report.ready) {
    return "All required character parts are present and structurally ready for the benchmark rig.";
  }
  const missing = report.missingPartIds.length
    ? `Missing: ${report.missingPartIds.join(", ")}.`
    : "No required parts are missing.";
  return `${missing} ${report.issues.filter((issue) => issue.severity === "error").length} blocking issue(s).`;
}
