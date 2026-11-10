import { describe, expect, it } from "vitest";

import {
  ARTISAN_V2_RIG,
  connectorDiagnostics,
  resolveConnectorPose,
  resolveFolkPose,
  validateConnectorRig,
} from "@fableon/folk-motion";
import { translationMatrix } from "@fableon/sprite-motion";

import { buildConnectorRig } from "./stage2b2-connectors";
import { STAGE2B1_BASE_CONFIG, stage2b1FrameState } from "./stage2b1-motion";

function syntheticManifest() {
  return {
    parts: ARTISAN_V2_RIG.nodes.map((node) => ({
      id: node.partId,
      rigId: "artisan_v2",
      offsetX: node.pivot.x - 50,
      offsetY: node.pivot.y - 50,
      width: 100,
      height: 100,
      scale: 1,
      sourcePivot: { x: 50, y: 50 },
      targetPivot: { x: node.pivot.x, y: node.pivot.y },
    })),
  };
}

describe("Stage 2B.2 connector calibration", () => {
  it("builds a valid 31-part connector graph with named sockets", () => {
    const rig = buildConnectorRig("openai", syntheticManifest());
    validateConnectorRig(rig);
    expect(rig.parts).toHaveLength(31);
    expect(rig.parts.filter((part) => part.attachment)).toHaveLength(30);
    expect(
      rig.parts.find((part) => part.id === "artisan_handOpen")?.connectors.map((entry) => entry.id),
    ).toContain("grip");
    expect(
      rig.parts.find((part) => part.id === "artisan_nearFoot")?.connectors.map((entry) => entry.id),
    ).toContain("sole");
  });

  it("aligns every parent/child connector through a running pose", () => {
    const state = stage2b1FrameState(STAGE2B1_BASE_CONFIG, 120);
    const base = resolveFolkPose(ARTISAN_V2_RIG, state.pose);
    const pelvis = base.find((node) => node.id === "pelvis")!;
    for (const provider of ["openai", "gemini"] as const) {
      const rig = buildConnectorRig(provider, syntheticManifest());
      const resolved = resolveConnectorPose(rig, state.pose, pelvis.world);
      const diagnostics = connectorDiagnostics(resolved, rig);
      expect(diagnostics).toHaveLength(30);
      expect(Math.max(...diagnostics.map((entry) => entry.alignmentError))).toBeLessThan(1e-9);
    }
  });

  it("round-trips through JSON and preserves deterministic resolution", () => {
    const rig = buildConnectorRig("gemini", syntheticManifest());
    const restored = JSON.parse(JSON.stringify(rig)) as typeof rig;
    const state = stage2b1FrameState(STAGE2B1_BASE_CONFIG, 77);
    const root = translationMatrix(100, 50);
    const first = resolveConnectorPose(rig, state.pose, root);
    const second = resolveConnectorPose(restored, state.pose, root);
    expect(first).toEqual(second);
  });
});
