import { describe, expect, test } from "vitest";

import { Rigby2DError } from "./errors";
import { assertCharacterId, assertInside, assertVersionId, slugify } from "./storage";

describe("Rigby2D asset path safety", () => {
  test("accepts safe character and version IDs", () => {
    expect(assertCharacterId("artisan-arm-r22")).toBe("artisan-arm-r22");
    expect(assertVersionId("v1")).toBe("v1");
  });

  test("rejects traversal and absolute paths in IDs", () => {
    expect(() => assertCharacterId("../escape")).toThrow(Rigby2DError);
    expect(() => assertCharacterId("/absolute")).toThrow(Rigby2DError);
    expect(() => assertVersionId("../v1")).toThrow(Rigby2DError);
    expect(() => assertVersionId("v0")).toThrow(Rigby2DError);
  });

  test("rejects a child path outside its parent", () => {
    expect(() => assertInside("/tmp/characters/a", "/tmp/characters/a/versions/v1")).not.toThrow();
    expect(() => assertInside("/tmp/characters/a", "/tmp/characters/b/versions/v1")).toThrow(
      Rigby2DError,
    );
  });

  test("slugifies display names without creating path separators", () => {
    expect(slugify("Artisan Arm R2.2", "rigby2d")).toBe("artisan-arm-r2-2");
    expect(slugify("../../etc/passwd", "rigby2d")).toBe("etc-passwd");
    expect(slugify("x", "rigby2d")).toBe("rigby2d");
  });
});
