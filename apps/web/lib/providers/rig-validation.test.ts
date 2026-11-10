import { describe, expect, it } from "vitest";

import { ARTISAN_V2_SLOTS } from "./rig-slots";
import { validateProviderPack, type PackManifestRecord } from "./rig-validation";

function partFor(slot: (typeof ARTISAN_V2_SLOTS)[number]): PackManifestRecord["parts"][number] {
  return {
    id: slot.partId,
    file: `parts/${slot.partId}.png`,
    offsetX: 100,
    offsetY: 100,
    width: 400,
    height: 400,
    scale: 1,
    sourcePivot: { x: 100, y: 100 },
    targetPivot: { x: 200, y: 200 },
    joint: slot.joint ?? null,
  };
}

function completeManifest(): PackManifestRecord {
  return {
    rigId: "artisan_v2",
    parts: ARTISAN_V2_SLOTS.map(partFor),
    missingSlots: [],
    rigManifest: Object.fromEntries(
      ARTISAN_V2_SLOTS.map((slot) => [
        slot.partId,
        {
          drawOrder: slot.drawOrder,
          ...(slot.joint ? { joint: slot.joint } : {}),
        },
      ]),
    ),
  };
}

describe("Stage 2B pack validation", () => {
  it("accepts a complete contract with joint metadata", async () => {
    const result = await validateProviderPack({
      manifest: completeManifest(),
      packDir: "/tmp/unused",
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.presentPartCount).toBe(31);
    expect(result.missingPartIds).toEqual([]);
  });

  it("reports missing parts instead of accepting filenames as success", async () => {
    const manifest = completeManifest();
    const result = await validateProviderPack({
      manifest: { ...manifest, parts: manifest.parts.slice(1) },
      packDir: "/tmp/unused",
    });
    expect(result.ok).toBe(false);
    expect(result.missingPartIds).toEqual([ARTISAN_V2_SLOTS[0]!.partId]);
    expect(result.errors.some((entry) => entry.code === "missing-slot")).toBe(true);
  });

  it("rejects a hidden overlap outside the registered artwork bounds", async () => {
    const manifest = completeManifest();
    const targetIndex = manifest.parts.findIndex((part) => part.id === "artisan_nearForearm");
    const target = manifest.parts[targetIndex]!;
    const result = await validateProviderPack({
      manifest: {
        ...manifest,
        parts: manifest.parts.map((part, index) =>
          index === targetIndex
            ? { ...target, width: 10, height: 10, offsetX: 0, offsetY: 0 }
            : part,
        ),
      },
      packDir: "/tmp/unused",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((entry) => entry.code === "overlap-outside-art")).toBe(true);
  });

  it("rejects a joint cover that draws beneath its child", async () => {
    const manifest = completeManifest();
    const result = await validateProviderPack({
      manifest: {
        ...manifest,
        rigManifest: {
          ...manifest.rigManifest,
          artisan_nearDhoti: { drawOrder: 1 },
        },
      },
      packDir: "/tmp/unused",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((entry) => entry.code === "cover-order")).toBe(true);
  });
});
