import { describe, expect, it } from "vitest";

import {
  ConnectorRigError,
  attachPropToConnector,
  clampConnectorRotation,
  connectorLocalToSource,
  connectorPoint,
  connectorRotationFor,
  resolveConnectorPose,
  validateConnectorRig,
  type ConnectorRig,
} from "./connectors";
import { translationMatrix } from "@fableon/sprite-motion";

const rig: ConnectorRig = {
  id: "test",
  rootPartId: "upper",
  parts: [
    {
      id: "upper",
      rigNodeId: "upper",
      partId: "upper",
      drawOrder: 1,
      crop: { x: 0, y: 0, width: 100, height: 200, sourceWidth: 200, sourceHeight: 400 },
      scale: 0.5,
      connectors: [
        { id: "shoulder", x: 0.5, y: 0 },
        { id: "elbow", x: 0.5, y: 1 },
      ],
    },
    {
      id: "forearm",
      rigNodeId: "forearm",
      partId: "forearm",
      drawOrder: 2,
      crop: { x: 0, y: 0, width: 80, height: 160, sourceWidth: 160, sourceHeight: 320 },
      scale: 0.5,
      connectors: [
        { id: "elbow", x: 0.5, y: 0 },
        { id: "wrist", x: 0.5, y: 1 },
      ],
      attachment: {
        parentPartId: "upper",
        parentConnector: "elbow",
        childConnector: "elbow",
        limitsDeg: { min: -120, max: 0 },
      },
    },
  ],
};

describe("connector rigging", () => {
  it("converts normalized connectors through the registered crop", () => {
    expect(connectorPoint(rig.parts[0]!, "elbow")).toEqual({ x: 50, y: 200 });
    expect(connectorLocalToSource(rig.parts[0]!, "elbow")).toEqual({ x: 100, y: 400 });
  });

  it("aligns parent and child connectors and keeps rotation at the socket", () => {
    const resolved = resolveConnectorPose(
      rig,
      { nodes: { upper: { rotation: 10 }, forearm: { rotation: -35 } } },
      translationMatrix(300, 100),
    );
    const upper = resolved.find((part) => part.id === "upper")!;
    const forearm = resolved.find((part) => part.id === "forearm")!;
    expect(forearm.alignmentError).toBeLessThan(1e-9);
    expect(forearm.parentConnectorWorld?.x).toBeCloseTo(forearm.childConnectorWorld?.x ?? 0, 9);
    expect(forearm.parentConnectorWorld?.y).toBeCloseTo(forearm.childConnectorWorld?.y ?? 0, 9);
    expect(forearm.world).not.toEqual(upper.world);
  });

  it("exposes rotation limits without silently changing the pose", () => {
    const forearm = rig.parts[1]!;
    expect(clampConnectorRotation(forearm, 40)).toBe(0);
    expect(connectorRotationFor(forearm, 40)).toBe(40);
    const resolved = resolveConnectorPose(
      rig,
      { nodes: { forearm: { rotation: 40 } } },
      translationMatrix(0, 0),
    );
    expect(resolved.find((part) => part.id === "forearm")!.alignmentError).toBeLessThan(1e-9);
  });

  it("rejects missing sockets, cycles and duplicate roots", () => {
    const missing = JSON.parse(JSON.stringify(rig)) as ConnectorRig;
    (missing.parts[1]!.attachment as { childConnector: string }).childConnector = "absent";
    expect(() => validateConnectorRig(missing)).toThrow(ConnectorRigError);

    const cycle = JSON.parse(JSON.stringify(rig)) as ConnectorRig;
    (cycle.parts[0] as { attachment?: unknown }).attachment = {
      parentPartId: "forearm",
      parentConnector: "wrist",
      childConnector: "shoulder",
    };
    expect(() => validateConnectorRig(cycle)).toThrow(/cycle/i);

    const duplicateRoot = JSON.parse(JSON.stringify(rig)) as ConnectorRig;
    (duplicateRoot.parts[0] as { attachment?: unknown }).attachment = {
      parentPartId: "forearm",
      parentConnector: "wrist",
      childConnector: "shoulder",
    };
    expect(() => validateConnectorRig(duplicateRoot)).toThrow();
  });

  it("attaches a prop by its own grip connector", () => {
    const handWorld = translationMatrix(100, 200);
    const result = attachPropToConnector({
      prop: {
        id: "bell",
        crop: { x: -50, y: -100, width: 100, height: 200, sourceWidth: 200, sourceHeight: 400 },
        connectors: [{ id: "grip", x: 0.5, y: 0.5 }],
      },
      propConnector: "grip",
      handWorld,
      handConnectorPoint: { x: 0, y: 0 },
    });
    expect(result.connectorWorld.x).toBeCloseTo(100, 9);
    expect(result.connectorWorld.y).toBeCloseTo(200, 9);
  });
});
