import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { getDataRoot } from "@/lib/studio/repository";

import type { HostedProviderId } from "./catalog";

export type AuthorizationStatus = "pending" | "active" | "revoked" | "expired" | "exhausted";

export interface SpendReservation {
  readonly requestKey: string;
  readonly maxCostUsd: number;
  readonly createdAt: string;
  readonly status: "reserved" | "submitted" | "completed" | "released";
  readonly outputCount: number;
  readonly width: number;
  readonly height: number;
}

export interface ProviderSpendAuthorization {
  readonly id: string;
  readonly experimentId: string;
  readonly provider: HostedProviderId;
  readonly model: string;
  readonly status: AuthorizationStatus;
  readonly requestedBy: string;
  readonly createdAt: string;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
  readonly expiresAt: string;
  readonly revokedBy: string | null;
  readonly revokedAt: string | null;
  readonly maxCostUsd: number;
  readonly maxRequests: number;
  readonly maxOutputsPerRequest: number;
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly pricingVersion: string;
  readonly spentCostUsd: number;
  readonly reservedCostUsd: number;
  readonly requestCount: number;
  readonly reservations: readonly SpendReservation[];
  readonly notes: string;
  readonly updatedAt: string;
}

export interface CreateAuthorizationRequestInput {
  readonly experimentId: string;
  readonly provider: HostedProviderId;
  readonly model: string;
  readonly requestedBy: string;
  readonly maxCostUsd: number;
  readonly maxRequests: number;
  readonly maxOutputsPerRequest: number;
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly pricingVersion: string;
  readonly expiresAt: string;
  readonly notes?: string;
}

export interface ApproveAuthorizationInput {
  readonly approvedBy: string;
  readonly confirmation: string;
}

export interface ReservationInput {
  readonly authorizationId: string;
  readonly requestKey: string;
  readonly maxCostUsd: number;
  readonly outputCount: number;
  readonly width: number;
  readonly height: number;
}

export interface ReservationResult {
  readonly authorization: ProviderSpendAuthorization;
  readonly reservation: SpendReservation;
  readonly remainingBeforeUsd: number;
}

export interface ReconcileInput {
  readonly authorizationId: string;
  readonly requestKey: string;
  readonly actualCostUsd: number;
  readonly outcome: "completed" | "failed-after-submit" | "released";
}

export type AuthorizationErrorCode =
  | "not_found"
  | "invalid_input"
  | "authorization_missing"
  | "authorization_pending"
  | "authorization_revoked"
  | "authorization_expired"
  | "authorization_exhausted"
  | "budget_exceeded"
  | "duplicate_request"
  | "concurrent_conflict";

export class ProviderAuthorizationError extends Error {
  override readonly name = "ProviderAuthorizationError";
  readonly code: AuthorizationErrorCode;
  constructor(code: AuthorizationErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const STORE_VERSION = 1;
let writeLock: Promise<unknown> = Promise.resolve();

function storeFile(): string {
  return path.join(getDataRoot(), "provider-benchmark", "authorizations.json");
}

interface StoreDocument {
  readonly version: number;
  readonly authorizations: readonly ProviderSpendAuthorization[];
}

function assertPositive(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ProviderAuthorizationError("invalid_input", `${name} must be a positive number.`);
  }
  return value;
}

function assertInteger(value: number, name: string, minimum = 1): number {
  if (!Number.isInteger(value) || value < minimum) {
    throw new ProviderAuthorizationError(
      "invalid_input",
      `${name} must be an integer of at least ${minimum}.`,
    );
  }
  return value;
}

function assertDate(value: string, name: string): string {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    throw new ProviderAuthorizationError("invalid_input", `${name} must be an ISO date.`);
  }
  return new Date(time).toISOString();
}

function withWriteLock<T>(action: () => Promise<T>): Promise<T> {
  const run = writeLock.then(action, action);
  writeLock = run.catch(() => undefined);
  return run;
}

