import { evaluateKeyframeTrack } from "@fableon/animation-core";
import type { AnimationTrack } from "@fableon/scene-schema";

/**
 * A 2D affine matrix using the same six coefficients as CanvasRenderingContext2D:
 * [a c e; b d f; 0 0 1]. Point transforms are x' = a*x + c*y + e and
 * y' = b*x + d*y + f.
 */
export interface Matrix2D {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
}

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface SpriteTransform {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

export interface SpriteTransformTracks {
  readonly x?: AnimationTrack;
  readonly y?: AnimationTrack;
  readonly rotation?: AnimationTrack;
  readonly scaleX?: AnimationTrack;
  readonly scaleY?: AnimationTrack;
}

export interface SpriteNodeDefinition {
  readonly id: string;
  readonly parentId: string | null;
  readonly pivot: Vec2;
  readonly drawOrder: number;
  readonly transform: SpriteTransform;
  readonly tracks?: SpriteTransformTracks;
  readonly visible?: boolean;
}

export interface SpriteRigDefinition {
  readonly nodes: readonly SpriteNodeDefinition[];
}

export interface ResolvedSpriteNode {
  readonly id: string;
  readonly parentId: string | null;
  readonly drawOrder: number;
  readonly pivot: Vec2;
  readonly visible: boolean;
  readonly transform: SpriteTransform;
  readonly world: Matrix2D;
}

export class SpriteRigError extends Error {
  override readonly name = "SpriteRigError";
}

const IDENTITY: Matrix2D = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export function multiplyMatrices(left: Matrix2D, right: Matrix2D): Matrix2D {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

export function translationMatrix(x: number, y: number): Matrix2D {
  return { a: 1, b: 0, c: 0, d: 1, e: x, f: y };
}

export function rotationMatrix(degrees: number): Matrix2D {
  const radians = (degrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return { a: cosine, b: sine, c: -sine, d: cosine, e: 0, f: 0 };
}

export function scaleMatrix(scaleX: number, scaleY: number): Matrix2D {
  return { a: scaleX, b: 0, c: 0, d: scaleY, e: 0, f: 0 };
}

export function transformPoint(matrix: Matrix2D, point: Vec2): Vec2 {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

export function localMatrix(transform: SpriteTransform, pivot: Vec2): Matrix2D {
  return multiplyMatrices(
    multiplyMatrices(
      multiplyMatrices(
        translationMatrix(transform.x, transform.y),
        rotationMatrix(transform.rotation),
      ),
      scaleMatrix(transform.scaleX, transform.scaleY),
    ),
    translationMatrix(-pivot.x, -pivot.y),
  );
}

function sampleTransform(node: SpriteNodeDefinition, frame: number): SpriteTransform {
  const tracks = node.tracks;
  return {
    x: tracks?.x ? evaluateKeyframeTrack(tracks.x, frame) : node.transform.x,
    y: tracks?.y ? evaluateKeyframeTrack(tracks.y, frame) : node.transform.y,
    rotation: tracks?.rotation
      ? evaluateKeyframeTrack(tracks.rotation, frame)
      : node.transform.rotation,
    scaleX: tracks?.scaleX ? evaluateKeyframeTrack(tracks.scaleX, frame) : node.transform.scaleX,
    scaleY: tracks?.scaleY ? evaluateKeyframeTrack(tracks.scaleY, frame) : node.transform.scaleY,
  };
}

function validateRig(rig: SpriteRigDefinition): void {
  if (rig.nodes.length === 0) {
    throw new SpriteRigError("A sprite rig must contain at least one node.");
  }

  const ids = new Set<string>();
  const orders = new Set<number>();

  for (const node of rig.nodes) {
    if (ids.has(node.id)) {
      throw new SpriteRigError(`Duplicate sprite node ID "${node.id}".`);
    }
    ids.add(node.id);

    if (orders.has(node.drawOrder)) {
      throw new SpriteRigError(`Duplicate sprite draw order ${node.drawOrder}.`);
    }
    orders.add(node.drawOrder);
  }

  for (const node of rig.nodes) {
    if (node.parentId !== null && !ids.has(node.parentId)) {
      throw new SpriteRigError(
        `Sprite node "${node.id}" references missing parent "${node.parentId}".`,
      );
    }
  }

  for (const node of rig.nodes) {
    const chain = new Set<string>();
    let current: SpriteNodeDefinition | undefined = node;
    while (current) {
      if (chain.has(current.id)) {
        throw new SpriteRigError(`Sprite hierarchy contains a cycle at "${current.id}".`);
      }
      chain.add(current.id);
      current =
        current.parentId === null
          ? undefined
          : rig.nodes.find((candidate) => candidate.id === current?.parentId);
    }
  }
}

/**
 * Evaluates a hierarchical sprite rig at an exact animation frame. Translation
 * values are in the parent's image coordinate space; each node's pivot maps to
 * that translation. Rotation and scale occur around the node pivot.
 */
export function evaluateSpriteRig(
  rig: SpriteRigDefinition,
  frame: number,
): readonly ResolvedSpriteNode[] {
  if (!Number.isInteger(frame) || frame < 0) {
    throw new SpriteRigError(`Sprite frame must be a non-negative integer; received ${frame}.`);
  }

  validateRig(rig);

  const nodesById = new Map(rig.nodes.map((node) => [node.id, node]));
  const resolved = new Map<string, ResolvedSpriteNode>();
  const resolving = new Set<string>();

  function resolveNode(node: SpriteNodeDefinition): ResolvedSpriteNode {
    const cached = resolved.get(node.id);
    if (cached) {
      return cached;
    }
    if (resolving.has(node.id)) {
      throw new SpriteRigError(`Sprite hierarchy contains a cycle at "${node.id}".`);
    }

    resolving.add(node.id);
    try {
      const parentWorld: Matrix2D =
        node.parentId === null
          ? IDENTITY
          : resolveNode(nodesById.get(node.parentId) as SpriteNodeDefinition).world;
      const transform = sampleTransform(node, frame);
      const world = multiplyMatrices(parentWorld, localMatrix(transform, node.pivot));
      const result: ResolvedSpriteNode = Object.freeze({
        id: node.id,
        parentId: node.parentId,
        drawOrder: node.drawOrder,
        pivot: node.pivot,
        visible: node.visible ?? true,
        transform,
        world,
      });
      resolved.set(node.id, result);
      return result;
    } finally {
      resolving.delete(node.id);
    }
  }

  return Object.freeze(
    rig.nodes
      .map((node) => resolveNode(node))
      .sort((left, right) => left.drawOrder - right.drawOrder),
  );
}
