#!/usr/bin/env node
/**
 * Delegated local-operator authorization CLI.
 *
 * This does not write authorization JSON directly. It creates and approves
 * records through the same server-side domain/API path used by Fableon Studio.
 * The approval actor is recorded as a delegated local operator, per explicit
 * user delegation. It is idempotent for an already-active matching record.
 */
function parseArgs(argv) {
  const args = {
    baseUrl: "http://localhost:3173",
    experiment: "phase-05.1-folk-pilot",
    operator: "delegated-local-operator",
    requestedBy: "delegated-local-operator",
  };
  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--") || value === undefined) throw new Error(`Missing value for ${key}.`);
    index += 1;
    switch (key) {
      case "--base-url":
        args.baseUrl = value.replace(/\/+$/, "");
        break;
      case "--experiment":
        args.experiment = value;
        break;
      case "--provider":
        args.provider = value;
        break;
      case "--model":
        args.model = value;
        break;
      case "--max-cost":
        args.maxCost = Number(value);
        break;
      case "--max-requests":
        args.maxRequests = Number(value);
        break;
      case "--max-outputs":
        args.maxOutputs = Number(value);
        break;
      case "--max-width":
        args.maxWidth = Number(value);
        break;
      case "--max-height":
        args.maxHeight = Number(value);
        break;
      case "--expires":
        args.expiresAt = value;
        break;
      case "--operator":
        args.operator = value;
        break;
      case "--requested-by":
        args.requestedBy = value;
        break;
      default:
        throw new Error(`Unknown argument ${key}.`);
    }
  }
  for (const key of ["provider", "model", "maxCost", "maxRequests", "maxOutputs"]) {
    if (args[key] === undefined) throw new Error(`--${key} is required.`);
  }
  if (!["openai", "gemini"].includes(args.provider))
    throw new Error("provider must be openai or gemini.");
  if (!Number.isFinite(args.maxCost) || args.maxCost <= 0)
    throw new Error("max-cost must be positive.");
  if (!Number.isInteger(args.maxRequests) || args.maxRequests < 1)
    throw new Error("max-requests must be a positive integer.");
  if (!Number.isInteger(args.maxOutputs) || args.maxOutputs < 1)
    throw new Error("max-outputs must be a positive integer.");
  return args;
}

async function request(baseUrl, path, init) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw new Error(
      `${init?.method ?? "GET"} ${path} → ${response.status}: ${body?.error?.message ?? text}`,
    );
  }
  return body;
}

function matches(record, args) {
  return (
    record.experimentId === args.experiment &&
    record.provider === args.provider &&
    record.model === args.model
  );
}

function sameLimits(record, args) {
  return (
    record.maxCostUsd === args.maxCost &&
    record.maxRequests === args.maxRequests &&
    record.maxOutputsPerRequest === args.maxOutputs
  );
}

async function main() {
  const args = parseArgs(process.argv);
  const status = await request(args.baseUrl, "/api/studio/providers/status");
  const existing = status.authorizations.filter((record) => matches(record, args));
  const active = existing.find((record) => record.status === "active");
  if (active) {
    if (!sameLimits(active, args)) {
      throw new Error(
        `An active authorization exists with different limits (${active.id}); refusing to create a duplicate or reset consumed budget.`,
      );
    }
    const remaining = active.maxCostUsd - active.spentCostUsd - active.reservedCostUsd;
    console.log(
      JSON.stringify(
        {
          outcome: "reused-active",
          authorization: {
            id: active.id,
            experimentId: active.experimentId,
            provider: active.provider,
            model: active.model,
            status: active.status,
            approvedBy: active.approvedBy,
            approvedAt: active.approvedAt,
            expiresAt: active.expiresAt,
            maxCostUsd: active.maxCostUsd,
            spentCostUsd: active.spentCostUsd,
            reservedCostUsd: active.reservedCostUsd,
            remainingUsd: remaining,
            requestCount: active.requestCount,
            maxRequests: active.maxRequests,
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  const pending = existing.find(
    (record) => record.status === "pending" && sameLimits(record, args),
  );
  let authorizationId = pending?.id;
  if (!authorizationId) {
    const created = await request(args.baseUrl, "/api/studio/providers/authorizations", {
      method: "POST",
      body: JSON.stringify({
        experimentId: args.experiment,
        provider: args.provider,
        model: args.model,
        requestedBy: args.requestedBy,
        maxCostUsd: args.maxCost,
        maxRequests: args.maxRequests,
        maxOutputsPerRequest: args.maxOutputs,
        maxWidth: args.maxWidth ?? 2048,
        maxHeight: args.maxHeight ?? 2048,
        expiresAt: args.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes:
          "Delegated local-operator authorization explicitly requested for Stage 2A. Caps are provider- and experiment-scoped.",
      }),
    });
    authorizationId = created.authorization.id;
  }

  const approved = await request(
    args.baseUrl,
    `/api/studio/providers/authorizations/${authorizationId}/approve`,
    {
      method: "POST",
      body: JSON.stringify({
        approvedBy: args.operator,
        confirmation: `APPROVE $${args.maxCost.toFixed(2)}`,
      }),
    },
  );
  const record = approved.authorization;
  console.log(
    JSON.stringify(
      {
        outcome: pending ? "approved-existing-pending" : "created-and-approved",
        authorization: {
          id: record.id,
          experimentId: record.experimentId,
          provider: record.provider,
          model: record.model,
          status: record.status,
          approvedBy: record.approvedBy,
          approvedAt: record.approvedAt,
          expiresAt: record.expiresAt,
          maxCostUsd: record.maxCostUsd,
          spentCostUsd: record.spentCostUsd,
          reservedCostUsd: record.reservedCostUsd,
          remainingUsd: record.maxCostUsd - record.spentCostUsd - record.reservedCostUsd,
          requestCount: record.requestCount,
          maxRequests: record.maxRequests,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
