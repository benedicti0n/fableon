import { transformPoint, type Matrix2D, type Vec2 } from "@fableon/sprite-motion";

import type { FolkRig, FolkRigNode } from "./rig";

export type FolkJointKind = "shoulder" | "elbow" | "wrist" | "hip" | "knee" | "ankle" | "neck";

/**
 * Describes which artwork should sit above a joint seam. The artwork itself is
 * still a normal FolkRig node; this metadata tells the renderer and validators
 * which side owns the visible seam.
 */
export type FolkJointOcclusion = "parent-over-child" | "child-over-parent" | "cover-over";

export interface FolkJointLimits {
  /** Minimum local rotation in degrees, inclusive. */
  readonly min: number;
  /** Maximum local rotation in degrees, inclusive. */
  readonly max: number;
}

/**
 * Hidden overlap in the child sprite's pivot-local pixel space. The rectangle
 * must be covered by nontransparent child artwork so a rotation cannot expose a
 * hole at the joint.
 */
export interface FolkJointOverlap {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface FolkJoint {
  readonly kind: FolkJointKind;
  /** The parent node this joint attaches to. Must equal the child node's parentId. */
  readonly parentNodeId: string;
  readonly overlap: FolkJointOverlap;
  readonly occlusion: FolkJointOcclusion;
  readonly limits: FolkJointLimits;
  /** Optional node whose artwork is drawn above both sides of the seam. */
  readonly coverNodeId?: string;
  readonly notes?: string;
}

export interface FolkJointDiagnostic {
  readonly nodeId: string;
  readonly joint: FolkJoint;
  readonly partId: string;
  readonly overlapCorners: readonly Vec2[];
  readonly coverNodeId: string | null;
}

export class FolkJointError extends Error {
  override readonly name = "FolkJointError";
}

function finite(value: number): boolean {
  return Number.isFinite(value);
}

export function validateFolkJoint(node: FolkRigNode, byId: ReadonlyMap<string, FolkRigNode>): void {
  const joint = node.joint;
  if (!joint) return;
  if (joint.parentNodeId !== node.parentId) {
    throw new FolkJointError(
      `Joint on "${node.id}" names parent "${joint.parentNodeId}" but the rig parent is "${node.parentId ?? "null"}".`,
    );
  }
  if (!byId.has(joint.parentNodeId)) {
    throw new FolkJointError(
      `Joint on "${node.id}" references missing parent "${joint.parentNodeId}".`,
    );
  }
  const { x, y, width, height } = joint.overlap;
  if (![x, y, width, height].every(finite) || width <= 0 || height <= 0) {
    throw new FolkJointError(`Joint on "${node.id}" has an invalid hidden-overlap rectangle.`);
  }
  const { min, max } = joint.limits;
  if (!finite(min) || !finite(max) || min >= max) {
    throw new FolkJointError(`Joint on "${node.id}" has invalid rotation limits.`);
  }
  if (min < -360 || max > 360) {
    throw new FolkJointError(`Joint limits on "${node.id}" must stay within -360..360 degrees.`);
  }
  if (joint.coverNodeId !== undefined) {
    if (joint.coverNodeId === node.id) {
      throw new FolkJointError(`Joint on "${node.id}" cannot use itself as a cover.`);
    }
    const cover = byId.get(joint.coverNodeId);
    if (!cover) {
      throw new FolkJointError(
        `Joint on "${node.id}" references missing cover node "${joint.coverNodeId}".`,
      );
    }
    if (cover.drawOrder <= node.drawOrder) {
      throw new FolkJointError(`Cover "${cover.id}" must draw after joint child "${node.id}".`);
    }
  }
  if (joint.occlusion === "cover-over" && joint.coverNodeId === undefined) {
    throw new FolkJointError(`Joint on "${node.id}" uses cover-over without a cover node.`);
  }
}

export function jointForNode(rig: FolkRig, nodeId: string): FolkJoint | null {
  return rig.nodes.find((node) => node.id === nodeId)?.joint ?? null;
}

export function rotationWithinJointLimits(rig: FolkRig, nodeId: string, rotation: number): boolean {
  const joint = jointForNode(rig, nodeId);
  if (!joint) return true;
  return rotation >= joint.limits.min && rotation <= joint.limits.max;
}

export function clampJointRotation(rig: FolkRig, nodeId: string, rotation: number): number {
  const joint = jointForNode(rig, nodeId);
  if (!joint) return rotation;
  return Math.min(Math.max(rotation, joint.limits.min), joint.limits.max);
}

export function jointOverlapCorners(node: {
  readonly joint?: FolkJoint | null;
  readonly world: Matrix2D;
}): readonly Vec2[] {
  const joint = node.joint;
  if (!joint) return [];
  const { x, y, width, height } = joint.overlap;
  const local = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ] as const;
  return local.map((point) => transformPoint(node.world, point));
}

export function jointDiagnostics(rig: FolkRig): readonly FolkJointDiagnostic[] {
  const withWorld = rig.nodes.filter((node) => node.joint);
  return withWorld.map((node) => {
    const joint = node.joint as FolkJoint;
    return {
      nodeId: node.id,
      joint,
      partId: node.partId,
      // Rig-space corners; the resolved pose adds the current world transform.
      overlapCorners: [
        { x: joint.overlap.x, y: joint.overlap.y },
        {
          x: joint.overlap.x + joint.overlap.width,
          y: joint.overlap.y,
        },
        {
          x: joint.overlap.x + joint.overlap.width,
          y: joint.overlap.y + joint.overlap.height,
        },
        { x: joint.overlap.x, y: joint.overlap.y + joint.overlap.height },
      ],
      coverNodeId: joint.coverNodeId ?? null,
    };
  });
}

export function jointNodes(rig: FolkRig): readonly FolkRigNode[] {
  return rig.nodes.filter((node) => node.joint);
}
