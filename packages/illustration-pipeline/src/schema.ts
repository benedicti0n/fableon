import { z } from "zod";

import {
  ASSET_CATEGORIES,
  ILLUSTRATION_PACK_FORMAT,
  ILLUSTRATION_PACK_VERSION,
  ILLUSTRATION_PIVOT_SPACE,
  PACK_KINDS,
  PROVENANCE_KINDS,
  SUPPORTED_IMAGE_EXTENSIONS,
} from "./constants";

const finiteNumber = z.number().finite();
const positiveDimension = z.number().int().min(1).max(32_768);
const nonNegativeInteger = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

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

export function isSafePackPath(value: string): boolean {
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

  const segments = value.split("/");
  if (!segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..")) {
    return false;
  }

  const fileName = segments.at(-1) ?? "";
  const extension = fileName.includes(".") ? fileName.split(".").at(-1)?.toLowerCase() : "";
  return (
    extension !== undefined && (SUPPORTED_IMAGE_EXTENSIONS as readonly string[]).includes(extension)
  );
}

const assetPathSchema = z
  .string()
  .min(1)
  .max(512)
  .refine(
    isSafePackPath,
    `Asset paths must be safe relative POSIX paths ending in ${SUPPORTED_IMAGE_EXTENSIONS.map(
      (extension) => `.${extension}`,
    ).join(", ")}, without '..', absolute roots, URLs, backslashes, query strings, or fragments.`,
  );

export const sizeSchema = z.strictObject({
  width: positiveDimension,
  height: positiveDimension,
});

export const pointSchema = z.strictObject({
  x: finiteNumber,
  y: finiteNumber,
});

export const sourceRectSchema = z.strictObject({
  x: nonNegativeInteger,
  y: nonNegativeInteger,
  width: positiveDimension,
  height: positiveDimension,
});

export const pivotSchema = z.strictObject({
  space: z.literal(ILLUSTRATION_PIVOT_SPACE),
  x: finiteNumber,
  y: finiteNumber,
});

export const transformSchema = z.strictObject({
  x: finiteNumber,
  y: finiteNumber,
  scaleX: finiteNumber,
  scaleY: finiteNumber,
  rotation: finiteNumber,
  opacity: z.number().finite().min(0).max(1),
});

export const provenanceSchema = z.strictObject({
  kind: z.enum(PROVENANCE_KINDS),
  creator: z.string().min(1).max(200).optional(),
  sourceRef: z.string().min(1).max(1_000).optional(),
  license: z.string().min(1).max(200).optional(),
  notes: z.string().min(1).max(2_000).optional(),
});

export const partHashesSchema = z.strictObject({
  algorithm: z.literal("sha256"),
  source: z.string().regex(/^[0-9a-f]{64}$/, "Source hashes must be lowercase SHA-256 hex."),
  prepared: z.string().regex(/^[0-9a-f]{64}$/, "Prepared hashes must be lowercase SHA-256 hex."),
});

export const trimSchema = z.strictObject({
  applied: z.boolean(),
  alphaThreshold: z.number().int().min(0).max(255),
  contentBounds: sourceRectSchema,
});

export const occlusionSchema = z.strictObject({
  requiresReconstruction: z.boolean(),
  note: z.string().min(1).max(1_000).optional(),
});

export const illustrationPartSchema = z.strictObject({
  id: identifierSchema,
  name: displayNameSchema,
  category: z.enum(ASSET_CATEGORIES),
  source: assetPathSchema,
  originalSource: assetPathSchema.optional(),
  originalSize: sizeSchema,
  preparedSize: sizeSchema,
  /**
   * Top-left of the original untrimmed source in the pack registration canvas.
   * This is presentation metadata; character rigs use source-local pivots and
   * their own parent transforms.
   */
  registration: pointSchema,
  /**
   * Pivot in original untrimmed source-image coordinates. This is the single
   * canonical pivot space; trimming never changes it.
   */
  pivot: pivotSchema,
  /**
   * Top-left of the prepared image in original source coordinates. Draw the
   * prepared image at registration + preparedOffset to reconstruct the pack
   * canvas without moving the part.
   */
  preparedOffset: pointSchema,
  trim: trimSchema,
  alpha: z.enum(["required", "opaque", "either"]),
  parentId: identifierSchema.nullable(),
  zIndex: nonNegativeInteger,
  characterId: identifierSchema.optional(),
  role: z.string().min(1).max(64).optional(),
  transform: transformSchema.optional(),
  occlusion: occlusionSchema.optional(),
  hashes: partHashesSchema.optional(),
  provenance: provenanceSchema,
});

