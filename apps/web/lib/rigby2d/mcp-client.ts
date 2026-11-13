import { execFile, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  RIGBY2D_ALLOWED_TOOLS,
  RIGBY2D_DEFAULT_TIMEOUT_MS,
  RIGBY2D_HANDSHAKE_TIMEOUT_MS,
  RIGBY2D_PINNED_COMMIT,
  RIGBY2D_VERSION,
  getRigby2DServerPath,
  getRigby2DVendorRoot,
  isRigby2DToolAllowed,
} from "./constants";
import { Rigby2DError } from "./errors";

export interface Rigby2DInstallation {
  readonly vendorRoot: string;
  readonly serverPath: string;
  readonly version: string;
  readonly commit: string;
  readonly sourceHash: string;
}

interface JsonSchema {
  readonly type?: string | readonly string[];
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
  readonly enum?: readonly unknown[];
  readonly minimum?: number;
  readonly exclusiveMinimum?: number;
  readonly maximum?: number;
}

interface ToolDefinition {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema: JsonSchema;
}

interface JsonRpcResponse {
  readonly jsonrpc?: string;
  readonly id?: number | string | null;
  readonly result?: unknown;
  readonly error?: { readonly code?: number; readonly message?: string; readonly data?: unknown };
}

interface PendingRequest {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: unknown) => void;
  readonly timer: NodeJS.Timeout;
}

export interface Rigby2DTraceEntry {
  readonly at: string;
  readonly event: string;
  readonly tool?: string;
  readonly durationMs?: number;
  readonly ok: boolean;
  readonly detail?: string;
}

export interface Rigby2DCallOptions {
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
}

export interface Rigby2DResourceUsage {
  readonly peakRssKb: number;
  readonly elapsedMs: number;
  readonly requestCount: number;
}

const INSTALLATION_CACHE_KEY = Symbol.for("fableon.rigby2d.installation");

type GlobalWithInstallation = typeof globalThis & {
  [INSTALLATION_CACHE_KEY]?: Promise<Rigby2DInstallation>;
};

async function collectFiles(dir: string, out: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectFiles(full, out);
    else out.push(full);
  }
  return out;
}

async function hashVendorSource(vendorRoot: string): Promise<string> {
  const files = await collectFiles(path.join(vendorRoot, "src"));
  for (const extra of [
    "package.json",
    "PINNED_COMMIT",
    "LICENSE-MIT",
    "LICENSE-APACHE",
    "THIRD_PARTY_NOTICES.md",
  ]) {
    files.push(path.join(vendorRoot, extra));
  }
  files.sort();
  const hash = createHash("sha256");
  for (const file of files) {
    const relative = path.relative(vendorRoot, file).split(path.sep).join("/");
    hash.update(relative);
    hash.update("\0");
    hash.update(await readFile(file));
  }
  return hash.digest("hex");
}

async function loadInstallation(): Promise<Rigby2DInstallation> {
  const vendorRoot = getRigby2DVendorRoot();
  const serverPath = getRigby2DServerPath();
  let commit: string;
  let packageVersion: string;
  let expectedHash: string;
  try {
    [commit, packageVersion, expectedHash] = await Promise.all([
      readFile(path.join(vendorRoot, "PINNED_COMMIT"), "utf8").then((value) => value.trim()),
      readFile(path.join(vendorRoot, "package.json"), "utf8").then(
        (value) => (JSON.parse(value) as { version?: string }).version ?? "",
      ),
      readFile(path.join(vendorRoot, "SOURCE_SHA256"), "utf8").then((value) => value.trim()),
    ]);
  } catch (error) {
    throw new Rigby2DError(
      "RIGBY2D_UNAVAILABLE",
      "The vendored Rigby2D runtime is missing or incomplete.",
      { cause: error instanceof Error ? error.message : String(error) },
    );
  }
  if (commit !== RIGBY2D_PINNED_COMMIT) {
    throw new Rigby2DError(
      "RIGBY2D_SOURCE_MISMATCH",
      `Rigby2D commit ${commit || "(empty)"} does not match the pinned ${RIGBY2D_PINNED_COMMIT}.`,
    );
  }
  if (packageVersion !== RIGBY2D_VERSION) {
    throw new Rigby2DError(
      "RIGBY2D_SOURCE_MISMATCH",
      `Rigby2D version ${packageVersion || "(empty)"} does not match ${RIGBY2D_VERSION}.`,
    );
  }
  const actualHash = await hashVendorSource(vendorRoot);
  if (!expectedHash || actualHash !== expectedHash) {
    throw new Rigby2DError(
      "RIGBY2D_SOURCE_MISMATCH",
      "The vendored Rigby2D source hash does not match SOURCE_SHA256.",
      { expected: expectedHash, actual: actualHash },
    );
  }
  return { vendorRoot, serverPath, version: packageVersion, commit, sourceHash: actualHash };
}

