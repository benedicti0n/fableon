export interface AnimationView {
  readonly name: string;
  readonly duration: number;
  readonly timelines: number;
  readonly events: number;
}

export interface BoneView {
  readonly name: string;
  readonly parent: string | null;
  readonly length: number;
}

export interface SlotView {
  readonly name: string;
  readonly bone: string | null;
  readonly attachment: string | null;
}

export interface ValidationView {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly checks: Readonly<Record<string, string>>;
}

export interface McpTraceView {
  readonly at: string;
  readonly event: string;
  readonly tool?: string;
  readonly durationMs?: number;
  readonly ok: boolean;
  readonly detail?: string;
}

export interface McpEvidenceView {
  readonly protocolVersion: string;
  readonly toolCount: number;
  readonly elapsedMs: number;
  readonly peakRssKb: number;
  readonly requestCount: number;
  readonly trace: readonly McpTraceView[];
  readonly stderr: string;
}

export interface VersionSummaryView {
  readonly versionId: string;
  readonly sha256: string;
  readonly importedAt: string;
  readonly animations: readonly AnimationView[];
  readonly validationValid: boolean;
}

export interface CharacterManifestView {
  readonly characterId: string;
  readonly name: string;
  readonly runtime: "rigby2d";
  readonly runtimeVersion: string;
  readonly runtimeCommit: string;
  readonly sourceAttribution: string;
  readonly artisticReviewStatus: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly currentVersionId: string;
  readonly versions: readonly VersionSummaryView[];
}

export interface CharacterVersionView {
  readonly characterId: string;
  readonly versionId: string;
  readonly runtime: "rigby2d";
  readonly runtimeVersion: string;
  readonly runtimeCommit: string;
  readonly name: string;
  readonly sourceFileName: string;
  readonly sourceAttribution: string;
  readonly artisticReviewStatus: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly importedAt: string;
  readonly format: string;
  readonly projectName: string;
  readonly counts: {
    readonly bones: number;
    readonly slots: number;
    readonly skins: number;
    readonly constraints: number;
    readonly events: number;
    readonly animations: number;
    readonly images: number;
  };
  readonly animations: readonly AnimationView[];
  readonly bones: readonly BoneView[];
  readonly slots: readonly SlotView[];
  readonly validation: ValidationView;
  readonly mcp: McpEvidenceView;
}

export interface FrameRenderView {
  readonly cacheKey: string;
  readonly characterId: string;
  readonly versionId: string;
  readonly sourceSha256: string;
  readonly runtimeVersion: string;
  readonly runtimeCommit: string;
  readonly animation: string;
  readonly fps: number;
  readonly scale: number;
  readonly frameCount: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly pivot: { readonly x: number; readonly y: number };
  readonly origin: { readonly x: number; readonly y: number };
  readonly durationSeconds: number;
  readonly frameFiles: readonly string[];
  readonly createdAt: string;
  readonly exportMs: number;
  readonly metadataMs: number;
  readonly cacheBytes: number;
  readonly mcp: McpEvidenceView;
}

export interface RenderJobView {
  readonly id: string;
  readonly status: "queued" | "rendering" | "completed" | "failed" | "cancelled";
  readonly phase:
    "queued" | "starting" | "exporting" | "caching" | "completed" | "failed" | "cancelled";
  readonly progress: number;
  readonly characterId: string;
  readonly versionId: string;
  readonly animation: string;
  readonly fps: number;
  readonly scale: number;
  readonly cacheKey: string;
  readonly frameCount: number;
  readonly durationSeconds: number;
  readonly cached: boolean;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly durationMs: number | null;
  readonly cancelRequested: boolean;
  readonly errorCode: string | null;
  readonly error: string | null;
  readonly frameRender: FrameRenderView | null;
}

export interface PoseCheckView {
  readonly flexion: number;
  readonly requestedFlexion: number;
  readonly delta: number;
  readonly tolerance: number;
  readonly passed: boolean;
  readonly bendSide: -1 | 0 | 1;
  readonly upperLength: number;
  readonly lowerLength: number;
  readonly animation: string;
  readonly timeSeconds: number;
  readonly chain: { readonly a: string; readonly b: string; readonly c: string };
  readonly ikTarget: { readonly name: string; readonly x: number; readonly y: number } | null;
}

export interface RuntimeHealthView {
  readonly available: boolean;
  readonly runtime: "rigby2d";
  readonly version: string;
  readonly commit: string;
  readonly sourceHash: string;
}
