import {
  multiplyMatrices,
  rotationMatrix,
  transformPoint,
  translationMatrix,
  type Matrix2D,
  type Vec2,
} from "@fableon/sprite-motion";

import type { FolkPose } from "./rig";

export interface ConnectorPoint {
  /** Normalized within the registered sprite rectangle, 0..1. */
  readonly x: number;
  readonly y: number;
}

export interface ConnectorDefinition extends ConnectorPoint {
  readonly id: string;
  readonly kind?: "joint" | "grip" | "contact" | "accessory";
}

export interface ConnectorCrop {
  /** Registered sprite rectangle in rig-local space. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
}

export interface ConnectorAttachment {
  readonly parentPartId: string;
  readonly parentConnector: string;
  readonly childConnector: string;
  readonly rotationOffsetDeg?: number;
  readonly limitsDeg?: { readonly min: number; readonly max: number };
}

export interface ConnectorPart {
  readonly id: string;
  readonly rigNodeId: string;
  readonly partId: string;
  readonly drawOrder: number;
  readonly crop: ConnectorCrop;
  readonly scale: number;
  readonly connectors: readonly ConnectorDefinition[];
  readonly attachment?: ConnectorAttachment;
  readonly notes?: string;
}

export interface ConnectorRig {
  readonly id: string;
  readonly rootPartId: string;
  readonly parts: readonly ConnectorPart[];
}

export interface ResolvedConnectorPart {
  readonly id: string;
  readonly partId: string;
  readonly drawOrder: number;
  readonly visible: boolean;
  readonly world: Matrix2D;
  readonly connectors: Readonly<Record<string, Vec2>>;
  readonly parentConnectorWorld: Vec2 | null;
  readonly childConnectorWorld: Vec2 | null;
  readonly alignmentError: number;
}

export interface ConnectorDiagnostic {
  readonly childPartId: string;
  readonly parentPartId: string;
  readonly parentConnector: string;
  readonly childConnector: string;
  readonly alignmentError: number;
}

export class ConnectorRigError extends Error {
  override readonly name = "ConnectorRigError";
}

export function connectorPoint(part: ConnectorPart, connectorId: string): Vec2 {
  const connector = part.connectors.find((entry) => entry.id === connectorId);
  if (!connector) {
    throw new ConnectorRigError(`Part "${part.id}" has no connector "${connectorId}".`);
  }
  return {
    x: part.crop.x + connector.x * part.crop.width,
    y: part.crop.y + connector.y * part.crop.height,
  };
}

export function connectorLocalToSource(part: ConnectorPart, connectorId: string): Vec2 {
  const connector = part.connectors.find((entry) => entry.id === connectorId);
  if (!connector) {
    throw new ConnectorRigError(`Part "${part.id}" has no connector "${connectorId}".`);
  }
  return {
    x: connector.x * part.crop.sourceWidth,
    y: connector.y * part.crop.sourceHeight,
  };
}

export function validateConnectorRig(rig: ConnectorRig): void {
  if (rig.parts.length === 0) throw new ConnectorRigError("Connector rig has no parts.");
  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const part of rig.parts) {
    if (ids.has(part.id)) throw new ConnectorRigError(`Duplicate connector part "${part.id}".`);
    if (orders.has(part.drawOrder)) {
      throw new ConnectorRigError(`Duplicate draw order ${part.drawOrder}.`);
    }
    ids.add(part.id);
    orders.add(part.drawOrder);
    if (!Number.isFinite(part.scale) || part.scale <= 0) {
      throw new ConnectorRigError(`Part "${part.id}" has an invalid scale.`);
    }
    if (
      ![part.crop.x, part.crop.y, part.crop.width, part.crop.height].every((value) =>
        Number.isFinite(value),
      ) ||
      part.crop.width <= 0 ||
      part.crop.height <= 0
    ) {
      throw new ConnectorRigError(`Part "${part.id}" has an invalid crop rectangle.`);
    }
    const connectorIds = new Set<string>();
    for (const connector of part.connectors) {
      if (connectorIds.has(connector.id)) {
        throw new ConnectorRigError(`Part "${part.id}" has duplicate connector "${connector.id}".`);
      }
      connectorIds.add(connector.id);
      if (!Number.isFinite(connector.x) || !Number.isFinite(connector.y)) {
        throw new ConnectorRigError(`Part "${part.id}" connector "${connector.id}" is nonfinite.`);
      }
    }
    if (part.attachment) {
      if (!ids.has(part.attachment.parentPartId) && part.attachment.parentPartId === part.id) {
        throw new ConnectorRigError(`Part "${part.id}" cannot attach to itself.`);
      }
      const parent = rig.parts.find((entry) => entry.id === part.attachment?.parentPartId);
      if (!parent) {
        throw new ConnectorRigError(
          `Part "${part.id}" references missing parent "${part.attachment.parentPartId}".`,
        );
      }
      if (!part.connectors.some((entry) => entry.id === part.attachment?.childConnector)) {
        throw new ConnectorRigError(
          `Part "${part.id}" attachment references missing child connector "${part.attachment.childConnector}".`,
        );
      }
      if (!parent.connectors.some((entry) => entry.id === part.attachment?.parentConnector)) {
        throw new ConnectorRigError(
          `Part "${part.id}" attachment references missing parent connector "${part.attachment.parentConnector}".`,
        );
      }
    }
  }
  const byId = new Map(rig.parts.map((part) => [part.id, part]));
  if (!byId.has(rig.rootPartId)) {
    throw new ConnectorRigError(`Root part "${rig.rootPartId}" is missing.`);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new ConnectorRigError(`Cycle at connector part "${id}".`);
    visiting.add(id);
    const part = byId.get(id);
    if (part?.attachment) visit(part.attachment.parentPartId);
    visiting.delete(id);
    visited.add(id);
  };
  for (const part of rig.parts) visit(part.id);
  const roots = rig.parts.filter((part) => !part.attachment);
  if (roots.length !== 1 || roots[0]?.id !== rig.rootPartId) {
    throw new ConnectorRigError(
      `Connector rig must have exactly one root "${rig.rootPartId}"; found ${roots
        .map((part) => part.id)
        .join(", ")}.`,
    );
  }
}

export function clampConnectorRotation(part: ConnectorPart, rotation: number): number {
  return part.attachment?.limitsDeg
    ? Math.min(Math.max(rotation, part.attachment.limitsDeg.min), part.attachment.limitsDeg.max)
    : rotation;
}

export function connectorRotationFor(part: ConnectorPart, rotation: number): number {
  return rotation + (part.attachment?.rotationOffsetDeg ?? 0);
}

export function resolveConnectorPose(
  rig: ConnectorRig,
  pose: FolkPose,
  rootWorld: Matrix2D,
): readonly ResolvedConnectorPart[] {
  validateConnectorRig(rig);
  const byId = new Map(rig.parts.map((part) => [part.id, part]));
  const resolved = new Map<string, ResolvedConnectorPart>();
  const resolve = (part: ConnectorPart): ResolvedConnectorPart => {
    const cached = resolved.get(part.id);
    if (cached) return cached;
    const nodePose = pose.nodes[part.rigNodeId];
    const visible = nodePose?.visible ?? true;
    let world: Matrix2D;
    let parentConnectorWorld: Vec2 | null = null;
    let childConnectorWorld: Vec2 | null = null;
    let alignmentError = 0;
    if (!part.attachment) {
      world = rootWorld;
    } else {
      const parent = byId.get(part.attachment.parentPartId);
      if (!parent) throw new ConnectorRigError(`Missing parent "${part.attachment.parentPartId}".`);
      const resolvedParent = resolve(parent);
      const parentPoint = connectorPoint(parent, part.attachment.parentConnector);
      const childPoint = connectorPoint(part, part.attachment.childConnector);
      parentConnectorWorld = transformPoint(resolvedParent.world, parentPoint);
      const rotation = connectorRotationFor(part, nodePose?.rotation ?? 0);
      // Connected parts cannot add an independent translation: that would
      // break the socket guarantee. Root translation is applied by rootWorld.
      const translation = {
        x: parentConnectorWorld.x,
        y: parentConnectorWorld.y,
      };
      const parentRotation = {
        a: resolvedParent.world.a,
        b: resolvedParent.world.b,
        c: resolvedParent.world.c,
        d: resolvedParent.world.d,
        e: 0,
        f: 0,
      };
      world = multiplyMatrices(
        translationMatrix(translation.x, translation.y),
        multiplyMatrices(
          parentRotation,
          multiplyMatrices(
            rotationMatrix(rotation),
            translationMatrix(-childPoint.x, -childPoint.y),
          ),
        ),
      );
      childConnectorWorld = transformPoint(world, childPoint);
      alignmentError = Math.hypot(
        parentConnectorWorld.x - childConnectorWorld.x,
        parentConnectorWorld.y - childConnectorWorld.y,
      );
    }
    const connectors = Object.fromEntries(
      part.connectors.map((connector) => {
        const point = connectorPoint(part, connector.id);
        return [connector.id, transformPoint(world, point)];
      }),
    );
    const result: ResolvedConnectorPart = {
      id: part.id,
      partId: part.partId,
      drawOrder: part.drawOrder,
      visible,
      world,
      connectors,
      parentConnectorWorld,
      childConnectorWorld,
      alignmentError,
    };
    resolved.set(part.id, result);
    return result;
  };
  return Object.freeze(
    rig.parts.map(resolve).sort((left, right) => left.drawOrder - right.drawOrder),
  );
}

export function connectorDiagnostics(
  resolved: readonly ResolvedConnectorPart[],
  rig: ConnectorRig,
): readonly ConnectorDiagnostic[] {
  const byId = new Map(rig.parts.map((part) => [part.id, part]));
  return resolved
    .filter((part) => byId.get(part.id)?.attachment)
    .map((part) => {
      const attachment = byId.get(part.id)!.attachment!;
      return {
        childPartId: part.id,
        parentPartId: attachment.parentPartId,
        parentConnector: attachment.parentConnector,
        childConnector: attachment.childConnector,
        alignmentError: part.alignmentError,
      };
    });
}

export interface ConnectorProp {
  readonly id: string;
  readonly crop: ConnectorCrop;
  readonly connectors: readonly ConnectorDefinition[];
}

export function attachPropToConnector(input: {
  readonly prop: ConnectorProp;
  readonly propConnector: string;
  readonly handWorld: Matrix2D;
  readonly handConnectorPoint: Vec2;
  readonly rotationDeg?: number;
}): { readonly world: Matrix2D; readonly connectorWorld: Vec2 } {
  const propConnector = input.prop.connectors.find((entry) => entry.id === input.propConnector);
  if (!propConnector) {
    throw new ConnectorRigError(
      `Prop "${input.prop.id}" has no connector "${input.propConnector}".`,
    );
  }
  const propPoint = {
    x: input.prop.crop.x + propConnector.x * input.prop.crop.width,
    y: input.prop.crop.y + propConnector.y * input.prop.crop.height,
  };
  const handConnectorWorld = transformPoint(input.handWorld, input.handConnectorPoint);
  const world = multiplyMatrices(
    translationMatrix(handConnectorWorld.x, handConnectorWorld.y),
    multiplyMatrices(
      rotationMatrix(input.rotationDeg ?? 0),
      translationMatrix(-propPoint.x, -propPoint.y),
    ),
  );
  return { world, connectorWorld: transformPoint(world, propPoint) };
}