export async function verifyRigby2DInstallation(): Promise<Rigby2DInstallation> {
  const globalStore = globalThis as GlobalWithInstallation;
  globalStore[INSTALLATION_CACHE_KEY] ??= loadInstallation().catch((error: unknown) => {
    delete globalStore[INSTALLATION_CACHE_KEY];
    throw error;
  });
  return globalStore[INSTALLATION_CACHE_KEY];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function typeMatches(type: string, value: unknown): boolean {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "object":
      return isObject(value);
    case "array":
      return Array.isArray(value);
    default:
      return true;
  }
}

function checkArguments(schema: JsonSchema, args: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const properties = schema.properties ?? {};
  for (const name of schema.required ?? []) {
    if (args[name] === undefined) problems.push(`'${name}' is required`);
  }
  for (const [name, value] of Object.entries(args)) {
    const property = properties[name];
    if (!property) {
      if (schema.additionalProperties === false) problems.push(`unknown argument '${name}'`);
      continue;
    }
    const types =
      property.type === undefined
        ? []
        : Array.isArray(property.type)
          ? property.type
          : [property.type];
    if (types.length > 0 && !types.some((type) => typeMatches(type, value))) {
      problems.push(`'${name}' must be of type ${types.join(" or ")}`);
      continue;
    }
    if (property.enum && !property.enum.includes(value)) {
      problems.push(`'${name}' must be one of ${property.enum.map(String).join(", ")}`);
    }
    if (typeof value === "number") {
      if (property.minimum !== undefined && value < property.minimum) {
        problems.push(`'${name}' must be at least ${property.minimum}`);
      }
      if (property.exclusiveMinimum !== undefined && value <= property.exclusiveMinimum) {
        problems.push(`'${name}' must be greater than ${property.exclusiveMinimum}`);
      }
      if (property.maximum !== undefined && value > property.maximum) {
        problems.push(`'${name}' must be at most ${property.maximum}`);
      }
    }
  }
  return problems;
}

function readStructuredContent(result: unknown): unknown {
  if (!isObject(result)) throw new Rigby2DError("MCP_TOOL_FAILED", "MCP tool returned no result.");
  if (result["isError"] === true) {
    const content = result["content"];
    const text =
      Array.isArray(content) && isObject(content[0]) && typeof content[0]["text"] === "string"
        ? content[0]["text"]
        : "Rigby2D tool reported an error.";
    throw new Rigby2DError("MCP_TOOL_FAILED", text);
  }
  if (result["structuredContent"] !== undefined) return result["structuredContent"];
  const content = result["content"];
  if (Array.isArray(content) && isObject(content[0]) && typeof content[0]["text"] === "string") {
    try {
      return JSON.parse(content[0]["text"]) as unknown;
    } catch {
      return content[0]["text"];
    }
  }
  throw new Rigby2DError("MCP_TOOL_FAILED", "MCP tool returned no structured content.");
}

function readRssKb(pid: number): Promise<number> {
  return new Promise((resolve) => {
    execFile("ps", ["-o", "rss=", "-p", String(pid)], { timeout: 1000 }, (error, stdout) => {
      if (error) {
        resolve(0);
        return;
      }
      const value = Number(stdout.trim());
      resolve(Number.isFinite(value) ? value : 0);
    });
  });
}

