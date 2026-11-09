import type { FolkRig } from "./rig";

function namespaceRig(rig: FolkRig, prefix: string): FolkRig {
  return {
    ...rig,
    nodes: rig.nodes.map((node) => ({ ...node, partId: `${prefix}_${node.partId}` })),
  };
}

const ARTISAN_RIG_BASE: FolkRig = {
  id: "artisan_01",
  nodes: [
    {
      id: "turbanTail",
      partId: "turbanTail",
      parentId: "head",
      pivot: { x: 430, y: 320 },
      drawOrder: 0,
    },
    {
      id: "farHand",
      partId: "farHand",
      parentId: "farForearm",
      pivot: { x: 442, y: 742 },
      drawOrder: 2,
    },
    {
      id: "farForearm",
      partId: "farForearm",
      parentId: "farUpperArm",
      pivot: { x: 432, y: 610 },
      drawOrder: 3,
    },
    {
      id: "farUpperArm",
      partId: "farUpperArm",
      parentId: "torso",
      pivot: { x: 415, y: 475 },
      drawOrder: 4,
    },
    {
      id: "farDhoti",
      partId: "farDhoti",
      parentId: "farThigh",
      pivot: { x: 405, y: 670 },
      drawOrder: 5,
    },
    {
      id: "farThigh",
      partId: "farThigh",
      parentId: "pelvis",
      pivot: { x: 405, y: 670 },
      drawOrder: 6,
    },
    {
      id: "farShin",
      partId: "farShin",
      parentId: "farThigh",
      pivot: { x: 402, y: 824 },
      drawOrder: 7,
    },
    {
      id: "farFoot",
      partId: "farFoot",
      parentId: "farShin",
      pivot: { x: 398, y: 978 },
      drawOrder: 8,
    },
    { id: "pelvis", partId: "pelvis", parentId: null, pivot: { x: 440, y: 660 }, drawOrder: 10 },
    {
      id: "nearDhoti",
      partId: "nearDhoti",
      parentId: "nearThigh",
      pivot: { x: 470, y: 670 },
      drawOrder: 12,
    },
    {
      id: "nearThigh",
      partId: "nearThigh",
      parentId: "pelvis",
      pivot: { x: 470, y: 670 },
      drawOrder: 13,
    },
    {
      id: "nearShin",
      partId: "nearShin",
      parentId: "nearThigh",
      pivot: { x: 476, y: 824 },
      drawOrder: 14,
    },
    {
      id: "nearFoot",
      partId: "nearFoot",
      parentId: "nearShin",
      pivot: { x: 480, y: 978 },
      drawOrder: 15,
    },
    { id: "torso", partId: "torso", parentId: "pelvis", pivot: { x: 440, y: 540 }, drawOrder: 20 },
    { id: "sash", partId: "sash", parentId: "torso", pivot: { x: 450, y: 648 }, drawOrder: 22 },
    {
      id: "necklace",
      partId: "necklace",
      parentId: "torso",
      pivot: { x: 476, y: 450 },
      drawOrder: 24,
    },
    { id: "neck", partId: "neck", parentId: "torso", pivot: { x: 470, y: 440 }, drawOrder: 25 },
    { id: "head", partId: "head", parentId: "neck", pivot: { x: 470, y: 340 }, drawOrder: 30 },
    { id: "eye", partId: "eye", parentId: "head", pivot: { x: 500, y: 305 }, drawOrder: 31 },
    { id: "eyelid", partId: "eyelid", parentId: "head", pivot: { x: 500, y: 305 }, drawOrder: 32 },
    { id: "brow", partId: "brow", parentId: "head", pivot: { x: 500, y: 286 }, drawOrder: 33 },
    {
      id: "mustache",
      partId: "mustache",
      parentId: "head",
      pivot: { x: 530, y: 355 },
      drawOrder: 34,
    },
    {
      id: "earring",
      partId: "earring",
      parentId: "head",
      pivot: { x: 444, y: 350 },
      drawOrder: 35,
    },
    { id: "turban", partId: "turban", parentId: "head", pivot: { x: 470, y: 250 }, drawOrder: 36 },
    {
      id: "shoulderSash",
      partId: "shoulderSash",
      parentId: "torso",
      pivot: { x: 500, y: 440 },
      drawOrder: 37,
    },
    {
      id: "nearUpperArm",
      partId: "nearUpperArm",
      parentId: "torso",
      pivot: { x: 508, y: 470 },
      drawOrder: 40,
    },
    {
      id: "nearForearm",
      partId: "nearForearm",
      parentId: "nearUpperArm",
      pivot: { x: 532, y: 610 },
      drawOrder: 41,
    },
    {
      id: "handOpen",
      partId: "handOpen",
      parentId: "nearForearm",
      pivot: { x: 548, y: 742 },
      drawOrder: 42,
    },
    {
      id: "handGrip",
      partId: "handGrip",
      parentId: "nearForearm",
      pivot: { x: 548, y: 742 },
      drawOrder: 43,
      visible: false,
    },
  ],
};

