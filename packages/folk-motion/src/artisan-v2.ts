import type { FolkJoint } from "./joints";
import type { FolkRig, FolkRigNode } from "./rig";
import { ARTISAN_RIG } from "./rigs";

/**
 * Improved draw order for generated character packs. Limbs that meet a covered
 * joint sit behind the garment piece that conceals the seam, while the forearm
 * and hand sit above the upper arm so the elbow cuff owns the visible edge.
 */
const V2_DRAW_ORDER: Readonly<Record<string, number>> = {
  turbanTail: 0,
  farUpperArm: 2,
  farForearm: 3,
  farElbowCover: 4,
  farHand: 5,
  farThigh: 6,
  farShin: 7,
  farFoot: 8,
  farDhoti: 9,
  pelvis: 11,
  nearThigh: 12,
  nearShin: 13,
  nearFoot: 14,
  nearDhoti: 15,
  nearUpperArm: 18,
  torso: 20,
  sash: 22,
  neck: 25,
  necklace: 26,
  head: 30,
  eye: 31,
  eyelid: 32,
  brow: 33,
  mustache: 34,
  earring: 35,
  turban: 36,
  shoulderSash: 37,
  nearForearm: 41,
  nearElbowCover: 42,
  handOpen: 43,
  handGrip: 44,
};

function joint(
  kind: FolkJoint["kind"],
  parentNodeId: string,
  overlap: FolkJoint["overlap"],
  occlusion: FolkJoint["occlusion"],
  limits: FolkJoint["limits"],
  coverNodeId?: string,
): FolkJoint {
  return {
    kind,
    parentNodeId,
    overlap,
    occlusion,
    limits,
    ...(coverNodeId ? { coverNodeId } : {}),
  };
}

const SHOULDER_OVERLAP = { x: -22, y: -18, width: 44, height: 50 } as const;
const ELBOW_OVERLAP = { x: -18, y: -20, width: 36, height: 44 } as const;
const WRIST_OVERLAP = { x: -14, y: -14, width: 28, height: 30 } as const;
const HIP_OVERLAP = { x: -18, y: -18, width: 36, height: 44 } as const;
const KNEE_OVERLAP = { x: -16, y: -16, width: 32, height: 38 } as const;
const ANKLE_OVERLAP = { x: -14, y: -14, width: 28, height: 28 } as const;
const NECK_OVERLAP = { x: -16, y: -14, width: 32, height: 30 } as const;

const JOINTS: Readonly<Record<string, FolkJoint>> = {
  farUpperArm: joint("shoulder", "torso", SHOULDER_OVERLAP, "parent-over-child", {
    min: -95,
    max: 95,
  }),
  nearUpperArm: joint("shoulder", "torso", SHOULDER_OVERLAP, "parent-over-child", {
    min: -95,
    max: 95,
  }),
  farForearm: joint(
    "elbow",
    "farUpperArm",
    ELBOW_OVERLAP,
    "cover-over",
    { min: -140, max: 5 },
    "farElbowCover",
  ),
  nearForearm: joint(
    "elbow",
    "nearUpperArm",
    ELBOW_OVERLAP,
    "cover-over",
    { min: -140, max: 5 },
    "nearElbowCover",
  ),
  farHand: joint("wrist", "farForearm", WRIST_OVERLAP, "child-over-parent", {
    min: -70,
    max: 70,
  }),
  handOpen: joint("wrist", "nearForearm", WRIST_OVERLAP, "child-over-parent", {
    min: -70,
    max: 70,
  }),
  handGrip: joint("wrist", "nearForearm", WRIST_OVERLAP, "child-over-parent", {
    min: -70,
    max: 70,
  }),
  farThigh: joint("hip", "pelvis", HIP_OVERLAP, "cover-over", { min: -45, max: 45 }, "farDhoti"),
  nearThigh: joint("hip", "pelvis", HIP_OVERLAP, "cover-over", { min: -45, max: 45 }, "nearDhoti"),
  farShin: joint("knee", "farThigh", KNEE_OVERLAP, "child-over-parent", {
    min: -5,
    max: 85,
  }),
  nearShin: joint("knee", "nearThigh", KNEE_OVERLAP, "child-over-parent", {
    min: -5,
    max: 85,
  }),
  farFoot: joint("ankle", "farShin", ANKLE_OVERLAP, "child-over-parent", {
    min: -35,
    max: 35,
  }),
  nearFoot: joint("ankle", "nearShin", ANKLE_OVERLAP, "child-over-parent", {
    min: -35,
    max: 35,
  }),
  neck: joint("neck", "torso", NECK_OVERLAP, "cover-over", { min: -35, max: 35 }, "necklace"),
  head: joint("neck", "neck", NECK_OVERLAP, "child-over-parent", { min: -35, max: 35 }),
};

function v2Node(node: FolkRigNode): FolkRigNode {
  const drawOrder = V2_DRAW_ORDER[node.id];
  if (drawOrder === undefined) throw new Error(`No Stage 2B draw order for "${node.id}".`);
  return {
    ...node,
    drawOrder,
    ...(JOINTS[node.id] ? { joint: JOINTS[node.id] } : {}),
  };
}

/**
 * Artisan rig for the complete generated-character packs. It preserves the
 * existing node IDs, pivots and part IDs so `artisanPose` and the film
 * evaluator remain compatible.
 */
export const ARTISAN_V2_RIG: FolkRig = {
  id: "artisan_v2",
  nodes: [
    ...ARTISAN_RIG.nodes.map(v2Node),
    {
      id: "nearElbowCover",
      partId: "artisan_nearElbowCover",
      parentId: "nearForearm",
      pivot: { x: 532, y: 610 },
      drawOrder: V2_DRAW_ORDER["nearElbowCover"]!,
    },
    {
      id: "farElbowCover",
      partId: "artisan_farElbowCover",
      parentId: "farForearm",
      pivot: { x: 432, y: 610 },
      drawOrder: V2_DRAW_ORDER["farElbowCover"]!,
    },
  ],
};

export const ARTISAN_V2_REQUIRED_PARTS: readonly string[] = Object.freeze(
  ARTISAN_V2_RIG.nodes.map((node) => node.partId),
);

export const ARTISAN_V2_JOINTS: readonly FolkJoint[] = Object.freeze(
  ARTISAN_V2_RIG.nodes.flatMap((node) => (node.joint ? [node.joint] : [])),
);
