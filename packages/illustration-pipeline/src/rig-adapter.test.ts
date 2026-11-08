import { describe, expect, it } from "vitest";
import { transformPoint, type SpriteRigDefinition } from "@fableon/sprite-motion";

import {
  createImportedCharacterRig,
  evaluateImportedCharacterRig,
  renderImportedCharacter,
  RigAdapterError,
  validateRigCompatibility,
  type IllustrationPack,
  type IllustrationPart,
} from "./index";

function part(overrides: Partial<IllustrationPart> = {}): IllustrationPart {
  return {
    id: "body",
    name: "Body",
    category: "character-part",
    source: "assets/body.png",
    originalSize: { width: 100, height: 100 },
    preparedSize: { width: 100, height: 100 },
    registration: { x: 0, y: 0 },
    pivot: { space: "source", x: 60, y: 70 },
    preparedOffset: { x: 0, y: 0 },
    trim: {
      applied: false,
      alphaThreshold: 0,
      contentBounds: { x: 0, y: 0, width: 100, height: 100 },
    },
    alpha: "required",
    parentId: null,
    zIndex: 50,
    role: "body",
    provenance: { kind: "diagnostic" },
    ...overrides,
  };
}

function makePack(parts: IllustrationPart[]): IllustrationPack {
  return {
    format: "fableon.illustration-pack",
    version: 1,
    id: "rig-test",
    name: "Rig Test",
    kind: "character",
    canvas: { width: 200, height: 200 },
    parts,
  };
}