/**
 * One ephemeral Rigby2D MCP process bound to one restricted workspace.
 *
 * The client deliberately exposes only an allowlisted set of read/export tools. It never
 * accepts a tool name or executable path from the browser.
 */
export class Rigby2DMcpClient {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly tools = new Map<string, ToolDefinition>();
  private readonly pending = new Map<number, PendingRequest>();
  private readonly stderrLines: string[] = [];
  private readonly traceEntries: Rigby2DTraceEntry[] = [];
  private readonly startedAt = Date.now();
  private readonly exitPromise: Promise<void>;
  private resolveExit: (() => void) | null = null;
  private stdoutBuffer = "";
  private nextRequestId = 1;
  private closed = false;
  private peakRssKb = 0;
  private rssTimer: NodeJS.Timeout | null = null;
  private requestCount = 0;
  private readonly installation: Rigby2DInstallation;
  readonly workspaceRoot: string;
  protocolVersion = "";

  private constructor(installation: Rigby2DInstallation, workspaceRoot: string) {
    this.installation = installation;
    this.workspaceRoot = workspaceRoot;
    this.exitPromise = new Promise((resolve) => {
      this.resolveExit = resolve;
    });
    this.child = spawn(process.execPath, [installation.serverPath, "--root", workspaceRoot], {
      cwd: workspaceRoot,
      detached: process.platform !== "win32",
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child.stdout.setEncoding("utf8");
    this.child.stderr.setEncoding("utf8");
    this.child.stdout.on("data", (chunk: string) => this.onStdout(chunk));
    this.child.stderr.on("data", (chunk: string) => this.onStderr(chunk));
    this.child.on("error", (error) => {
      this.rejectAll(
        new Rigby2DError("MCP_SPAWN_FAILED", `Rigby2D MCP could not start: ${error.message}`),
      );
      this.resolveExit?.();
    });
    this.child.on("exit", (code, signal) => {
      this.closed = true;
      this.rejectAll(
        new Rigby2DError(
          "MCP_PROCESS_EXITED",
          `Rigby2D MCP exited (code ${code ?? "null"}, signal ${signal ?? "none"}).`,
          { stderr: this.stderrText() },
        ),
      );
      this.stopRssSampler();
      this.resolveExit?.();
    });
    this.startRssSampler();
  }

  static async open(workspaceRoot: string): Promise<Rigby2DMcpClient> {
    const installation = await verifyRigby2DInstallation();
    const client = new Rigby2DMcpClient(installation, workspaceRoot);
    try {
      await client.handshake();
      return client;
    } catch (error) {
      await client.close().catch(() => undefined);
      throw error;
    }
  }

  get installationInfo(): Rigby2DInstallation {
    return this.installation;
  }

  get pid(): number | undefined {
    return this.child.pid;
  }

  private async handshake(): Promise<void> {
    const initialized = await this.request(
      "initialize",
      {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "fableon-rigby2d-runtime", version: "0.1.0" },
      },
      RIGBY2D_HANDSHAKE_TIMEOUT_MS,
    );
    if (!isObject(initialized)) {
      throw new Rigby2DError("MCP_HANDSHAKE_FAILED", "Rigby2D MCP initialize returned no object.");
    }
    const serverInfo = initialized["serverInfo"];
    if (!isObject(serverInfo) || serverInfo["name"] !== "rigby2d") {
      throw new Rigby2DError(
        "MCP_HANDSHAKE_FAILED",
        "Rigby2D MCP server identity is not `rigby2d`.",
      );
    }
    if (serverInfo["version"] !== RIGBY2D_VERSION) {
      throw new Rigby2DError(
        "MCP_HANDSHAKE_FAILED",
        `Rigby2D MCP reported version ${String(serverInfo["version"])}; expected ${RIGBY2D_VERSION}.`,
      );
    }
    this.protocolVersion =
      typeof initialized["protocolVersion"] === "string" ? initialized["protocolVersion"] : "";
    this.child.stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
    );
    const listed = await this.request("tools/list", {}, RIGBY2D_HANDSHAKE_TIMEOUT_MS);
    if (!isObject(listed) || !Array.isArray(listed["tools"])) {
      throw new Rigby2DError("MCP_HANDSHAKE_FAILED", "Rigby2D MCP tools/list returned no tools.");
    }
    for (const value of listed["tools"]) {
      if (!isObject(value) || typeof value["name"] !== "string") continue;
      const schema = value["inputSchema"];
      if (!isObject(schema) || schema["type"] !== "object") {
        throw new Rigby2DError(
          "MCP_HANDSHAKE_FAILED",
          `Rigby2D tool ${value["name"]} has no object input schema.`,
        );
      }
      this.tools.set(value["name"], {
        name: value["name"],
        ...(typeof value["description"] === "string" ? { description: value["description"] } : {}),
        inputSchema: schema as JsonSchema,
      });
    }
    const missing = RIGBY2D_ALLOWED_TOOLS.filter((name) => !this.tools.has(name));
    if (missing.length > 0) {
      throw new Rigby2DError(
        "MCP_HANDSHAKE_FAILED",
        `Rigby2D MCP is missing required tools: ${missing.join(", ")}.`,
      );
    }
    this.recordTrace({
      event: "ready",
      ok: true,
      detail: `${this.protocolVersion}; ${this.tools.size} tools; ${this.installation.version}@${this.installation.commit.slice(0, 8)}`,
    });
  }