async function readStore(): Promise<StoreDocument> {
  try {
    const raw = JSON.parse(await readFile(storeFile(), "utf8")) as unknown;
    if (typeof raw !== "object" || raw === null) throw new Error("not an object");
    const document = raw as { version?: unknown; authorizations?: unknown };
    if (document.version !== STORE_VERSION || !Array.isArray(document.authorizations)) {
      throw new Error("unsupported document");
    }
    return {
      version: STORE_VERSION,
      authorizations: document.authorizations as readonly ProviderSpendAuthorization[],
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { version: STORE_VERSION, authorizations: [] };
    }
    throw new ProviderAuthorizationError(
      "invalid_input",
      "The provider authorization store is missing or corrupt.",
    );
  }
}

async function writeStore(document: StoreDocument): Promise<void> {
  const file = storeFile();
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  await rename(temp, file);
}

function effectiveStatus(
  authorization: ProviderSpendAuthorization,
  now = Date.now(),
): AuthorizationStatus {
  if (authorization.status === "revoked") return "revoked";
  if (authorization.status === "exhausted") return "exhausted";
  if (Date.parse(authorization.expiresAt) <= now) return "expired";
  return authorization.status;
}

function remaining(authorization: ProviderSpendAuthorization): number {
  return Math.max(
    0,
    authorization.maxCostUsd - authorization.spentCostUsd - authorization.reservedCostUsd,
  );
}

function replaceAuthorization(
  document: StoreDocument,
  next: ProviderSpendAuthorization,
): StoreDocument {
  return {
    ...document,
    authorizations: document.authorizations.map((entry) => (entry.id === next.id ? next : entry)),
  };
}

export async function listProviderAuthorizations(): Promise<readonly ProviderSpendAuthorization[]> {
  const document = await readStore();
  const now = Date.now();
  return document.authorizations.map((entry) => ({
    ...entry,
    status: effectiveStatus(entry, now),
  }));
}

export async function createProviderAuthorizationRequest(
  input: CreateAuthorizationRequestInput,
): Promise<ProviderSpendAuthorization> {
  const now = new Date().toISOString();
  const authorization: ProviderSpendAuthorization = {
    id: `auth_${Date.now()}_${randomUUID().slice(0, 8)}`,
    experimentId: input.experimentId.trim(),
    provider: input.provider,
    model: input.model.trim(),
    status: "pending",
    requestedBy: input.requestedBy.trim(),
    createdAt: now,
    approvedBy: null,
    approvedAt: null,
    expiresAt: assertDate(input.expiresAt, "expiresAt"),
    revokedBy: null,
    revokedAt: null,
    maxCostUsd: assertPositive(input.maxCostUsd, "maxCostUsd"),
    maxRequests: assertInteger(input.maxRequests, "maxRequests"),
    maxOutputsPerRequest: assertInteger(input.maxOutputsPerRequest, "maxOutputsPerRequest"),
    maxWidth: assertInteger(input.maxWidth, "maxWidth", 64),
    maxHeight: assertInteger(input.maxHeight, "maxHeight", 64),
    pricingVersion: input.pricingVersion.trim(),
    spentCostUsd: 0,
    reservedCostUsd: 0,
    requestCount: 0,
    reservations: [],
    notes: input.notes?.trim() ?? "",
    updatedAt: now,
  };
  if (!authorization.experimentId || !authorization.model || !authorization.requestedBy) {
    throw new ProviderAuthorizationError(
      "invalid_input",
      "experimentId, model, and requestedBy are required.",
    );
  }
  return withWriteLock(async () => {
    const document = await readStore();
    await writeStore({ ...document, authorizations: [...document.authorizations, authorization] });
    return authorization;
  });
}

