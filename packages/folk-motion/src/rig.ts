import {
  multiplyMatrices,
  rotationMatrix,
  scaleMatrix,
  translationMatrix,
  type Matrix2D,
  type Vec2,
} from "@fableon/sprite-motion";

export interface FolkRigNode {
  readonly id: string;
  readonly partId: string;
  readonly parentId: string | null;
  /** Pivot in the master artwork's coordinate space. */
  readonly pivot: Vec2;
  readonly drawOrder: number;
  readonly visible?: boolean;
}

export interface FolkRig {
  readonly id: string;
  readonly nodes: readonly FolkRigNode[];
}

export interface FolkNodePose {
  readonly x?: number;
  readonly y?: number;
  readonly rotation?: number;
  readonly scaleX?: number;
  readonly scaleY?: number;
  readonly visible?: boolean;
}

export interface FolkPose {
  readonly nodes: Readonly<Record<string, FolkNodePose>>;
}

export interface ResolvedFolkNode {
  readonly id: string;
  readonly partId: string;
  readonly parentId: string | null;
  readonly drawOrder: number;
  readonly pivot: Vec2;
  readonly visible: boolean;
  readonly world: Matrix2D;
}

export class FolkRigError extends Error {
  override readonly name = "FolkRigError";
}

function validateRig(rig: FolkRig): void {
  if (rig.nodes.length === 0) throw new FolkRigError("A folk rig must contain at least one node.");
  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const node of rig.nodes) {
    if (ids.has(node.id)) throw new FolkRigError(`Duplicate folk node "${node.id}".`);
    if (orders.has(node.drawOrder)) {
      throw new FolkRigError(`Duplicate draw order ${node.drawOrder} in "${rig.id}".`);
    }
    ids.add(node.id);
    orders.add(node.drawOrder);
  }
  for (const node of rig.nodes) {
    if (node.parentId !== null && !ids.has(node.parentId)) {
      throw new FolkRigError(`Node "${node.id}" references missing parent "${node.parentId}".`);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byId = new Map(rig.nodes.map((node) => [node.id, node]));
  const visit = (id: string) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new FolkRigError(`Cycle in folk rig "${rig.id}" at "${id}".`);
    visiting.add(id);
    const node = byId.get(id);
    if (node?.parentId) visit(node.parentId);
    visiting.delete(id);
    visited.add(id);
  };
  for (const node of rig.nodes) visit(node.id);
}

function nodeLocalMatrix(node: FolkRigNode, pose: FolkNodePose | undefined): Matrix2D {
  const x = pose?.x ?? 0;
  const y = pose?.y ?? 0;
  const rotation = pose?.rotation ?? 0;
  const scaleX = pose?.scaleX ?? 1;
  const scaleY = pose?.scaleY ?? 1;
  return multiplyMatrices(
    translationMatrix(node.pivot.x + x, node.pivot.y + y),
    multiplyMatrices(
      rotationMatrix(rotation),
      multiplyMatrices(
        scaleMatrix(scaleX, scaleY),
        translationMatrix(-node.pivot.x, -node.pivot.y),
      ),
    ),
  );
}

export function resolveFolkPose(rig: FolkRig, pose: FolkPose): readonly ResolvedFolkNode[] {
  validateRig(rig);
  const byId = new Map(rig.nodes.map((node) => [node.id, node]));
  const resolved = new Map<string, ResolvedFolkNode>();
  const resolve = (node: FolkRigNode): ResolvedFolkNode => {
    const cached = resolved.get(node.id);
    if (cached) return cached;
    const parentWorld =
      node.parentId === null ? null : resolve(byId.get(node.parentId) as FolkRigNode).world;
    const local = nodeLocalMatrix(node, pose.nodes[node.id]);
    const world = parentWorld ? multiplyMatrices(parentWorld, local) : local;
    const result: ResolvedFolkNode = {
      id: node.id,
      partId: node.partId,
      parentId: node.parentId,
      drawOrder: node.drawOrder,
      pivot: node.pivot,
      visible: pose.nodes[node.id]?.visible ?? node.visible ?? true,
      world,
    };
    resolved.set(node.id, result);
    return result;
  };
  return Object.freeze(
    rig.nodes.map(resolve).sort((left, right) => left.drawOrder - right.drawOrder),
  );
}
