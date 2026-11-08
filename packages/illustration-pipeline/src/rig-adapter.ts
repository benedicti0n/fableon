import {
  evaluateSpriteRig,
  type ResolvedSpriteNode,
  type SpriteNodeDefinition,
  type SpriteRigDefinition,
} from "@fableon/sprite-motion";

import type { IllustrationPack, IllustrationPart } from "./schema";
import { roleKey } from "./character";

export interface RigCompatibilityIssue {
  readonly code:
    | "missing-part"
    | "duplicate-part-match"
    | "parent-mismatch"
    | "draw-order-mismatch"
    | "pivot-remapped"
    | "missing-image";
  readonly severity: "error" | "warning" | "info";
  readonly path: string;
  readonly message: string;
}

export interface RigCompatibilityReport {
  readonly ready: boolean;
  readonly nodePartIds: Readonly<Record<string, string>>;
  readonly issues: readonly RigCompatibilityIssue[];
}

export interface ImportedRigPart {
  readonly nodeId: string;
  readonly partId: string;
  readonly image: CanvasImageSource;
  readonly drawOffsetX: number;
  readonly drawOffsetY: number;
  readonly width: number;
  readonly height: number;
}

export interface ImportedCharacterRig {
  readonly rig: SpriteRigDefinition;
  readonly partsByNodeId: ReadonlyMap<string, ImportedRigPart>;
  readonly pack: IllustrationPack;
}

export interface RigAdapterOptions {
  /**
   * Optional base-node-id -> pack-part-id overrides. By default, node IDs and
   * part roles are matched after stripping punctuation and case.
   */
  readonly partIdMap?: Readonly<Record<string, string>>;
  /**
   * Pivot differences above this many source pixels are reported. The adapter
   * still aligns the imported pivot to the rig attachment using a draw offset.
   */
  readonly pivotTolerance?: number;
}

export class RigAdapterError extends Error {
  override readonly name = "RigAdapterError";
  readonly issues: readonly RigCompatibilityIssue[];

  constructor(issues: readonly RigCompatibilityIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
    this.issues = issues;
  }
}

export function validateRigCompatibility(
  baseRig: SpriteRigDefinition,
  pack: IllustrationPack,
  options: RigAdapterOptions = {},
): RigCompatibilityReport {
  const issues: RigCompatibilityIssue[] = [];
  const nodePartIds: Record<string, string> = {};
  const resolvedParts = new Map<string, IllustrationPart>();
  const baseNodesById = new Map(baseRig.nodes.map((node) => [node.id, node]));
  const pivotTolerance = options.pivotTolerance ?? 0.5;

  for (const node of baseRig.nodes) {
    const matches = pack.parts.filter((part) => {
      const override = options.partIdMap?.[node.id];
      if (override) {
        return part.id === override;
      }
      const key = roleKey(node.id);
      return roleKey(part.id) === key || (part.role !== undefined && roleKey(part.role) === key);
    });

    if (matches.length === 0) {
      issues.push({
        code: "missing-part",
        severity: "error",
        path: `rig.${node.id}`,
        message: `No imported illustration part matches rig node "${node.id}".`,
      });
      continue;
    }

    if (matches.length > 1) {
      issues.push({
        code: "duplicate-part-match",
        severity: "error",
        path: `rig.${node.id}`,
        message: `Multiple imported parts match rig node "${node.id}": ${matches.map((part) => part.id).join(", ")}.`,
      });
      continue;
    }

    const part = matches[0] as IllustrationPart;
    resolvedParts.set(node.id, part);
    nodePartIds[node.id] = part.id;

    if (node.parentId !== null) {
      const parentNode = baseNodesById.get(node.parentId);
      const parentPart = parentNode ? resolvedParts.get(parentNode.id) : undefined;
      if (!parentNode) {
        issues.push({
          code: "parent-mismatch",
          severity: "error",
          path: `rig.${node.id}.parentId`,
          message: `Rig node "${node.id}" references missing base parent "${node.parentId}".`,
        });
      } else if (!parentPart) {
        issues.push({
          code: "parent-mismatch",
          severity: "error",
          path: `rig.${node.id}.parentId`,
          message: `Parent part for rig node "${node.id}" could not be resolved.`,
        });
      } else if (part.parentId !== parentPart.id) {
        issues.push({
          code: "parent-mismatch",
          severity: "error",
          path: `rig.${node.id}.parentId`,
          message: `Pack part "${part.id}" is parented to "${part.parentId ?? "null"}"; rig node "${node.id}" expects parent part "${parentPart.id}".`,
        });
      }
    } else if (part.parentId !== null) {
      issues.push({
        code: "parent-mismatch",
        severity: "error",
        path: `rig.${node.id}.parentId`,
        message: `Root rig node "${node.id}" maps to part "${part.id}", but that part has parent "${part.parentId}".`,
      });
    }

    if (part.zIndex !== node.drawOrder) {
      issues.push({
        code: "draw-order-mismatch",
        severity: "warning",
        path: `rig.${node.id}.drawOrder`,
        message: `Rig draw order ${node.drawOrder} differs from pack zIndex ${part.zIndex}. The pack zIndex will be used for rendering.`,
      });
    }

    if (
      Math.abs(part.pivot.x - node.pivot.x) > pivotTolerance ||
      Math.abs(part.pivot.y - node.pivot.y) > pivotTolerance
    ) {
      issues.push({
        code: "pivot-remapped",
        severity: "info",
        path: `rig.${node.id}.pivot`,
        message: `Imported pivot (${part.pivot.x}, ${part.pivot.y}) differs from rig attachment (${node.pivot.x}, ${node.pivot.y}); the part is shifted so its pivot lands on the rig attachment.`,
      });
    }
  }

  return {
    ready: !issues.some((issue) => issue.severity === "error"),
    nodePartIds,
    issues,
  };
}

