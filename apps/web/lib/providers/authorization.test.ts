import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  ProviderAuthorizationError,
  approveProviderAuthorization,
  authorizationRemaining,
  createProviderAuthorizationRequest,
  findUsableAuthorization,
  listProviderAuthorizations,
  reconcileProviderSpend,
  reserveProviderSpend,
  resetAuthorizationStoreForTests,
  revokeProviderAuthorization,
} from "./authorization";

const originalDataDir = process.env["FABLEON_DATA_DIR"];
const tempDir = await mkdtemp(path.join(os.tmpdir(), "fableon-auth-"));

beforeEach(async () => {
  process.env["FABLEON_DATA_DIR"] = tempDir;
  await resetAuthorizationStoreForTests();
});

afterAll(async () => {
  if (originalDataDir === undefined) delete process.env["FABLEON_DATA_DIR"];
  else process.env["FABLEON_DATA_DIR"] = originalDataDir;
  await rm(tempDir, { recursive: true, force: true });
});

async function pendingAuthorization() {
  return createProviderAuthorizationRequest({
    experimentId: "phase-05.1-folk-pilot",
    provider: "openai",
    model: "gpt-image-2.6-sunburst",
    requestedBy: "test",
    maxCostUsd: 1,
    maxRequests: 3,
    maxOutputsPerRequest: 2,
    maxWidth: 2048,
    maxHeight: 2048,
    pricingVersion: "openai-image-2026-11-10",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });
}

describe("provider spending authorization", () => {
  it("creates a pending request but does not authorize spending", async () => {
    const authorization = await pendingAuthorization();
    expect(authorization.status).toBe("pending");
    expect(authorization.approvedBy).toBeNull();
    await expect(
      findUsableAuthorization({
        experimentId: "phase-05.1-folk-pilot",
        provider: "openai",
        model: "gpt-image-2.6-sunburst",
        estimatedMaxCostUsd: 0.1,
        outputCount: 1,
        width: 1024,
        height: 1024,
      }),
    ).rejects.toThrow(/pending explicit approval/i);
  });

  it("requires the exact confirmation string to approve", async () => {
    const authorization = await pendingAuthorization();
    await expect(
      approveProviderAuthorization(authorization.id, {
        approvedBy: "test",
        confirmation: "yes",
      }),
    ).rejects.toBeInstanceOf(ProviderAuthorizationError);
    const approved = await approveProviderAuthorization(authorization.id, {
      approvedBy: "test",
      confirmation: "APPROVE $1.00",
    });
    expect(approved.status).toBe("active");
    expect(approved.approvedBy).toBe("test");
  });

  it("reserves before submission and reconciles actual cost", async () => {
    const pending = await pendingAuthorization();
    const approved = await approveProviderAuthorization(pending.id, {
      approvedBy: "test",
      confirmation: "APPROVE $1.00",
    });
    const reservation = await reserveProviderSpend({
      authorizationId: approved.id,
      requestKey: "req-1",
      maxCostUsd: 0.2,
      outputCount: 1,
      width: 1536,
      height: 1024,
    });
    expect(reservation.authorization.reservedCostUsd).toBeCloseTo(0.2);
    await expect(
      reserveProviderSpend({
        authorizationId: approved.id,
        requestKey: "req-1",
        maxCostUsd: 0.2,
        outputCount: 1,
        width: 1536,
        height: 1024,
      }),
    ).rejects.toThrow(/already been reserved/i);
    const reconciled = await reconcileProviderSpend({
      authorizationId: approved.id,
      requestKey: "req-1",
      actualCostUsd: 0.05,
      outcome: "completed",
    });
    expect(reconciled.reservedCostUsd).toBe(0);
    expect(reconciled.spentCostUsd).toBeCloseTo(0.05);
    expect(authorizationRemaining(reconciled)).toBeCloseTo(0.95);
  });

  it("rejects a reservation beyond the remaining budget and respects concurrency", async () => {
    const pending = await pendingAuthorization();
    const approved = await approveProviderAuthorization(pending.id, {
      approvedBy: "test",
      confirmation: "APPROVE $1.00",
    });
    const results = await Promise.allSettled([
      reserveProviderSpend({
        authorizationId: approved.id,
        requestKey: "a",
        maxCostUsd: 0.7,
        outputCount: 1,
        width: 1536,
        height: 1024,
      }),
      reserveProviderSpend({
        authorizationId: approved.id,
        requestKey: "b",
        maxCostUsd: 0.7,
        outputCount: 1,
        width: 1536,
        height: 1024,
      }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("revokes an authorization and rejects later requests", async () => {
    const pending = await pendingAuthorization();
    const approved = await approveProviderAuthorization(pending.id, {
      approvedBy: "test",
      confirmation: "APPROVE $1.00",
    });
    await revokeProviderAuthorization(approved.id, "test");
    await expect(
      findUsableAuthorization({
        experimentId: "phase-05.1-folk-pilot",
        provider: "openai",
        model: "gpt-image-2.6-sunburst",
        estimatedMaxCostUsd: 0.1,
        outputCount: 1,
        width: 1024,
        height: 1024,
      }),
    ).rejects.toThrow(/revoked/i);
    expect((await listProviderAuthorizations())[0]?.status).toBe("revoked");
  });

  it("rejects expired authorizations", async () => {
    const pending = await createProviderAuthorizationRequest({
      experimentId: "phase-05.1-folk-pilot",
      provider: "gemini",
      model: "gemini-nano-banana-2.1",
      requestedBy: "test",
      maxCostUsd: 1,
      maxRequests: 1,
      maxOutputsPerRequest: 1,
      maxWidth: 2048,
      maxHeight: 2048,
      pricingVersion: "gemini-image-2026-11-10",
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
    });
    await approveProviderAuthorization(pending.id, {
      approvedBy: "test",
      confirmation: "APPROVE $1.00",
    });
    expect((await listProviderAuthorizations())[0]?.status).toBe("expired");
  });
});