export async function approveProviderAuthorization(
  id: string,
  input: ApproveAuthorizationInput,
): Promise<ProviderSpendAuthorization> {
  return withWriteLock(async () => {
    const document = await readStore();
    const current = document.authorizations.find((entry) => entry.id === id);
    if (!current) throw new ProviderAuthorizationError("not_found", "Authorization not found.");
    if (current.status !== "pending") {
      throw new ProviderAuthorizationError(
        "invalid_input",
        `Only a pending authorization can be approved; current status is ${current.status}.`,
      );
    }
    const required = `APPROVE $${current.maxCostUsd.toFixed(2)}`;
    if (input.confirmation.trim() !== required) {
      throw new ProviderAuthorizationError(
        "invalid_input",
        `Confirmation must exactly match "${required}".`,
      );
    }
    if (!input.approvedBy.trim()) {
      throw new ProviderAuthorizationError("invalid_input", "approvedBy is required.");
    }
    const now = new Date().toISOString();
    const approved: ProviderSpendAuthorization = {
      ...current,
      status: "active",
      approvedBy: input.approvedBy.trim(),
      approvedAt: now,
      updatedAt: now,
    };
    await writeStore(replaceAuthorization(document, approved));
    return approved;
  });
}

export async function revokeProviderAuthorization(
  id: string,
  revokedBy: string,
): Promise<ProviderSpendAuthorization> {
  return withWriteLock(async () => {
    const document = await readStore();
    const current = document.authorizations.find((entry) => entry.id === id);
    if (!current) throw new ProviderAuthorizationError("not_found", "Authorization not found.");
    const now = new Date().toISOString();
    const revoked: ProviderSpendAuthorization = {
      ...current,
      status: "revoked",
      revokedBy: revokedBy.trim() || "local-user",
      revokedAt: now,
      updatedAt: now,
    };
    await writeStore(replaceAuthorization(document, revoked));
    return revoked;
  });
}

export async function findUsableAuthorization(input: {
  readonly authorizationId?: string;
  readonly experimentId: string;
  readonly provider: HostedProviderId;
  readonly model: string;
  readonly estimatedMaxCostUsd: number;
  readonly outputCount: number;
  readonly width: number;
  readonly height: number;
}): Promise<ProviderSpendAuthorization> {
  const authorizations = await listProviderAuthorizations();
  const matching = authorizations.filter(
    (entry) =>
      (input.authorizationId === undefined || entry.id === input.authorizationId) &&
      entry.experimentId === input.experimentId &&
      entry.provider === input.provider &&
      entry.model === input.model,
  );
  if (matching.length === 0) {
    throw new ProviderAuthorizationError(
      "authorization_missing",
      "No approval exists for this provider, model, and experiment. Request and approve a spending limit first.",
    );
  }
  const active = matching.find((entry) => entry.status === "active");
  if (!active) {
    const pending = matching.find((entry) => entry.status === "pending");
    if (pending) {
      throw new ProviderAuthorizationError(
        "authorization_pending",
        "The spending request is still pending explicit approval.",
      );
    }
    const revoked = matching.find((entry) => entry.status === "revoked");
    if (revoked) {
      throw new ProviderAuthorizationError(
        "authorization_revoked",
        "The spending authorization has been revoked.",
      );
    }
    const expired = matching.find((entry) => entry.status === "expired");
    if (expired) {
      throw new ProviderAuthorizationError(
        "authorization_expired",
        "The spending authorization has expired.",
      );
    }
    throw new ProviderAuthorizationError(
      "authorization_exhausted",
      "The spending authorization has no remaining budget.",
    );
  }
  if (input.outputCount > active.maxOutputsPerRequest) {
    throw new ProviderAuthorizationError(
      "budget_exceeded",
      `The request asks for ${input.outputCount} images; the authorization allows ${active.maxOutputsPerRequest}.`,
    );
  }
  if (input.width > active.maxWidth || input.height > active.maxHeight) {
    throw new ProviderAuthorizationError(
      "budget_exceeded",
      "The request exceeds the authorized image dimensions.",
    );
  }
  if (input.estimatedMaxCostUsd > remaining(active)) {
    throw new ProviderAuthorizationError(
      "budget_exceeded",
      `Estimated maximum $${input.estimatedMaxCostUsd.toFixed(4)} exceeds remaining budget $${remaining(active).toFixed(4)}.`,
    );
  }
  return active;
}

