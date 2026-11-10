import { ARTISAN_RIG, BELL_RIG, CART_RIG, HORSE_RIG } from "@fableon/folk-motion";

import type { HostedProviderId } from "./catalog";

export type FolkActorId = "artisan" | "horse" | "cart" | "bell";

export interface RigSlot {
  readonly actor: FolkActorId;
  readonly nodeId: string;
  readonly partId: string;
  readonly parentNodeId: string | null;
  readonly pivot: { readonly x: number; readonly y: number };
  readonly drawOrder: number;
}

function slotsFor(
  actor: FolkActorId,
  rig: typeof ARTISAN_RIG | typeof HORSE_RIG | typeof CART_RIG | typeof BELL_RIG,
): readonly RigSlot[] {
  return rig.nodes.map((node) => ({
    actor,
    nodeId: node.id,
    partId: node.partId,
    parentNodeId: node.parentId,
    pivot: node.pivot,
    drawOrder: node.drawOrder,
  }));
}

export const RIG_SLOTS: readonly RigSlot[] = Object.freeze([
  ...slotsFor("artisan", ARTISAN_RIG),
  ...slotsFor("horse", HORSE_RIG),
  ...slotsFor("cart", CART_RIG),
  ...slotsFor("bell", BELL_RIG),
]);

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