function adaptedNode(node: SpriteNodeDefinition, part: IllustrationPart): SpriteNodeDefinition {
  return Object.freeze({
    id: node.id,
    parentId: node.parentId,
    pivot: { x: node.pivot.x, y: node.pivot.y },
    drawOrder: part.zIndex,
    transform: node.transform,
    ...(node.tracks ? { tracks: node.tracks } : {}),
    ...(node.visible !== undefined ? { visible: node.visible } : {}),
  });
}

/**
 * Maps an imported character pack onto an existing benchmark rig. The rig's
 * pivots and motion tracks remain authoritative; each imported part is shifted
 * so its own source pivot lands on the corresponding rig attachment point.
 * Imported pixels are never repainted.
 */
export function createImportedCharacterRig(
  baseRig: SpriteRigDefinition,
  pack: IllustrationPack,
  images: ReadonlyMap<string, CanvasImageSource>,
  options: RigAdapterOptions = {},
): ImportedCharacterRig {
  const report = validateRigCompatibility(baseRig, pack, options);
  const issues = [...report.issues];

  const partsByNodeId = new Map<string, ImportedRigPart>();
  const adaptedNodes: SpriteNodeDefinition[] = [];
  const baseNodesById = new Map(baseRig.nodes.map((node) => [node.id, node]));

  for (const node of baseRig.nodes) {
    const partId = report.nodePartIds[node.id];
    const part = partId ? pack.parts.find((candidate) => candidate.id === partId) : undefined;
    const image = partId ? images.get(partId) : undefined;

    if (!part) {
      continue;
    }
    if (!image) {
      issues.push({
        code: "missing-image",
        severity: "error",
        path: `rig.${node.id}`,
        message: `No decoded image was supplied for imported part "${part.id}".`,
      });
      continue;
    }

    const baseParent = node.parentId ? baseNodesById.get(node.parentId) : undefined;
    if (node.parentId && !baseParent) {
      continue;
    }

    adaptedNodes.push(adaptedNode(node, part));
    partsByNodeId.set(node.id, {
      nodeId: node.id,
      partId: part.id,
      image,
      drawOffsetX: part.preparedOffset.x + node.pivot.x - part.pivot.x,
      drawOffsetY: part.preparedOffset.y + node.pivot.y - part.pivot.y,
      width: part.preparedSize.width,
      height: part.preparedSize.height,
    });
  }

  if (issues.some((issue) => issue.severity === "error")) {
    throw new RigAdapterError(issues);
  }

  const rig: SpriteRigDefinition = Object.freeze({
    nodes: Object.freeze(adaptedNodes.sort((left, right) => left.drawOrder - right.drawOrder)),
  });

  return {
    rig,
    partsByNodeId,
    pack,
  };
}

export function evaluateImportedCharacterRig(
  adapter: ImportedCharacterRig,
  frame: number,
): readonly ResolvedSpriteNode[] {
  return evaluateSpriteRig(adapter.rig, frame);
}

export interface ImportedCharacterRenderOptions {
  readonly hiddenNodeIds?: readonly string[];
}

export function renderImportedCharacter(
  context: CanvasRenderingContext2D,
  frame: number,
  adapter: ImportedCharacterRig,
  options: ImportedCharacterRenderOptions = {},
): void {
  const hidden = new Set(options.hiddenNodeIds ?? []);
  const resolved = evaluateImportedCharacterRig(adapter, frame);

  context.save();
  try {
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    for (const node of resolved) {
      if (!node.visible || hidden.has(node.id)) {
        continue;
      }
      const part = adapter.partsByNodeId.get(node.id);
      if (!part) {
        throw new RigAdapterError([
          {
            code: "missing-image",
            severity: "error",
            path: `rig.${node.id}`,
            message: `No imported render part is bound to rig node "${node.id}".`,
          },
        ]);
      }

      context.save();
      try {
        context.setTransform(
          node.world.a,
          node.world.b,
          node.world.c,
          node.world.d,
          node.world.e,
          node.world.f,
        );
        context.drawImage(part.image, part.drawOffsetX, part.drawOffsetY, part.width, part.height);
      } finally {
        context.restore();
      }
    }
  } finally {
    context.restore();
  }
}