export async function reserveProviderSpend(input: ReservationInput): Promise<ReservationResult> {
  return withWriteLock(async () => {
    const document = await readStore();
    const current = document.authorizations.find((entry) => entry.id === input.authorizationId);
    if (!current) throw new ProviderAuthorizationError("not_found", "Authorization not found.");
    const status = effectiveStatus(current);
    if (status !== "active") {
      throw new ProviderAuthorizationError(
        status === "expired" ? "authorization_expired" : "authorization_exhausted",
        `Authorization is ${status}.`,
      );
    }
    if (
      current.reservations.some(
        (entry) => entry.requestKey === input.requestKey && entry.status !== "released",
      )
    ) {
      throw new ProviderAuthorizationError(
        "duplicate_request",
        "This request key has already been reserved or submitted.",
      );
    }
    if (current.requestCount + 1 > current.maxRequests) {
      throw new ProviderAuthorizationError(
        "budget_exceeded",
        "The authorization request-count limit has been reached.",
      );
    }
    const remainingBefore = remaining(current);
    if (input.maxCostUsd > remainingBefore) {
      throw new ProviderAuthorizationError(
        "budget_exceeded",
        `Reservation $${input.maxCostUsd.toFixed(4)} exceeds remaining $${remainingBefore.toFixed(4)}.`,
      );
    }
    const reservation: SpendReservation = {
      requestKey: input.requestKey,
      maxCostUsd: input.maxCostUsd,
      createdAt: new Date().toISOString(),
      status: "reserved",
      outputCount: input.outputCount,
      width: input.width,
      height: input.height,
    };
    const next: ProviderSpendAuthorization = {
      ...current,
      reservedCostUsd: current.reservedCostUsd + input.maxCostUsd,
      requestCount: current.requestCount + 1,
      reservations: [...current.reservations, reservation],
      status:
        remainingBefore - input.maxCostUsd <= 0.0000001 &&
        current.spentCostUsd >= current.maxCostUsd
          ? "exhausted"
          : "active",
      updatedAt: new Date().toISOString(),
    };
    await writeStore(replaceAuthorization(document, next));
    return { authorization: next, reservation, remainingBeforeUsd: remainingBefore };
  });
}

export async function reconcileProviderSpend(
  input: ReconcileInput,
): Promise<ProviderSpendAuthorization> {
  return withWriteLock(async () => {
    const document = await readStore();
    const current = document.authorizations.find((entry) => entry.id === input.authorizationId);
    if (!current) throw new ProviderAuthorizationError("not_found", "Authorization not found.");
    const reservation = current.reservations.find((entry) => entry.requestKey === input.requestKey);
    if (!reservation) {
      throw new ProviderAuthorizationError("not_found", "Reservation not found.");
    }
    if (reservation.status === "completed" || reservation.status === "released") {
      throw new ProviderAuthorizationError(
        "duplicate_request",
        "This reservation has already been reconciled.",
      );
    }
    if (!Number.isFinite(input.actualCostUsd) || input.actualCostUsd < 0) {
      throw new ProviderAuthorizationError("invalid_input", "actualCostUsd must be non-negative.");
    }
    const charged =
      input.outcome === "released" ? 0 : Math.min(input.actualCostUsd, reservation.maxCostUsd);
    const nextReserved = Math.max(0, current.reservedCostUsd - reservation.maxCostUsd);
    const nextSpent = current.spentCostUsd + charged;
    const reservations = current.reservations.map((entry) =>
      entry.requestKey === input.requestKey
        ? {
            ...entry,
            status: input.outcome === "released" ? ("released" as const) : ("completed" as const),
          }
        : entry,
    );
    const nextStatus: AuthorizationStatus =
      nextSpent + nextReserved >= current.maxCostUsd ? "exhausted" : current.status;
    const next: ProviderSpendAuthorization = {
      ...current,
      spentCostUsd: nextSpent,
      reservedCostUsd: nextReserved,
      reservations,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
    await writeStore(replaceAuthorization(document, next));
    return next;
  });
}

export function authorizationRemaining(authorization: ProviderSpendAuthorization): number {
  return remaining(authorization);
}

export async function resetAuthorizationStoreForTests(): Promise<void> {
  await withWriteLock(async () => {
    await writeStore({ version: STORE_VERSION, authorizations: [] });
  });
}