  private onStdout(chunk: string): void {
    this.stdoutBuffer += chunk;
    let newline = this.stdoutBuffer.indexOf("\n");
    while (newline >= 0) {
      const line = this.stdoutBuffer.slice(0, newline).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newline + 1);
      if (line) this.onLine(line);
      newline = this.stdoutBuffer.indexOf("\n");
    }
  }

  private onLine(line: string): void {
    let message: JsonRpcResponse;
    try {
      message = JSON.parse(line) as JsonRpcResponse;
    } catch {
      this.stderrLines.push(`[protocol] non-JSON stdout: ${line.slice(0, 300)}`);
      return;
    }
    if (typeof message.id !== "number") return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    if (message.error) {
      pending.reject(
        new Rigby2DError("MCP_TOOL_FAILED", message.error.message ?? "Rigby2D MCP error.", {
          code: message.error.code,
          data: message.error.data,
        }),
      );
      return;
    }
    pending.resolve(message.result);
  }

  private onStderr(chunk: string): void {
    for (const line of chunk.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      this.stderrLines.push(trimmed.slice(0, 2000));
      if (this.stderrLines.length > 200) this.stderrLines.shift();
    }
  }

  private recordTrace(entry: Omit<Rigby2DTraceEntry, "at">): void {
    this.traceEntries.push({ at: new Date().toISOString(), ...entry });
    if (this.traceEntries.length > 200) this.traceEntries.shift();
  }

  private request(
    method: string,
    params: Record<string, unknown>,
    timeoutMs = RIGBY2D_DEFAULT_TIMEOUT_MS,
    signal?: AbortSignal,
  ): Promise<unknown> {
    if (this.closed || this.child.exitCode !== null) {
      return Promise.reject(
        new Rigby2DError("MCP_PROCESS_EXITED", "Rigby2D MCP is not running.", {
          stderr: this.stderrText(),
        }),
      );
    }
    if (signal?.aborted) {
      return Promise.reject(new Rigby2DError("MCP_CANCELLED", "Rigby2D request was cancelled."));
    }
    const id = this.nextRequestId++;
    this.requestCount++;
    const started = performance.now();
    return new Promise((resolve, reject) => {
      const finish = (error: unknown, value?: unknown) => {
        const pending = this.pending.get(id);
        if (!pending) return;
        this.pending.delete(id);
        clearTimeout(pending.timer);
        signal?.removeEventListener("abort", onAbort);
        this.recordTrace({
          event: method,
          ok: error === null,
          durationMs: Math.round(performance.now() - started),
          ...(error === null
            ? {}
            : { detail: error instanceof Error ? error.message : String(error) }),
        });
        if (error === null) resolve(value);
        else reject(error);
      };
      const onAbort = () => {
        void this.terminateProcessGroup();
        finish(new Rigby2DError("MCP_CANCELLED", "Rigby2D request was cancelled."));
      };
      const timer = setTimeout(() => {
        void this.terminateProcessGroup();
        finish(
          new Rigby2DError(
            "MCP_TIMEOUT",
            `Rigby2D MCP did not answer ${method} within ${timeoutMs} ms.`,
            { timeoutMs },
          ),
        );
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => finish(null, value),
        reject: (error) => finish(error),
        timer,
      });
      signal?.addEventListener("abort", onAbort, { once: true });
      const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params });
      this.child.stdin.write(`${payload}\n`, "utf8", (error) => {
        if (error) {
          finish(
            new Rigby2DError("MCP_PROCESS_EXITED", `Rigby2D MCP write failed: ${error.message}`),
          );
        }
      });
    });
  }

  async call<T>(
    tool: string,
    args: Record<string, unknown>,
    options: Rigby2DCallOptions = {},
  ): Promise<T> {
    if (!isRigby2DToolAllowed(tool)) {
      throw new Rigby2DError("MCP_TOOL_NOT_ALLOWED", `Rigby2D tool ${tool} is not allowlisted.`);
    }
    const definition = this.tools.get(tool);
    if (!definition) {
      throw new Rigby2DError("MCP_HANDSHAKE_FAILED", `Rigby2D tool ${tool} was not discovered.`);
    }
    const problems = checkArguments(definition.inputSchema, args);
    if (problems.length > 0) {
      throw new Rigby2DError(
        "MCP_TOOL_SCHEMA_INVALID",
        `Invalid Rigby2D arguments for ${tool}: ${problems.join("; ")}.`,
        { problems },
      );
    }
    const started = performance.now();
    try {
      const result = await this.request(
        "tools/call",
        { name: tool, arguments: args },
        options.timeoutMs ?? RIGBY2D_DEFAULT_TIMEOUT_MS,
        options.signal,
      );
      this.recordTrace({
        event: "tool",
        tool,
        ok: true,
        durationMs: Math.round(performance.now() - started),
      });
      return readStructuredContent(result) as T;
    } catch (error) {
      this.recordTrace({
        event: "tool",
        tool,
        ok: false,
        durationMs: Math.round(performance.now() - started),
        detail: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  stderrText(): string {
    return this.stderrLines.join("\n");
  }

  get trace(): readonly Rigby2DTraceEntry[] {
    return this.traceEntries;
  }

  get discovery(): readonly { readonly name: string; readonly description: string }[] {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      description: tool.description ?? "",
    }));
  }

  get resourceUsage(): Rigby2DResourceUsage {
    return {
      peakRssKb: this.peakRssKb,
      elapsedMs: Date.now() - this.startedAt,
      requestCount: this.requestCount,
    };
  }

  private startRssSampler(): void {
    if (process.platform === "win32" || this.child.pid === undefined) return;
    const pid = this.child.pid;
    const sample = async () => {
      const rss = await readRssKb(pid);
      if (rss > this.peakRssKb) this.peakRssKb = rss;
    };
    void sample();
    this.rssTimer = setInterval(() => void sample(), 100);
    this.rssTimer.unref();
  }

  private stopRssSampler(): void {
    if (this.rssTimer) clearInterval(this.rssTimer);
    this.rssTimer = null;
  }

  private rejectAll(error: unknown): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  private async terminateProcessGroup(): Promise<void> {
    if (this.child.pid === undefined || this.closed) return;
    const pid = this.child.pid;
    const signal = (name: NodeJS.Signals) => {
      try {
        if (process.platform === "win32") this.child.kill(name);
        else process.kill(-pid, name);
      } catch {
        try {
          this.child.kill(name);
        } catch {
          // already gone
        }
      }
    };
    signal("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 1200));
    if (this.child.exitCode === null) signal("SIGKILL");
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.stopRssSampler();
    this.rejectAll(new Rigby2DError("MCP_PROCESS_EXITED", "Rigby2D MCP was closed."));
    try {
      this.child.stdin.end();
    } catch {
      // already closed
    }
    await Promise.race([
      this.exitPromise,
      new Promise<void>((resolve) => setTimeout(resolve, 1500)),
    ]);
    if (this.child.exitCode === null) await this.terminateProcessGroup();
  }
}
