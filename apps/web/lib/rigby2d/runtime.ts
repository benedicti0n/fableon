import { copyFile } from "node:fs/promises";
import path from "node:path";

import { RIGBY2D_PROJECT_FILE } from "./constants";
import {
  getVersionProjectPath,
  readCharacter,
  readVersion,
  validateCharacterVersion,
  type Rigby2DAnimationInfo,
  type Rigby2DBoneInfo,
  type Rigby2DCharacterVersion,
  type Rigby2DSlotInfo,
  type Rigby2DValidationResult,
} from "./assets";
import { Rigby2DError } from "./errors";
import {
  cancelRenderJob,
  getRenderJobFile,
  readRenderJob,
  releaseRenderJob,
  startRender,
  type Rigby2DRenderJob,
} from "./jobs";
import { getFrameFile, type FrameRenderMetadata } from "./frames";
import { evaluateFlexionCheck, type FlexionCheck } from "./pose";
import { Rigby2DMcpClient, type Rigby2DTraceEntry } from "./mcp-client";
import { createJobWorkspace, removeJobWorkspace } from "./storage";

export interface Rigby2DMcpJobEvidence {
  readonly protocolVersion: string;
  readonly toolCount: number;
  readonly elapsedMs: number;
  readonly peakRssKb: number;
  readonly requestCount: number;
  readonly trace: readonly Rigby2DTraceEntry[];
  readonly stderr: string;
}

export interface CharacterInfo {
  readonly characterId: string;
  readonly versionId: string;
  readonly name: string;
  readonly runtime: "rigby2d";
  readonly runtimeVersion: string;
  readonly runtimeCommit: string;
  readonly sourceSha256: string;
  readonly format: string;
  readonly projectName: string;
  readonly counts: Rigby2DCharacterVersion["counts"];
  readonly animations: readonly Rigby2DAnimationInfo[];
  readonly bones: readonly Rigby2DBoneInfo[];
  readonly slots: readonly Rigby2DSlotInfo[];
  readonly validation: Rigby2DValidationResult;
  readonly artisticReviewStatus: string;
  readonly mcp?: Rigby2DMcpJobEvidence;
}

export interface CharacterJoint {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

export interface CharacterPose {
  readonly animation: string;
  readonly timeSeconds: number;
  readonly bones: readonly (CharacterJoint & { readonly name: string })[];
  readonly bounds: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  } | null;
  readonly slots: readonly { readonly name: string; readonly attachment: string | null }[];
  readonly drawOrder: readonly string[];
  readonly mcp: Rigby2DMcpJobEvidence;
}

export interface CharacterFrame {
  readonly renderId: string;
  readonly frameIndex: number;
  readonly path: string;
  readonly fileName: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
}

export interface AnimationRender {
  readonly job: Rigby2DRenderJob;
  readonly metadata: FrameRenderMetadata;
}

export interface SamplePoseOptions {
  readonly versionId?: string;
  readonly signal?: AbortSignal;
}