const BASE_RIG: SpriteRigDefinition = {
  nodes: [
    {
      id: "body",
      parentId: null,
      pivot: { x: 50, y: 50 },
      drawOrder: 50,
      transform: { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 },
      tracks: {
        x: {
          keyframes: [
            { frame: 0, value: 100, interpolation: "linear" },
            { frame: 10, value: 140, interpolation: "hold" },
          ],
        },
      },
    },
    {
      id: "head",
      parentId: "body",
      pivot: { x: 10, y: 10 },
      drawOrder: 70,
      transform: { x: 60, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      tracks: {
        rotation: {
          keyframes: [
            { frame: 0, value: 0, interpolation: "linear" },
            { frame: 10, value: 30, interpolation: "hold" },
          ],
        },
      },
    },
    {
      id: "wingFar",
      parentId: "body",
      pivot: { x: 0, y: 0 },
      drawOrder: 20,
      transform: { x: 20, y: 20, rotation: 0, scaleX: 1, scaleY: 1 },
      tracks: {
        rotation: {
          keyframes: [
            { frame: 0, value: 0, interpolation: "linear" },
            { frame: 10, value: -40, interpolation: "hold" },
          ],
        },
      },
    },
  ],
};

function makeImages(): Map<string, CanvasImageSource> {
  return new Map<string, CanvasImageSource>([
    ["body", {} as CanvasImageSource],
    ["head", {} as CanvasImageSource],
    ["wing-far", {} as CanvasImageSource],
  ]);
}

function makeCompatiblePack(): IllustrationPack {
  return makePack([
    part(),
    part({
      id: "head",
      name: "Head",
      parentId: "body",
      zIndex: 70,
      role: "head",
      pivot: { space: "source", x: 15, y: 20 },
      source: "assets/head.png",
    }),
    part({
      id: "wing-far",
      name: "Far wing",
      parentId: "body",
      zIndex: 20,
      role: "wing-far",
      pivot: { space: "source", x: 2, y: 3 },
      source: "assets/wing-far.png",
    }),
  ]);
}

describe("imported illustration rig adapter", () => {
  it("maps imported part pivots onto the rig attachment points", () => {
    const adapter = createImportedCharacterRig(BASE_RIG, makeCompatiblePack(), makeImages());
    const body = adapter.partsByNodeId.get("body");
    const head = adapter.partsByNodeId.get("head");

    expect(body?.drawOffsetX).toBe(-10);
    expect(body?.drawOffsetY).toBe(-20);
    expect(head?.drawOffsetX).toBe(-5);
    expect(head?.drawOffsetY).toBe(-10);

    const evaluated = evaluateImportedCharacterRig(adapter, 0);
    const bodyNode = evaluated.find((node) => node.id === "body");
    const headNode = evaluated.find((node) => node.id === "head");

    expect(bodyNode?.world).toBeDefined();
    expect(headNode?.world).toBeDefined();
    if (!bodyNode || !headNode) return;

    expect(bodyNode.pivot).toEqual({ x: 50, y: 50 });
    expect(headNode.pivot).toEqual({ x: 10, y: 10 });
    expect(transformPoint(bodyNode.world, bodyNode.pivot)).toEqual({ x: 100, y: 100 });
    expect(transformPoint(headNode.world, headNode.pivot)).toEqual({ x: 110, y: 50 });
  });

  it("preserves hierarchy, draw order, and pivot registration", () => {
    const adapter = createImportedCharacterRig(BASE_RIG, makeCompatiblePack(), makeImages());
    expect(adapter.rig.nodes.map((node) => node.id)).toEqual(["wingFar", "body", "head"]);
    expect(adapter.rig.nodes.map((node) => node.drawOrder)).toEqual([20, 50, 70]);
    expect(adapter.rig.nodes.find((node) => node.id === "head")?.parentId).toBe("body");

    const body = adapter.partsByNodeId.get("body");
    const head = adapter.partsByNodeId.get("head");
    expect((body?.drawOffsetX ?? 0) + 60).toBe(50);
    expect((head?.drawOffsetX ?? 0) + 15).toBe(10);
  });

  it("renders imported pixels in pack z-order and honors hidden parts", () => {
    const adapter = createImportedCharacterRig(BASE_RIG, makeCompatiblePack(), makeImages());
    const calls: Array<{ x: number; y: number; width: number; height: number }> = [];
    const context = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
      save() {},
      restore() {},
      setTransform() {},
      drawImage(_image: CanvasImageSource, x: number, y: number, width: number, height: number) {
        calls.push({ x, y, width, height });
      },
    } as unknown as CanvasRenderingContext2D;

    renderImportedCharacter(context, 0, adapter);
    expect(calls).toEqual([
      { x: -2, y: -3, width: 100, height: 100 },
      { x: -10, y: -20, width: 100, height: 100 },
      { x: -5, y: -10, width: 100, height: 100 },
    ]);

    calls.length = 0;
    renderImportedCharacter(context, 0, adapter, { hiddenNodeIds: ["head"] });
    expect(calls).toHaveLength(2);
  });

  it("evaluates deterministically at exact frames", () => {
    const adapter = createImportedCharacterRig(BASE_RIG, makeCompatiblePack(), makeImages());
    const first = evaluateImportedCharacterRig(adapter, 5);
    const second = evaluateImportedCharacterRig(adapter, 5);
    expect(second).toEqual(first);
    expect(first.find((node) => node.id === "body")?.transform.x).toBe(120);
    expect(first.find((node) => node.id === "head")?.transform.rotation).toBe(15);
  });

  it("reports missing parts, parent mismatches, and missing images", () => {
    const missingPack = makePack([part()]);
    const missing = validateRigCompatibility(BASE_RIG, missingPack);
    expect(missing.ready).toBe(false);
    expect(missing.issues.some((issue) => issue.code === "missing-part")).toBe(true);
    expect(() => createImportedCharacterRig(BASE_RIG, missingPack, makeImages())).toThrow(
      RigAdapterError,
    );

    const badParent = makeCompatiblePack();
    const parentMismatch = makePack(
      badParent.parts.map((candidate) =>
        candidate.id === "head" ? { ...candidate, parentId: null } : candidate,
      ),
    );
    const parentReport = validateRigCompatibility(BASE_RIG, parentMismatch);
    expect(parentReport.ready).toBe(false);
    expect(parentReport.issues.some((issue) => issue.code === "parent-mismatch")).toBe(true);

    const images = makeImages();
    images.delete("head");
    expect(() => createImportedCharacterRig(BASE_RIG, makeCompatiblePack(), images)).toThrow(
      /No decoded image/,
    );
  });

  it("warns about pack draw-order differences while preserving pack order", () => {
    const pack = makeCompatiblePack();
    const reordered = makePack(
      pack.parts.map((candidate) =>
        candidate.id === "wing-far" ? { ...candidate, zIndex: 21 } : candidate,
      ),
    );
    const report = validateRigCompatibility(BASE_RIG, reordered);
    expect(report.ready).toBe(true);
    expect(report.issues.some((issue) => issue.code === "draw-order-mismatch")).toBe(true);

    const adapter = createImportedCharacterRig(BASE_RIG, reordered, makeImages());
    expect(adapter.rig.nodes.find((node) => node.id === "wingFar")?.drawOrder).toBe(21);
  });

  it("reports pivot remapping without rejecting valid imported artwork", () => {
    const report = validateRigCompatibility(BASE_RIG, makeCompatiblePack());
    expect(report.ready).toBe(true);
    expect(report.issues.some((issue) => issue.code === "pivot-remapped")).toBe(true);
  });

  it("supports explicit node-to-part overrides", () => {
    const customRig: SpriteRigDefinition = {
      nodes: [
        {
          id: "torso",
          parentId: null,
          pivot: { x: 50, y: 50 },
          drawOrder: 50,
          transform: { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 },
        },
      ],
    };
    const report = validateRigCompatibility(customRig, makePack([part()]), {
      partIdMap: { torso: "body" },
    });
    expect(report.ready).toBe(true);
    expect(report.nodePartIds["torso"]).toBe("body");
  });
});
