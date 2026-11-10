import {
  ARTISAN_RIG,
  ARTISAN_V2_RIG,
  BELL_RIG,
  CART_RIG,
  HORSE_RIG,
  type FolkJoint,
  type FolkRig,
} from "@fableon/folk-motion";

import type { HostedProviderId } from "./catalog";

export type FolkActorId = "artisan" | "horse" | "cart" | "bell";

export interface RigSlot {
  readonly actor: FolkActorId;
  readonly rigId: string;
  readonly nodeId: string;
  readonly partId: string;
  readonly parentNodeId: string | null;
  readonly pivot: { readonly x: number; readonly y: number };
  readonly drawOrder: number;
  readonly joint?: FolkJoint;
}

function slotsFor(actor: FolkActorId, rig: FolkRig): readonly RigSlot[] {
  return rig.nodes.map((node) => ({
    actor,
    rigId: rig.id,
    nodeId: node.id,
    partId: node.partId,
    parentNodeId: node.parentId,
    pivot: node.pivot,
    drawOrder: node.drawOrder,
    ...(node.joint ? { joint: node.joint } : {}),
  }));
}

export const RIG_SLOTS: readonly RigSlot[] = Object.freeze([
  ...slotsFor("artisan", ARTISAN_RIG),
  ...slotsFor("horse", HORSE_RIG),
  ...slotsFor("cart", CART_RIG),
  ...slotsFor("bell", BELL_RIG),
]);

/** Complete Stage 2B artisan contract. */
export const ARTISAN_V2_SLOTS: readonly RigSlot[] = Object.freeze(
  slotsFor("artisan", ARTISAN_V2_RIG),
);

export function rigSlotsFor(provider: HostedProviderId): readonly RigSlot[] {
  return RIG_SLOTS.filter(
    (slot) =>
      slot.actor === "artisan" ||
      slot.actor === "horse" ||
      slot.actor === "cart" ||
      (provider === "openai" && slot.actor === "bell") ||
      (provider === "gemini" && slot.actor === "bell"),
  );
}

export function slotByPartId(partId: string): RigSlot | null {
  return RIG_SLOTS.find((slot) => slot.partId === partId) ?? null;
}

export function artisanV2SlotByPartId(partId: string): RigSlot | null {
  return ARTISAN_V2_SLOTS.find((slot) => slot.partId === partId) ?? null;
}
