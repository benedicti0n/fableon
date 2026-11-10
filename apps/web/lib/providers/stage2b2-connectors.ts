import {
  ARTISAN_V2_RIG,
  type ConnectorDefinition,
  type ConnectorPart,
  type ConnectorRig,
} from "@fableon/folk-motion";

import type { HostedProviderId } from "./catalog";

interface PackPartRecord {
  readonly id: string;
  readonly rigId?: string;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly sourcePivot: { readonly x: number; readonly y: number };
  readonly targetPivot: { readonly x: number; readonly y: number };
}

export interface PackManifestRecord {
  readonly rigId?: string;
  readonly parts: readonly PackPartRecord[];
}

const CHILD_SOCKET_ROLE: Readonly<Record<string, string>> = {
  nearUpperArm: "shoulder",
  farUpperArm: "shoulder",
  nearForearm: "elbow",
  farForearm: "elbow",
  handOpen: "wrist",
  handGrip: "wrist",
  farHand: "wrist",
  nearThigh: "hip",
  farThigh: "hip",
  nearShin: "knee",
  farShin: "knee",
  nearFoot: "ankle",
  farFoot: "ankle",
  neck: "base",
  head: "neck",
  torso: "waist",
};

function normPoint(
  point: { readonly x: number; readonly y: number },
  part: PackPartRecord,
): { readonly x: number; readonly y: number } {
  return {
    x: (point.x - part.offsetX) / part.width,
    y: (point.y - part.offsetY) / part.height,
  };
}

function connectorsFor(part: PackPartRecord, nodeId: string): ConnectorDefinition[] {
  const pivot = normPoint(part.targetPivot, part);
  const connectors: ConnectorDefinition[] = [{ id: "socket", ...pivot, kind: "joint" }];
  const role = CHILD_SOCKET_ROLE[nodeId];
  if (role && role !== "socket") connectors.push({ id: role, ...pivot, kind: "joint" });
  if (nodeId === "handOpen" || nodeId === "handGrip" || nodeId === "farHand") {
    const grip = normPoint({ x: part.targetPivot.x, y: part.targetPivot.y + 30 }, part);
    connectors.push({ id: "grip", ...grip, kind: "grip" });
  }
  if (nodeId === "nearFoot" || nodeId === "farFoot") {
    const sole = normPoint({ x: part.targetPivot.x, y: part.targetPivot.y + 28 }, part);
    connectors.push({ id: "sole", ...sole, kind: "contact" });
  }
  return connectors;
}

export function buildConnectorRig(
  provider: HostedProviderId,
  manifest: PackManifestRecord,
): ConnectorRig {
  const partsById = new Map(manifest.parts.map((part) => [part.id, part]));
  const parts: ConnectorPart[] = [];
  for (const node of ARTISAN_V2_RIG.nodes) {
    const part = partsById.get(node.partId);
    if (!part) throw new Error(`Connector calibration is missing part "${node.partId}".`);
    const attachment = node.parentId
      ? {
          parentPartId: ARTISAN_V2_RIG.nodes.find((entry) => entry.id === node.parentId)!.partId,
          parentConnector: `attach_${node.id}`,
          childConnector: "socket",
          ...(node.joint?.limits
            ? { limitsDeg: { min: node.joint.limits.min, max: node.joint.limits.max } }
            : {}),
        }
      : undefined;
    parts.push({
      id: node.partId,
      rigNodeId: node.id,
      partId: node.partId,
      drawOrder: node.drawOrder,
      crop: {
        x: part.offsetX,
        y: part.offsetY,
        width: part.width,
        height: part.height,
        sourceWidth: part.width / part.scale,
        sourceHeight: part.height / part.scale,
      },
      scale: part.scale,
      connectors: connectorsFor(part, node.id),
      ...(attachment ? { attachment } : {}),
      notes: `Calibrated from ${provider} Stage 2B registration; pivot and connector positions derive from sourcePivot and targetPivot.`,
    });
  }

  const byPart = new Map(parts.map((part) => [part.id, part]));
  const byNode = new Map(ARTISAN_V2_RIG.nodes.map((node) => [node.id, node]));
  for (const node of ARTISAN_V2_RIG.nodes) {
    if (!node.parentId) continue;
    const child = partsById.get(node.partId);
    const parentNode = byNode.get(node.parentId);
    if (!child || !parentNode) throw new Error(`Missing connector hierarchy for ${node.id}.`);
    const parent = byPart.get(parentNode.partId);
    if (!parent) throw new Error(`Missing connector parent part for ${node.id}.`);
    if (!parent.connectors.some((entry) => entry.id === `attach_${node.id}`)) {
      const point = normPoint(child.targetPivot, partsById.get(parentNode.partId)!);
      (parent.connectors as ConnectorDefinition[]).push({
        id: `attach_${node.id}`,
        ...point,
        kind: "joint",
      });
    }
  }

  return {
    id: `artisan_${provider}_connectors_v1`,
    rootPartId: "artisan_pelvis",
    parts,
  };
}

/**
 * The bell uses its own local connector space. These values are intentionally
 * separate from the character artwork and never replace the image.
 */
export function bellConnectorProp(): {
  id: string;
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
    sourceWidth: number;
    sourceHeight: number;
  };
  connectors: ConnectorDefinition[];
} {
  return {
    id: "bell",
    crop: { x: -72, y: -250, width: 144, height: 250, sourceWidth: 144, sourceHeight: 250 },
    connectors: [
      { id: "grip", x: 0.5, y: 0.08, kind: "grip" },
      { id: "placement", x: 0.5, y: 1, kind: "contact" },
    ],
  };
}