export const illustrationPackSchema = z
  .strictObject({
    format: z.literal(ILLUSTRATION_PACK_FORMAT),
    version: z.literal(ILLUSTRATION_PACK_VERSION),
    id: identifierSchema,
    name: displayNameSchema,
    kind: z.enum(PACK_KINDS),
    canvas: z.strictObject({
      width: positiveDimension,
      height: positiveDimension,
      pixelDensity: z.number().finite().positive().max(8).optional(),
    }),
    parts: z.array(illustrationPartSchema),
  })
  .superRefine((pack, ctx) => {
    const partIds = new Set<string>();
    const zIndexes = new Set<number>();
    const partsById = new Map<string, (typeof pack.parts)[number]>();

    pack.parts.forEach((part, partIndex) => {
      if (partIds.has(part.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate illustration part ID "${part.id}".`,
          path: ["parts", partIndex, "id"],
        });
      }
      partIds.add(part.id);
      partsById.set(part.id, part);

      if (zIndexes.has(part.zIndex)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate illustration draw order ${part.zIndex} on part "${part.id}".`,
          path: ["parts", partIndex, "zIndex"],
        });
      }
      zIndexes.add(part.zIndex);

      if (
        part.pivot.x < 0 ||
        part.pivot.y < 0 ||
        part.pivot.x > part.originalSize.width ||
        part.pivot.y > part.originalSize.height
      ) {
        ctx.addIssue({
          code: "custom",
          message: `Pivot (${part.pivot.x}, ${part.pivot.y}) must lie within original source bounds ${part.originalSize.width}x${part.originalSize.height}.`,
          path: ["parts", partIndex, "pivot"],
        });
      }

      const bounds = part.trim.contentBounds;
      if (
        bounds.x + bounds.width > part.originalSize.width ||
        bounds.y + bounds.height > part.originalSize.height
      ) {
        ctx.addIssue({
          code: "custom",
          message: `Trim content bounds extend outside original source bounds for part "${part.id}".`,
          path: ["parts", partIndex, "trim", "contentBounds"],
        });
      }

      if (part.preparedSize.width < bounds.width || part.preparedSize.height < bounds.height) {
        ctx.addIssue({
          code: "custom",
          message: `Prepared size ${part.preparedSize.width}x${part.preparedSize.height} cannot be smaller than the retained content ${bounds.width}x${bounds.height}.`,
          path: ["parts", partIndex, "preparedSize"],
        });
      }
    });

    pack.parts.forEach((part, partIndex) => {
      if (part.parentId !== null && !partsById.has(part.parentId)) {
        ctx.addIssue({
          code: "custom",
          message: `Illustration part "${part.id}" references missing parent "${part.parentId}".`,
          path: ["parts", partIndex, "parentId"],
        });
      }

      const chain = new Set<string>();
      let current: (typeof pack.parts)[number] | undefined = part;
      while (current) {
        if (chain.has(current.id)) {
          ctx.addIssue({
            code: "custom",
            message: `Illustration hierarchy contains a cycle at "${current.id}".`,
            path: ["parts", partIndex, "parentId"],
          });
          break;
        }
        chain.add(current.id);
        current = current.parentId === null ? undefined : partsById.get(current.parentId);
      }
    });
  });

export type IllustrationPack = z.infer<typeof illustrationPackSchema>;
export type IllustrationPart = z.infer<typeof illustrationPartSchema>;
export type IllustrationProvenance = z.infer<typeof provenanceSchema>;
export type IllustrationTrim = z.infer<typeof trimSchema>;
export type IllustrationTransform = z.infer<typeof transformSchema>;
export type IllustrationOcclusion = z.infer<typeof occlusionSchema>;
export type IllustrationHashes = z.infer<typeof partHashesSchema>;

export interface IllustrationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export class IllustrationPackError extends Error {
  override readonly name = "IllustrationPackError";
  readonly issues: readonly IllustrationIssue[];

  constructor(issues: readonly IllustrationIssue[]) {
    super(issues.map((issue) => `${issue.path || "<root>"}: ${issue.message}`).join("\n"));
    this.issues = issues;
  }
}

function issuePath(path: PropertyKey[]): string {
  return path.map((segment) => String(segment)).join(".");
}

export type IllustrationPackValidation =
  | { readonly ok: true; readonly pack: IllustrationPack }
  | { readonly ok: false; readonly issues: readonly IllustrationIssue[] };

export function validateIllustrationPack(input: unknown): IllustrationPackValidation {
  const result = illustrationPackSchema.safeParse(input);
  if (result.success) {
    return { ok: true, pack: result.data };
  }

  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      code: issue.code,
      path: issuePath(issue.path),
      message: issue.message,
    })),
  };
}

export function parseIllustrationPack(input: unknown): IllustrationPack {
  const result = validateIllustrationPack(input);
  if (!result.ok) {
    throw new IllustrationPackError(result.issues);
  }
  return result.pack;
}

export function serializeIllustrationPack(pack: IllustrationPack): string {
  return `${JSON.stringify(pack, null, 2)}\n`;
}

export function deserializeIllustrationPack(serialized: string): IllustrationPack {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new IllustrationPackError([
      {
        code: "invalid_json",
        path: "",
        message: error instanceof Error ? error.message : "Illustration pack is not valid JSON.",
      },
    ]);
  }
  return parseIllustrationPack(parsed);
}

export function partDrawOffset(part: IllustrationPart): { readonly x: number; readonly y: number } {
  return {
    x: part.registration.x + part.preparedOffset.x,
    y: part.registration.y + part.preparedOffset.y,
  };
}

export function partParentChain(
  pack: IllustrationPack,
  partId: string,
): readonly IllustrationPart[] {
  const partsById = new Map(pack.parts.map((part) => [part.id, part]));
  const chain: IllustrationPart[] = [];
  const seen = new Set<string>();
  let current = partsById.get(partId);

  while (current) {
    if (seen.has(current.id)) {
      throw new IllustrationPackError([
        {
          code: "cycle",
          path: "parts",
          message: `Illustration hierarchy contains a cycle at "${current.id}".`,
        },
      ]);
    }
    seen.add(current.id);
    chain.push(current);
    current = current.parentId === null ? undefined : partsById.get(current.parentId);
  }

  return chain;
}
