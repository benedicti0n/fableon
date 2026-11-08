import { describe, expect, it } from "vitest";

import {
  evaluateSpriteRig,
  localMatrix,
  multiplyMatrices,
  rotationMatrix,
  scaleMatrix,
  SpriteRigError,
  transformPoint,
  translationMatrix,
  type SpriteNodeDefinition,
  type SpriteRigDefinition,
  type SpriteTransform,
} from "./index";

const IDENTITY_TRANSFORM: SpriteTransform = {
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
};

function node(id: string, overrides: Partial<SpriteNodeDefinition> = {}): SpriteNodeDefinition {
  return {
    id,
    parentId: null,
    pivot: { x: 0, y: 0 },
    drawOrder: 0,
    transform: IDENTITY_TRANSFORM,
    ...overrides,
  };
}

function makeRig(): SpriteRigDefinition {
  return {
    nodes: [
      node("body", {
        pivot: { x: 50, y: 50 },
        drawOrder: 10,
        transform: { ...IDENTITY_TRANSFORM, x: 100, y: 200 },
      }),
      node("head", {
        parentId: "body",
        pivot: { x: 10, y: 10 },
        drawOrder: 20,
        transform: { ...IDENTITY_TRANSFORM, x: 50, y: 50 },
      }),
      node("wing", {
        parentId: "body",
        pivot: { x: 0, y: 0 },
        drawOrder: 5,
        transform: { ...IDENTITY_TRANSFORM, x: 70, y: 50 },
        tracks: {
          rotation: {
            keyframes: [
              { frame: 0, value: 0, interpolation: "linear" },
              { frame: 24, value: 90, interpolation: "linear" },
            ],
          },
        },
      }),
    ],
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}

describe("sprite matrix math", () => {
  it("composes translation, rotation, and scale in canvas order", () => {
    const matrix = multiplyMatrices(
      multiplyMatrices(translationMatrix(100, 200), rotationMatrix(90)),
      scaleMatrix(2, 3),
    );
    const point = transformPoint(matrix, { x: 1, y: 1 });

    expect(point.x).toBeCloseTo(97, 10);
    expect(point.y).toBeCloseTo(202, 10);
  });

  it("places a pivot at the node translation", () => {
    const matrix = localMatrix(
      { ...IDENTITY_TRANSFORM, x: 100, y: 200, rotation: 37, scaleX: 1.5, scaleY: 0.7 },
      { x: 20, y: 30 },
    );

    const pivot = transformPoint(matrix, { x: 20, y: 30 });
    expect(pivot.x).toBeCloseTo(100, 10);
    expect(pivot.y).toBeCloseTo(200, 10);
  });
});

describe("hierarchical sprite evaluation", () => {
  it("resolves parent-child attachment through the parent image space", () => {
    const evaluated = evaluateSpriteRig(makeRig(), 0);
    const body = evaluated.find((item) => item.id === "body");
    const head = evaluated.find((item) => item.id === "head");

    expect(body).toBeDefined();
    expect(head).toBeDefined();
    if (!body || !head) return;

    expect(transformPoint(body.world, body.pivot)).toEqual({ x: 100, y: 200 });
    expect(transformPoint(head.world, head.pivot)).toEqual({ x: 100, y: 200 });
  });

  it("keeps a wing attached at its shoulder pivot while rotating", () => {
    const rig = makeRig();
    const frameZero = evaluateSpriteRig(rig, 0);
    const frameTwentyFour = evaluateSpriteRig(rig, 24);
    const wingZero = frameZero.find((item) => item.id === "wing");
    const wingTwentyFour = frameTwentyFour.find((item) => item.id === "wing");

    expect(wingZero).toBeDefined();
    expect(wingTwentyFour).toBeDefined();
    if (!wingZero || !wingTwentyFour) return;

    expect(wingZero.transform.rotation).toBe(0);
    expect(wingTwentyFour.transform.rotation).toBe(90);
    expect(transformPoint(wingZero.world, wingZero.pivot)).toEqual({ x: 120, y: 200 });
    expect(transformPoint(wingTwentyFour.world, wingTwentyFour.pivot)).toEqual({
      x: 120,
      y: 200,
    });
  });

  it("sorts output by explicit draw order independently of input order", () => {
    const rig = makeRig();
    const reordered: SpriteRigDefinition = { nodes: [...rig.nodes].reverse() };

    expect(evaluateSpriteRig(rig, 0).map((item) => item.id)).toEqual(["wing", "body", "head"]);
    expect(evaluateSpriteRig(reordered, 0).map((item) => item.id)).toEqual([
      "wing",
      "body",
      "head",
    ]);
  });

  it("samples exact frames and is repeatable", () => {
    const rig = makeRig();
    const frameTwelve = evaluateSpriteRig(rig, 12);
    const repeated = evaluateSpriteRig(rig, 12);
    const wing = frameTwelve.find((item) => item.id === "wing");

    expect(wing?.transform.rotation).toBeCloseTo(45, 10);
    expect(repeated).toEqual(frameTwelve);
  });

  it("does not mutate a frozen rig", () => {
    const rig = deepFreeze(makeRig());
    const snapshot = JSON.stringify(rig);
    const first = evaluateSpriteRig(rig, 12);
    const second = evaluateSpriteRig(rig, 12);

    expect(second).toEqual(first);
    expect(JSON.stringify(rig)).toBe(snapshot);
  });

  it("rejects duplicate IDs, missing parents, duplicates, cycles, and invalid frames", () => {
    expect(() => evaluateSpriteRig({ nodes: [node("a"), node("a", { drawOrder: 1 })] }, 0)).toThrow(
      SpriteRigError,
    );
    expect(() => evaluateSpriteRig({ nodes: [node("a", { parentId: "missing" })] }, 0)).toThrow(
      SpriteRigError,
    );
    expect(() => evaluateSpriteRig({ nodes: [node("a"), node("b")] }, 0)).toThrow(SpriteRigError);
    expect(() =>
      evaluateSpriteRig(
        {
          nodes: [node("a", { parentId: "b" }), node("b", { parentId: "a", drawOrder: 1 })],
        },
        0,
      ),
    ).toThrow(SpriteRigError);
    expect(() => evaluateSpriteRig(makeRig(), -1)).toThrow(SpriteRigError);
    expect(() => evaluateSpriteRig(makeRig(), 1.5)).toThrow(SpriteRigError);
  });
});