const HORSE_RIG_BASE: FolkRig = {
  id: "horse_01",
  nodes: [
    {
      id: "tailTuft",
      partId: "tailTuft",
      parentId: "tailBase",
      pivot: { x: 320, y: 560 },
      drawOrder: 1,
    },
    {
      id: "tailBase",
      partId: "tailBase",
      parentId: "torso",
      pivot: { x: 452, y: 380 },
      drawOrder: 2,
    },
    {
      id: "farFrontHoof",
      partId: "farFrontHoof",
      parentId: "farFrontLower",
      pivot: { x: 796, y: 824 },
      drawOrder: 3,
    },
    {
      id: "farFrontLower",
      partId: "farFrontLower",
      parentId: "farFrontUpper",
      pivot: { x: 796, y: 680 },
      drawOrder: 4,
    },
    {
      id: "farFrontUpper",
      partId: "farFrontUpper",
      parentId: "torso",
      pivot: { x: 792, y: 520 },
      drawOrder: 5,
    },
    {
      id: "farHindHoof",
      partId: "farHindHoof",
      parentId: "farHindLower",
      pivot: { x: 458, y: 824 },
      drawOrder: 6,
    },
    {
      id: "farHindLower",
      partId: "farHindLower",
      parentId: "farHindUpper",
      pivot: { x: 458, y: 680 },
      drawOrder: 7,
    },
    {
      id: "farHindUpper",
      partId: "farHindUpper",
      parentId: "torso",
      pivot: { x: 452, y: 520 },
      drawOrder: 8,
    },
    { id: "torso", partId: "torso", parentId: null, pivot: { x: 650, y: 430 }, drawOrder: 10 },
    { id: "mane", partId: "mane", parentId: "torso", pivot: { x: 930, y: 320 }, drawOrder: 12 },
    {
      id: "saddleBlanket",
      partId: "saddleBlanket",
      parentId: "torso",
      pivot: { x: 700, y: 400 },
      drawOrder: 14,
    },
    { id: "neck", partId: "neck", parentId: "torso", pivot: { x: 880, y: 400 }, drawOrder: 15 },
    {
      id: "harnessCollar",
      partId: "harnessCollar",
      parentId: "torso",
      pivot: { x: 900, y: 430 },
      drawOrder: 16,
    },
    {
      id: "harnessStrap",
      partId: "harnessStrap",
      parentId: "torso",
      pivot: { x: 690, y: 500 },
      drawOrder: 17,
    },
    { id: "farEar", partId: "farEar", parentId: "head", pivot: { x: 1035, y: 175 }, drawOrder: 18 },
    {
      id: "harnessAnchor",
      partId: "harnessAnchor",
      parentId: "torso",
      pivot: { x: 930, y: 452 },
      drawOrder: 19,
    },
    { id: "head", partId: "head", parentId: "neck", pivot: { x: 1060, y: 270 }, drawOrder: 20 },
    { id: "eye", partId: "eye", parentId: "head", pivot: { x: 1068, y: 270 }, drawOrder: 22 },
    {
      id: "forelock",
      partId: "forelock",
      parentId: "head",
      pivot: { x: 1050, y: 220 },
      drawOrder: 23,
    },
    {
      id: "nearEar",
      partId: "nearEar",
      parentId: "head",
      pivot: { x: 1060, y: 170 },
      drawOrder: 24,
    },
    { id: "bridle", partId: "bridle", parentId: "head", pivot: { x: 1090, y: 290 }, drawOrder: 25 },
    {
      id: "nearFrontUpper",
      partId: "nearFrontUpper",
      parentId: "torso",
      pivot: { x: 860, y: 520 },
      drawOrder: 40,
    },
    {
      id: "nearFrontLower",
      partId: "nearFrontLower",
      parentId: "nearFrontUpper",
      pivot: { x: 866, y: 680 },
      drawOrder: 41,
    },
    {
      id: "nearFrontHoof",
      partId: "nearFrontHoof",
      parentId: "nearFrontLower",
      pivot: { x: 866, y: 824 },
      drawOrder: 42,
    },
    {
      id: "nearHindUpper",
      partId: "nearHindUpper",
      parentId: "torso",
      pivot: { x: 520, y: 520 },
      drawOrder: 45,
    },
    {
      id: "nearHindLower",
      partId: "nearHindLower",
      parentId: "nearHindUpper",
      pivot: { x: 516, y: 680 },
      drawOrder: 46,
    },
    {
      id: "nearHindHoof",
      partId: "nearHindHoof",
      parentId: "nearHindLower",
      pivot: { x: 516, y: 824 },
      drawOrder: 47,
    },
  ],
};