export interface RenderOptions {
  readonly versionId?: string;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

interface RawPose {
  readonly animation?: string;
  readonly time?: number;
  readonly bones?: readonly Record<string, unknown>[];
  readonly slots?: readonly Record<string, unknown>[];
  readonly drawOrder?: readonly unknown[];
  readonly bounds?: Record<string, unknown> | null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberField(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function evidence(client: Rigby2DMcpClient): Rigby2DMcpJobEvidence {
  return {
    protocolVersion: client.protocolVersion,
    toolCount: client.discovery.length,
    elapsedMs: client.resourceUsage.elapsedMs,
    peakRssKb: client.resourceUsage.peakRssKb,
    requestCount: client.resourceUsage.requestCount,
    trace: client.trace,
    stderr: client.stderrText(),
  };
}

async function withProjectClient<T>(
  characterId: string,
  versionId: string,
  dataRoot: string | undefined,
  task: (client: Rigby2DMcpClient) => Promise<T>,
): Promise<T> {
  const project = await getVersionProjectPath(characterId, versionId, dataRoot);
  const job = await createJobWorkspace(dataRoot);
  let client: Rigby2DMcpClient | null = null;
  try {
    await copyFile(project, path.join(job.workspaceDir, RIGBY2D_PROJECT_FILE));
    client = await Rigby2DMcpClient.open(job.workspaceDir);
    return await task(client);
  } finally {
    if (client) await client.close().catch(() => undefined);
    await removeJobWorkspace(job.jobDir);
  }
}

export class Rigby2DCharacterRuntime {
  private readonly dataRoot: string | undefined;

  constructor(options: { readonly dataRoot?: string } = {}) {
    this.dataRoot = options.dataRoot;
  }

  async inspect(characterId: string, versionId?: string): Promise<CharacterInfo> {
    const version = await this.version(characterId, versionId);
    return withProjectClient(characterId, version.versionId, this.dataRoot, async (client) => {
      const inspect = await client.call<Record<string, unknown>>("inspect_project", {
        path: RIGBY2D_PROJECT_FILE,
      });
      const counts = isObject(inspect["counts"]) ? inspect["counts"] : {};
      return {
        characterId,
        versionId: version.versionId,
        name: version.name,
        runtime: "rigby2d",
        runtimeVersion: version.runtimeVersion,
        runtimeCommit: version.runtimeCommit,
        sourceSha256: version.sha256,
        format: stringField(inspect["format"]),
        projectName: stringField(inspect["name"]),
        counts: {
          bones: numberField(counts["bones"]),
          slots: numberField(counts["slots"]),
          skins: numberField(counts["skins"]),
          constraints: numberField(counts["constraints"]),
          events: numberField(counts["events"]),
          animations: numberField(counts["animations"]),
          images: numberField(counts["images"]),
        },
        animations: version.animations,
        bones: version.bones,
        slots: version.slots,
        validation: version.validation,
        artisticReviewStatus: version.artisticReviewStatus,
        mcp: evidence(client),
      };
    });
  }

  async validate(characterId: string, versionId?: string): Promise<Rigby2DValidationResult> {
    const version = await this.version(characterId, versionId);
    const result = await validateCharacterVersion(characterId, version.versionId, this.dataRoot);
    return result.validation;
  }

  async samplePose(
    characterId: string,
    animation: string,
    timeSeconds: number,
    options: SamplePoseOptions = {},
  ): Promise<CharacterPose> {
    const version = await this.version(characterId, options.versionId);
    if (!version.animations.some((entry) => entry.name === animation)) {
      throw new Rigby2DError("ANIMATION_NOT_FOUND", `Animation ${animation} is not present.`);
    }
    if (!Number.isFinite(timeSeconds) || timeSeconds < 0) {
      throw new Rigby2DError("INVALID_INPUT", "Pose time must be a non-negative number.");
    }
    return withProjectClient(characterId, version.versionId, this.dataRoot, async (client) => {
      const raw = await client.call<RawPose>(
        "sample_pose",
        { path: RIGBY2D_PROJECT_FILE, animation, time: timeSeconds },
        options.signal ? { signal: options.signal } : {},
      );
      const bounds = isObject(raw.bounds)
        ? {
            minX: numberField(raw.bounds["minX"]),
            minY: numberField(raw.bounds["minY"]),
            maxX: numberField(raw.bounds["maxX"]),
            maxY: numberField(raw.bounds["maxY"]),
          }
        : null;
      return {
        animation: stringField(raw.animation) || animation,
        timeSeconds: numberField(raw.time),
        bones: Array.isArray(raw.bones)
          ? raw.bones.filter(isObject).map((bone) => ({
              name: stringField(bone["name"]),
              x: numberField(bone["x"]),
              y: numberField(bone["y"]),
              rotation: numberField(bone["rotation"]),
              scaleX: numberField(bone["scaleX"]),
              scaleY: numberField(bone["scaleY"]),
            }))
          : [],
        bounds,
        slots: Array.isArray(raw.slots)
          ? raw.slots.filter(isObject).map((slot) => ({
              name: stringField(slot["name"]),
              attachment: typeof slot["attachment"] === "string" ? slot["attachment"] : null,
            }))
          : [],
        drawOrder: Array.isArray(raw.drawOrder)
          ? raw.drawOrder.filter((entry): entry is string => typeof entry === "string")
          : [],
        mcp: evidence(client),
      };
    });
  }

  async measureFlexion(
    characterId: string,
    input: {
      readonly animation: string;
      readonly timeSeconds: number;
      readonly chain: { readonly a: string; readonly b: string; readonly c: string };
      readonly requestedFlexion: number;
      readonly tolerance?: number;
      readonly versionId?: string;
      readonly ikTargetBone?: string;
    },
  ): Promise<FlexionCheck> {
    const pose = await this.samplePose(characterId, input.animation, input.timeSeconds, {
      ...(input.versionId ? { versionId: input.versionId } : {}),
    });
    const byName = new Map(pose.bones.map((bone) => [bone.name, bone]));
    const jointA = byName.get(input.chain.a);
    const jointB = byName.get(input.chain.b);
    const jointC = byName.get(input.chain.c);
    if (!jointA || !jointB || !jointC) {
      throw new Rigby2DError(
        "POSE_CHAIN_INVALID",
        `Pose chain is missing one of ${input.chain.a}, ${input.chain.b}, ${input.chain.c}.`,
      );
    }
    const targetName = input.ikTargetBone ?? "ik_hand_r";
    const target = byName.get(targetName);
    return evaluateFlexionCheck({
      jointA,
      jointB,
      jointC,
      requestedFlexion: input.requestedFlexion,
      tolerance: input.tolerance ?? 3,
      animation: input.animation,
      timeSeconds: input.timeSeconds,
      chain: input.chain,
      ikTarget: target ? { name: target.name, x: target.x, y: target.y } : null,
    });
  }

  async renderAnimation(
    characterId: string,
    animation: string,
    fps: number,
    options: RenderOptions = {},
  ): Promise<AnimationRender> {
    const version = await this.version(characterId, options.versionId);
    const job = await startRender({
      characterId,
      versionId: version.versionId,
      animation,
      fps,
      scale: 1,
      ...(this.dataRoot ? { dataRoot: this.dataRoot } : {}),
    });
    const terminal = await this.waitForJob(job, options);
    if (terminal.status !== "completed" || !terminal.frameRender) {
      throw new Rigby2DError(
        terminal.status === "cancelled" ? "MCP_CANCELLED" : "MCP_TOOL_FAILED",
        terminal.error ?? "Rigby2D render did not complete.",
        { jobId: terminal.id, status: terminal.status },
      );
    }
    return { job: terminal, metadata: terminal.frameRender };
  }

  async startRender(
    characterId: string,
    animation: string,
    fps: number,
    options: RenderOptions = {},
  ): Promise<Rigby2DRenderJob> {
    const version = await this.version(characterId, options.versionId);
    return startRender({
      characterId,
      versionId: version.versionId,
      animation,
      fps,
      scale: 1,
      ...(this.dataRoot ? { dataRoot: this.dataRoot } : {}),
    });
  }

  async getFrame(renderId: string, frameIndex: number): Promise<CharacterFrame> {
    const job = await readRenderJob(renderId, this.dataRoot);
    if (!job.frameRender) {
      throw new Rigby2DError(
        "RENDER_NOT_FOUND",
        `Render ${renderId} has no completed frame sequence.`,
      );
    }
    const file = await getFrameFile(job.cacheKey, frameIndex, this.dataRoot);
    return {
      renderId,
      frameIndex,
      path: file.path,
      fileName: file.fileName,
      frameWidth: job.frameRender.frameWidth,
      frameHeight: job.frameRender.frameHeight,
    };
  }

  async cancel(renderId: string): Promise<Rigby2DRenderJob> {
    return cancelRenderJob(renderId, this.dataRoot);
  }

  async release(renderId: string): Promise<{ released: boolean }> {
    return releaseRenderJob(renderId, this.dataRoot);
  }

  private async version(characterId: string, versionId?: string): Promise<Rigby2DCharacterVersion> {
    if (versionId) return readVersion(characterId, versionId, this.dataRoot);
    const manifest = await readCharacter(characterId, this.dataRoot);
    return readVersion(characterId, manifest.currentVersionId, this.dataRoot);
  }

  private async waitForJob(
    initial: Rigby2DRenderJob,
    options: RenderOptions,
  ): Promise<Rigby2DRenderJob> {
    const timeoutMs = options.timeoutMs ?? 180_000;
    const started = Date.now();
    let job = initial;
    while (job.status === "queued" || job.status === "rendering") {
      if (options.signal?.aborted) {
        job = await cancelRenderJob(job.id, this.dataRoot);
        throw new Rigby2DError("MCP_CANCELLED", "Rigby2D render was cancelled.", {
          jobId: job.id,
        });
      }
      if (Date.now() - started > timeoutMs) {
        await cancelRenderJob(job.id, this.dataRoot).catch(() => undefined);
        throw new Rigby2DError("MCP_TIMEOUT", `Rigby2D render exceeded ${timeoutMs} ms.`, {
          jobId: job.id,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      job = await readRenderJob(job.id, this.dataRoot);
    }
    return job;
  }
}

export { getRenderJobFile };
