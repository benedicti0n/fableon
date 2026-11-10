import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { FolkJoint } from "@fableon/folk-motion";

import { ARTISAN_V2_SLOTS, type RigSlot } from "./rig-slots";

export interface PackPartRecord {
  readonly id: string;
  readonly file: string;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly sourcePivot: { readonly x: number; readonly y: number };
  readonly targetPivot: { readonly x: number; readonly y: number };
  readonly joint?: FolkJoint | null;
  readonly sha256?: string;
}

export interface PackManifestRecord {
  readonly rigId?: string | null;
  readonly parts: readonly PackPartRecord[];
  readonly missingSlots?: readonly string[];
  readonly rigManifest?: Readonly<
    Record<string, { readonly drawOrder?: number; readonly joint?: FolkJoint }>
  >;
}

export interface PackValidationIssue {
  readonly code: string;
  readonly partId: string | null;
  readonly message: string;
}

export interface PackValidationResult {
  readonly ok: boolean;
  readonly rigId: string | null;
  readonly requiredPartCount: number;
  readonly presentPartCount: number;
  readonly missingPartIds: readonly string[];
  readonly errors: readonly PackValidationIssue[];
  readonly warnings: readonly PackValidationIssue[];
  readonly checkedHashes: number;
}

function issue(code: string, partId: string | null, message: string): PackValidationIssue {
  return { code, partId, message };
}

function overlapsContain(
  bounds: { x: number; y: number; width: number; height: number },
  overlap: FolkJoint["overlap"],
): boolean {
  const epsilon = 0.5;
  return (
    overlap.x >= bounds.x - epsilon &&
    overlap.y >= bounds.y - epsilon &&
    overlap.x + overlap.width <= bounds.x + bounds.width + epsilon &&
    overlap.y + overlap.height <= bounds.y + bounds.height + epsilon
  );
}