const CART_RIG_BASE: FolkRig = {
  id: "cart_01",
  nodes: [
    {
      id: "farWheel",
      partId: "farWheel",
      parentId: "cartBody",
      pivot: { x: 580, y: 600 },
      drawOrder: 2,
    },
    {
      id: "shafts",
      partId: "shafts",
      parentId: "cartBody",
      pivot: { x: 610, y: 430 },
      drawOrder: 5,
    },
    {
      id: "cartBody",
      partId: "cartBody",
      parentId: null,
      pivot: { x: 360, y: 380 },
      drawOrder: 10,
    },
    {
      id: "nearWheel",
      partId: "nearWheel",
      parentId: "cartBody",
      pivot: { x: 250, y: 590 },
      drawOrder: 12,
    },
  ],
};

export const ARTISAN_RIG = namespaceRig(ARTISAN_RIG_BASE, "artisan");
export const HORSE_RIG = namespaceRig(HORSE_RIG_BASE, "horse");
export const CART_RIG = namespaceRig(CART_RIG_BASE, "cart");
export const BELL_RIG: FolkRig = {
  id: "bell_01",
  nodes: [
    { id: "bell", partId: "bell_bell", parentId: null, pivot: { x: 90, y: 16 }, drawOrder: 1 },
  ],
};

export const ARTISAN_FOOT_LOCAL = {
  near: { x: 480, y: 978 },
  far: { x: 398, y: 978 },
} as const;

export const ARTISAN_HAND_LOCAL = { x: 548, y: 742 } as const;
export const ARTISAN_SHOULDER_LOCAL = { x: 508, y: 470 } as const;
export const HORSE_HARNESS_LOCAL = { x: 930, y: 452 } as const;

export const HORSE_LEG_LOCAL = {
  nearFront: { hip: { x: 860, y: 520 }, knee: { x: 866, y: 680 }, ankle: { x: 866, y: 824 } },
  farFront: { hip: { x: 792, y: 520 }, knee: { x: 796, y: 680 }, ankle: { x: 796, y: 824 } },
  nearHind: { hip: { x: 520, y: 520 }, knee: { x: 516, y: 680 }, ankle: { x: 516, y: 824 } },
  farHind: { hip: { x: 452, y: 520 }, knee: { x: 458, y: 680 }, ankle: { x: 458, y: 824 } },
} as const;
