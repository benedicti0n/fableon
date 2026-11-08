import { describe, expect, it } from "vitest";

import {
  deserializeProject,
  parseProject,
  ProjectValidationError,
  serializeProject,
} from "./index";
import { SAMPLE_PROJECT } from "./fixtures";

describe("project serialization", () => {
  it("validates the canonical bird-in-the-forest fixture", () => {
    const project = parseProject(SAMPLE_PROJECT);

    expect(project.id).toBe("where-the-light-lands");
    expect(project.scenes.map((scene) => scene.durationFrames)).toEqual([216, 312, 312, 312]);
    expect(project.scenes.reduce((sum, scene) => sum + scene.durationFrames, 0)).toBe(1152);
    expect(project.assets).toHaveLength(5);
    expect(project.scenes[0]?.layers.length).toBeGreaterThan(1);
  });

  it("round-trips project semantics deterministically", () => {
    const firstDocument = serializeProject(SAMPLE_PROJECT);
    const secondDocument = serializeProject(SAMPLE_PROJECT);

    expect(secondDocument).toBe(firstDocument);
    expect(firstDocument.endsWith("\n")).toBe(true);

    const roundTripped = deserializeProject(firstDocument);
    expect(roundTripped).toEqual(SAMPLE_PROJECT);
    expect(serializeProject(roundTripped)).toBe(firstDocument);
  });

  it("preserves scene order, layer order, and keyframes", () => {
    const roundTripped = deserializeProject(serializeProject(SAMPLE_PROJECT));

    expect(roundTripped.scenes.map((scene) => scene.id)).toEqual([
      "dawn",
      "glide",
      "descent",
      "landing",
    ]);
    expect(roundTripped.scenes[0]?.layers.map((layer) => layer.order)).toEqual([0, 10, 20]);

    const bird = roundTripped.scenes[0]?.layers.find((layer) => layer.id === "dawn-bird");
    expect(bird?.type).toBe("asset");
    if (bird?.type === "asset") {
      expect(bird.animation?.x?.keyframes).toEqual([
        { frame: 0, value: 420, interpolation: "linear" },
        { frame: 108, value: 560, interpolation: "easeInOutCubic" },
        { frame: 215, value: 640, interpolation: "hold" },
      ]);
    }
  });

  it("rejects invalid JSON with a useful structured error", () => {
    try {
      deserializeProject('{"format":"fableon.project",');
      expect.unreachable("Invalid JSON should have thrown.");
    } catch (error) {
      expect(error).toBeInstanceOf(ProjectValidationError);
      if (error instanceof ProjectValidationError) {
        expect(error.issues[0]).toMatchObject({
          path: "$",
          code: "invalid_json",
        });
        expect(error.message).toContain("could not be parsed");
      }
    }
  });

  it("rejects unsupported future versions instead of migrating", () => {
    const futureDocument: unknown = { ...SAMPLE_PROJECT, schemaVersion: 2 };

    try {
      deserializeProject(JSON.stringify(futureDocument));
      expect.unreachable("A future schema version should have thrown.");
    } catch (error) {
      expect(error).toBeInstanceOf(ProjectValidationError);
      if (error instanceof ProjectValidationError) {
        expect(error.issues[0]).toMatchObject({
          path: "$.schemaVersion",
          code: "unsupported_schema_version",
        });
      }
    }
  });

  it("rejects missing required root fields", () => {
    const document = JSON.parse(serializeProject(SAMPLE_PROJECT)) as Record<string, unknown>;
    delete document["scenes"];

    expect(() => deserializeProject(JSON.stringify(document))).toThrow(ProjectValidationError);
  });
});