export async function validateProviderPack(input: {
  readonly manifest: PackManifestRecord;
  readonly packDir: string;
  readonly slots?: readonly RigSlot[];
}): Promise<PackValidationResult> {
  const slots = input.slots ?? ARTISAN_V2_SLOTS;
  const slotIds = new Set(slots.map((slot) => slot.partId));
  const byId = new Map(input.manifest.parts.map((part) => [part.id, part]));
  const errors: PackValidationIssue[] = [];
  const warnings: PackValidationIssue[] = [];
  let checkedHashes = 0;

  for (const slot of slots) {
    if (!byId.has(slot.partId)) {
      errors.push(issue("missing-slot", slot.partId, `Missing required part "${slot.partId}".`));
    }
  }
  for (const part of input.manifest.parts) {
    if (!slotIds.has(part.id)) {
      warnings.push(
        issue("unexpected-part", part.id, `Part "${part.id}" is not in this contract.`),
      );
    }
    if (!Number.isFinite(part.scale) || part.scale <= 0) {
      errors.push(issue("invalid-scale", part.id, `Part "${part.id}" has an invalid scale.`));
    }
    if (part.width <= 0 || part.height <= 0) {
      errors.push(issue("invalid-size", part.id, `Part "${part.id}" has an invalid size.`));
    }
    if (part.sha256) {
      try {
        const bytes = await readFile(path.join(input.packDir, part.file));
        const hash = createHash("sha256").update(bytes).digest("hex");
        checkedHashes += 1;
        if (hash !== part.sha256) {
          errors.push(
            issue(
              "hash-mismatch",
              part.id,
              `Part "${part.id}" bytes do not match its manifest hash.`,
            ),
          );
        }
      } catch {
        errors.push(issue("missing-file", part.id, `Part "${part.id}" file is missing.`));
      }
    }
  }

  const missingPartIds = slots.filter((slot) => !byId.has(slot.partId)).map((slot) => slot.partId);
  if (input.manifest.missingSlots && input.manifest.missingSlots.length > 0) {
    errors.push(
      issue(
        "manifest-missing-slots",
        null,
        `Manifest still reports ${input.manifest.missingSlots.length} missing slots.`,
      ),
    );
  }

  for (const part of input.manifest.parts) {
    const slot = slots.find((entry) => entry.partId === part.id);
    const joint = part.joint ?? slot?.joint;
    if (!joint) continue;
    const parentPartId =
      slots.find((entry) => entry.nodeId === joint.parentNodeId)?.partId ?? joint.parentNodeId;
    const parent = input.manifest.parts.find((entry) => entry.id === parentPartId);
    const parentSlot = slots.find((entry) => entry.nodeId === joint.parentNodeId);
    const parentDrawOrder = parent
      ? slotDrawOrder(input.manifest, parent.id, slots)
      : (parentSlot?.drawOrder ?? null);
    const childDrawOrder = slotDrawOrder(input.manifest, part.id, slots);
    if (!parent) {
      errors.push(
        issue(
          "missing-joint-parent",
          part.id,
          `Joint parent "${joint.parentNodeId}" has no packed part.`,
        ),
      );
    }
    if (parentDrawOrder !== null && childDrawOrder !== null) {
      if (joint.occlusion === "parent-over-child" && parentDrawOrder <= childDrawOrder) {
        errors.push(
          issue(
            "occlusion-order",
            part.id,
            `Parent "${joint.parentNodeId}" must draw after "${part.id}" for parent-over-child.`,
          ),
        );
      }
      if (joint.occlusion === "child-over-parent" && parentDrawOrder >= childDrawOrder) {
        errors.push(
          issue(
            "occlusion-order",
            part.id,
            `Child "${part.id}" must draw after "${joint.parentNodeId}" for child-over-parent.`,
          ),
        );
      }
    }
    const bounds = {
      x: (part.offsetX - part.targetPivot.x) / part.scale,
      y: (part.offsetY - part.targetPivot.y) / part.scale,
      width: part.width / part.scale,
      height: part.height / part.scale,
    };
    if (!overlapsContain(bounds, joint.overlap)) {
      errors.push(
        issue(
          "overlap-outside-art",
          part.id,
          `Hidden overlap for "${part.id}" is outside its nontransparent registration bounds.`,
        ),
      );
    }
    if (joint.coverNodeId) {
      const coverPartId =
        slots.find((entry) => entry.nodeId === joint.coverNodeId)?.partId ?? joint.coverNodeId;
      const cover = input.manifest.parts.find((entry) => entry.id === coverPartId);
      const coverSlot = slots.find((entry) => entry.partId === coverPartId);
      const coverDrawOrder = cover
        ? slotDrawOrder(input.manifest, cover.id, slots)
        : (coverSlot?.drawOrder ?? null);
      if (!cover) {
        errors.push(
          issue("missing-joint-cover", part.id, `Joint cover "${joint.coverNodeId}" is missing.`),
        );
      } else if (
        coverDrawOrder !== null &&
        childDrawOrder !== null &&
        coverDrawOrder <= childDrawOrder
      ) {
        errors.push(
          issue(
            "cover-order",
            part.id,
            `Joint cover "${joint.coverNodeId}" must draw after "${part.id}".`,
          ),
        );
      }
    }
    if (joint.limits.min >= joint.limits.max) {
      errors.push(issue("joint-limits", part.id, `Joint limits on "${part.id}" are invalid.`));
    }
  }

  return {
    ok: errors.length === 0,
    rigId: input.manifest.rigId ?? slots[0]?.rigId ?? null,
    requiredPartCount: slots.length,
    presentPartCount: input.manifest.parts.length,
    missingPartIds,
    errors,
    warnings,
    checkedHashes,
  };
}

function slotDrawOrder(
  manifest: PackManifestRecord,
  partId: string,
  slots: readonly RigSlot[],
): number | null {
  const fromManifest = manifest.rigManifest?.[partId]?.drawOrder;
  if (typeof fromManifest === "number") return fromManifest;
  const slot = slots.find((entry) => entry.partId === partId);
  return slot?.drawOrder ?? null;
}
