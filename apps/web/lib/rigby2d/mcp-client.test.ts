// @vitest-environment node

import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { Rigby2DMcpClient, verifyRigby2DInstallation } from "./mcp-client";
import { Rigby2DError } from "./errors";

let workspace: string;

beforeAll(async () => {
  workspace = await mkdtemp(path.join(tmpdir(), "fableon-rigby2d-mcp-"));
  await copyFile(
    path.join(process.cwd(), "tests/fixtures/rigby2d/artisan-arm-r22.rigby"),
    path.join(workspace, "character.rigby"),
  );
  await mkdir(path.join(workspace, "frames"), { recursive: true });
});

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true });
});

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
    throw new Error(`Expected Rigby2DError ${code}, but the call resolved.`);
  } catch (error) {
    expect(error).toBeInstanceOf(Rigby2DError);
    expect((error as Rigby2DError).code).toBe(code);
  }
}

describe("Rigby2D MCP process manager", () => {
  test("verifies the pinned vendored source", async () => {
    const installation = await verifyRigby2DInstallation();
    expect(installation.version).toBe("0.5.1");
    expect(installation.commit).toBe("307f7bf00d086a776b4a3c88c6fcca6fab97c531");
    expect(installation.sourceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  test("handshakes, discovers the allowlisted tools and inspects the fixture", async () => {
    const client = await Rigby2DMcpClient.open(workspace);
    try {
      expect(client.protocolVersion).toBe("2025-06-18");
      expect(client.discovery.length).toBeGreaterThanOrEqual(6);
      expect(client.discovery.map((tool) => tool.name)).toEqual(
        expect.arrayContaining(["inspect_project", "sample_pose", "export_sprite_sheet"]),
      );
      const inspect = await client.call<{ counts: { bones: number; animations: number } }>(
        "inspect_project",
        { path: "character.rigby" },
      );
      expect(inspect.counts.bones).toBe(23);
      expect(inspect.counts.animations).toBe(4);
      expect(client.resourceUsage.requestCount).toBeGreaterThan(0);
    } finally {
      await client.close();
    }
  });

  test("returns a stable tool error for a missing project", async () => {
    const client = await Rigby2DMcpClient.open(workspace);
    try {
      await expectCode(
        client.call("inspect_project", { path: "missing.rigby" }),
        "MCP_TOOL_FAILED",
      );
    } finally {
      await client.close();
    }
  });

  test("rejects path escapes at the MCP workspace boundary", async () => {
    const client = await Rigby2DMcpClient.open(workspace);
    try {
      await expectCode(
        client.call("inspect_project", { path: "../outside.rigby" }),
        "MCP_TOOL_FAILED",
      );
    } finally {
      await client.close();
    }
  });

  test("does not expose run_script or arbitrary tools", async () => {
    const client = await Rigby2DMcpClient.open(workspace);
    try {
      await expectCode(
        client.call("run_script", { path: "character.rigby" }),
        "MCP_TOOL_NOT_ALLOWED",
      );
    } finally {
      await client.close();
    }
  });

  test("validates tool arguments before sending them", async () => {
    const client = await Rigby2DMcpClient.open(workspace);
    try {
      await expectCode(
        client.call("export_sprite_sheet", { input: "character.rigby" }),
        "MCP_TOOL_SCHEMA_INVALID",
      );
    } finally {
      await client.close();
    }
  });

  test("times out and terminates the MCP process group", async () => {
    const client = await Rigby2DMcpClient.open(workspace);
    const pid = client.pid;
    expect(pid).toBeTypeOf("number");
    try {
      await expectCode(
        client.call(
          "export_sprite_sheet",
          {
            input: "character.rigby",
            output_folder: "frames",
            name: "timeout",
            format: "frames",
            animations: ["showcase_ikfix"],
            fps: 24,
            scale: 1,
            loop: false,
            overwrite: true,
          },
          { timeoutMs: 10 },
        ),
        "MCP_TIMEOUT",
      );
    } finally {
      await client.close();
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(() => process.kill(pid as number, 0)).toThrow();
  }, 30_000);
});
