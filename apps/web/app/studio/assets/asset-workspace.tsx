"use client";

/* eslint-disable @next/next/no-img-element -- imported artwork uses runtime object URLs, which Next Image cannot optimize. */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  assignCharacterPart,
  assignEnvironmentLayer,
  CHARACTER_RIG_TEMPLATE,
  characterPreparationSummary,
  createEmptyCharacterPack,
  createEmptyEnvironmentPack,
  createEnvironmentRenderPlan,
  createIllustrationArchive,
  ENVIRONMENT_LAYER_TEMPLATE,
  partDrawOffset,
  prepareImageBlob,
  readIllustrationArchive,
  removePartAndDescendants,
  roleKey,
  updateEnvironmentLayerOrder,
  updatePartOcclusion,
  updatePartPivot,
  updatePartRegistration,
  validateCharacterPreparation,
  validateEnvironmentPreparation,
  type IllustrationPack,
  type PreparedImageImport,
} from "@fableon/illustration-pipeline";

import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";

type WorkspaceMode = "character" | "environment";

interface ImportedWorkspaceAsset {
  readonly id: string;
  readonly fileName: string;
  readonly bytes: Uint8Array;
  readonly prepared: PreparedImageImport;
  readonly originalUrl: string;
  readonly preparedUrl: string;
  readonly image: HTMLImageElement;
}

interface ArchiveWorkspace {
  readonly mode: WorkspaceMode;
  readonly pack: IllustrationPack;
  readonly images: ReadonlyMap<string, CanvasImageSource>;
  readonly preparedAssets: ReadonlyMap<string, Uint8Array>;
  readonly originalAssets: ReadonlyMap<string, Uint8Array>;
  readonly urls: readonly string[];
}

const DEFAULT_CHARACTER_REGISTRATION: Record<string, { x: number; y: number }> = {
  body: { x: 332, y: 352 },
  head: { x: 432, y: 202 },
  eye: { x: 552, y: 292 },
  beak: { x: 590, y: 352 },
  "wing-far": { x: 232, y: 352 },
  "wing-near": { x: 332, y: 372 },
  tail: { x: 182, y: 402 },
  "leg-left": { x: 382, y: 552 },
  "leg-right": { x: 482, y: 552 },
};

const secondaryButtonClassName =
  "inline-flex items-center justify-center rounded-md border border-ink-600 px-3 py-1.5 text-xs text-mist-200 transition-colors hover:border-mist-400 hover:text-paper-50 disabled:cursor-not-allowed disabled:opacity-40";
const primaryButtonClassName =
  "inline-flex items-center justify-center rounded-md border border-ochre-400 bg-ochre-400 px-3 py-1.5 text-xs font-medium text-ink-950 transition-colors hover:border-ochre-300 hover:bg-ochre-300 disabled:cursor-not-allowed disabled:opacity-40";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function mimeForPath(path: string): string {
  const extension = path.split(".").at(-1)?.toLowerCase();
  if (extension === "webp") return "image/webp";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  return "image/png";
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

function detectRole(fileName: string, mode: WorkspaceMode): string | null {
  const stem = fileName.replace(/\.[^.]+$/, "");
  const key = roleKey(stem);
  if (mode === "character") {
    const template = CHARACTER_RIG_TEMPLATE.find((part) => roleKey(part.id) === key);
    return template?.id ?? null;
  }
  const template = ENVIRONMENT_LAYER_TEMPLATE.find((part) => roleKey(part.id) === key);
  if (template) return template.id;
  const aliases: Record<string, string> = {
    background: "sky",
    plate: "sky",
    forest: "distant-forest",
    distant: "distant-forest",
    midground: "midground-trees",
    foreground: "foreground-trees",
    branch: "landing-branch",
    light: "atmospheric-light",
    mist: "atmospheric-light",
    details: "foreground-details",
  };
  return aliases[key] ?? null;
}

function triggerDownload(bytes: Uint8Array, fileName: string, mimeType: string): void {
  const blob = new Blob([toArrayBuffer(bytes)], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Checkerboard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-md border border-ink-700"
      style={{
        backgroundColor: "#12151a",
        backgroundImage:
          "linear-gradient(45deg, #1b1f26 25%, transparent 25%), linear-gradient(-45deg, #1b1f26 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1b1f26 75%), linear-gradient(-45deg, transparent 75%, #1b1f26 75%)",
        backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0",
        backgroundSize: "24px 24px",
      }}
    >
      {children}
    </div>
  );
}

export function AssetWorkspace() {
  const [mode, setMode] = useState<WorkspaceMode>("character");
  const [characterPack, setCharacterPack] = useState<IllustrationPack>(() =>
    createEmptyCharacterPack({
      id: "storybook-bird-import",
      name: "Storybook Bird — Imported",
      canvas: { width: 1024, height: 1024 },
    }),
  );
  const [environmentPack, setEnvironmentPack] = useState<IllustrationPack>(() =>
    createEmptyEnvironmentPack({
      id: "forest-environment-import",
      name: "Forest Environment — Imported",
      canvas: { width: 1920, height: 1080 },
    }),
  );
  const [characterAssignments, setCharacterAssignments] = useState<Record<string, string>>({});
  const [environmentAssignments, setEnvironmentAssignments] = useState<Record<string, string>>({});
  const [assets, setAssets] = useState<ImportedWorkspaceAsset[]>([]);
  const [archive, setArchive] = useState<ArchiveWorkspace | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<string | null>("body");
  const [trimOnImport, setTrimOnImport] = useState(true);
  const [showBounds, setShowBounds] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<{
    kind: "info" | "success" | "error";
    text: string;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const assetCounter = useRef(0);
  const createdUrls = useRef<string[]>([]);

  const pack = mode === "character" ? characterPack : environmentPack;
  const assignments = mode === "character" ? characterAssignments : environmentAssignments;
  const preparation =
    mode === "character"
      ? validateCharacterPreparation(characterPack)
      : validateEnvironmentPreparation(environmentPack);
  const archiveForMode = archive?.mode === mode ? archive : null;
  const assetsById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const selectedAsset = selectedAssetId ? assetsById.get(selectedAssetId) : undefined;
  const selectedPart =
    pack.parts.find((part) => part.id === selectedPartId) ?? pack.parts[0] ?? null;
  const blockingIssues = preparation.issues.filter((issue) => issue.severity === "error");

  const previewImages = useMemo(() => {
    const images = new Map<string, CanvasImageSource>();
    for (const part of pack.parts) {
      const assetId = assignments[part.id];
      const asset = assetId ? assetsById.get(assetId) : undefined;
      if (asset) {
        images.set(part.id, asset.image);
        continue;
      }
      const archived = archiveForMode?.images.get(part.id);
      if (archived) {
        images.set(part.id, archived);
      }
    }
    return images;
  }, [archiveForMode, assetsById, assignments, pack.parts]);

  useEffect(() => {
    const urls = createdUrls.current;
    return () => {
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    canvas.width = pack.canvas.width;
    canvas.height = pack.canvas.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    if (mode === "character") {
      const ordered = [...pack.parts].sort((left, right) => left.zIndex - right.zIndex);
      for (const part of ordered) {
        const image = previewImages.get(part.id);
        if (!image) continue;
        const offset = partDrawOffset(part);
        context.drawImage(
          image,
          offset.x,
          offset.y,
          part.preparedSize.width,
          part.preparedSize.height,
        );
      }
    } else {
      const plan = createEnvironmentRenderPlan(pack);
      for (const command of plan) {
        const image = previewImages.get(command.part.id);
        if (!image) continue;
        context.save();
        try {
          context.globalAlpha = command.transform.opacity;
          context.translate(command.x, command.y);
          context.rotate((command.transform.rotation * Math.PI) / 180);
          context.scale(command.transform.scaleX, command.transform.scaleY);
          context.drawImage(image, 0, 0, command.width, command.height);
        } finally {
          context.restore();
        }
      }
    }

    if (selectedPart && showBounds) {
      context.save();
      try {
        context.lineWidth = 1.5;
        context.font = "14px Menlo, monospace";
        context.textBaseline = "bottom";

        if (mode === "character") {
          context.strokeStyle = "rgba(239, 207, 152, 0.55)";
          context.strokeRect(
            selectedPart.registration.x + 0.5,
            selectedPart.registration.y + 0.5,
            selectedPart.originalSize.width,
            selectedPart.originalSize.height,
          );
          context.fillStyle = "rgba(239, 207, 152, 0.8)";
          context.fillText(
            "source",
            selectedPart.registration.x + 4,
            selectedPart.registration.y - 4,
          );

          const offset = partDrawOffset(selectedPart);
          context.strokeStyle = "rgba(157, 179, 152, 0.9)";
          context.strokeRect(
            offset.x + 0.5,
            offset.y + 0.5,
            selectedPart.preparedSize.width,
            selectedPart.preparedSize.height,
          );
          context.fillStyle = "rgba(157, 179, 152, 0.95)";
          context.fillText("prepared", offset.x + 4, offset.y - 4);

          const pivotX = selectedPart.registration.x + selectedPart.pivot.x;
          const pivotY = selectedPart.registration.y + selectedPart.pivot.y;
          context.strokeStyle = "#dfb168";
          context.fillStyle = "#dfb168";
          context.beginPath();
          context.moveTo(pivotX - 10, pivotY);
          context.lineTo(pivotX + 10, pivotY);
          context.moveTo(pivotX, pivotY - 10);
          context.lineTo(pivotX, pivotY + 10);
          context.stroke();
          context.beginPath();
          context.arc(pivotX, pivotY, 3.5, 0, Math.PI * 2);
          context.fill();
          context.fillText("pivot", pivotX + 8, pivotY - 6);
        } else {
          context.strokeStyle = "rgba(239, 207, 152, 0.8)";
          context.strokeRect(
            selectedPart.registration.x + 0.5,
            selectedPart.registration.y + 0.5,
            selectedPart.originalSize.width,
            selectedPart.originalSize.height,
          );
          context.fillStyle = "#dfb168";
          context.fillText(
            `${selectedPart.id} · z${selectedPart.zIndex}`,
            selectedPart.registration.x + 4,
            selectedPart.registration.y - 4,
          );
        }
      } finally {
        context.restore();
      }
    }
  }, [mode, pack, previewImages, selectedPart, showBounds]);

  function setActivePack(next: IllustrationPack): void {
    if (mode === "character") {
      setCharacterPack(next);
    } else {
      setEnvironmentPack(next);
    }
  }

  function setActiveAssignments(next: Record<string, string>): void {
    if (mode === "character") {
      setCharacterAssignments(next);
    } else {
      setEnvironmentAssignments(next);
    }
  }

  function switchMode(next: WorkspaceMode): void {
    setMode(next);
    setSelectedAssetId(null);
    setSelectedPartId(next === "character" ? "body" : "sky");
    setMessage(null);
  }

  async function handleArtworkFiles(files: FileList | null): Promise<void> {
    const fileList = Array.from(files ?? []);
    if (fileList.length === 0) {
      return;
    }

    setIsImporting(true);
    setMessage(null);
    let nextPack = pack;
    const nextAssignments = { ...assignments };
    const importedAssets: ImportedWorkspaceAsset[] = [];
    const errors: string[] = [];

    for (const file of fileList) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const prepared = await prepareImageBlob(
          {
            fileName: file.name,
            mimeType: file.type,
            bytes,
          },
          {
            trim: trimOnImport,
            alphaThreshold: 0,
          },
        );
        const preparedUrl = URL.createObjectURL(prepared.preparedBlob);
        const originalUrl = URL.createObjectURL(file);
        createdUrls.current.push(preparedUrl, originalUrl);
        const image = await loadImage(preparedUrl);
        const id = `asset-${++assetCounter.current}`;
        const role = detectRole(file.name, mode);
        const asset: ImportedWorkspaceAsset = {
          id,
          fileName: file.name,
          bytes,
          prepared,
          originalUrl,
          preparedUrl,
          image,
        };
        importedAssets.push(asset);

        if (role) {
          const existing = nextPack.parts.find((part) => part.id === role);
          if (mode === "character") {
            nextPack = assignCharacterPart(nextPack, {
              templateId: role,
              imported: prepared,
              registration: existing?.registration ??
                DEFAULT_CHARACTER_REGISTRATION[role] ?? { x: 0, y: 0 },
              pivot: existing
                ? { x: existing.pivot.x, y: existing.pivot.y }
                : {
                    x: prepared.inspection.width / 2,
                    y: prepared.inspection.height / 2,
                  },
              provenance: {
                kind: "user-created",
                notes: `Imported from ${file.name} in the preparation workspace.`,
              },
            });
          } else {
            nextPack = assignEnvironmentLayer(nextPack, {
              role,
              imported: prepared,
              registration: existing?.registration ?? { x: 0, y: 0 },
              ...(existing?.transform ? { transform: existing.transform } : {}),
              provenance: {
                kind: "user-created",
                notes: `Imported from ${file.name} in the preparation workspace.`,
              },
            });
          }
          nextAssignments[role] = id;
        }
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (importedAssets.length > 0) {
      setAssets((current) => [...current, ...importedAssets]);
      setActivePack(nextPack);
      setActiveAssignments(nextAssignments);
      setSelectedAssetId(importedAssets[0]?.id ?? null);
      const firstAssigned = importedAssets.find((asset) => detectRole(asset.fileName, mode));
      if (firstAssigned) {
        setSelectedPartId(detectRole(firstAssigned.fileName, mode));
      }
    }

    setIsImporting(false);
    if (errors.length > 0) {
      setMessage({ kind: "error", text: errors.join(" ") });
    } else if (importedAssets.length > 0) {
      setMessage({
        kind: "success",
        text: `Imported and inspected ${importedAssets.length} image(s). Session-only until the pack is exported.`,
      });
    }
  }

  function handleAssign(role: string, assetId: string): void {
    const asset = assetsById.get(assetId);
    if (!asset) {
      const pruned =
        mode === "character"
          ? removePartAndDescendants(pack, role)
          : {
              ...pack,
              parts: pack.parts.filter((part) => part.id !== role),
            };
      const remainingIds = new Set(pruned.parts.map((part) => part.id));
      const nextAssignments = { ...assignments };
      for (const partId of Object.keys(nextAssignments)) {
        if (!remainingIds.has(partId)) {
          delete nextAssignments[partId];
        }
      }
      setActivePack(pruned);
      setActiveAssignments(nextAssignments);
      setSelectedPartId(pruned.parts[0]?.id ?? null);
      return;
    }

    const existing = pack.parts.find((part) => part.id === role);
    if (mode === "character") {
      setCharacterPack(
        assignCharacterPart(characterPack, {
          templateId: role,
          imported: asset.prepared,
          registration: existing?.registration ??
            DEFAULT_CHARACTER_REGISTRATION[role] ?? { x: 0, y: 0 },
          pivot: existing
            ? { x: existing.pivot.x, y: existing.pivot.y }
            : {
                x: asset.prepared.inspection.width / 2,
                y: asset.prepared.inspection.height / 2,
              },
          provenance: {
            kind: "user-created",
            notes: `Assigned from ${asset.fileName} in the preparation workspace.`,
          },
        }),
      );
      setCharacterAssignments({ ...characterAssignments, [role]: assetId });
    } else {
      setEnvironmentPack(
        assignEnvironmentLayer(environmentPack, {
          role,
          imported: asset.prepared,
          registration: existing?.registration ?? { x: 0, y: 0 },
          ...(existing?.transform ? { transform: existing.transform } : {}),
          provenance: {
            kind: "user-created",
            notes: `Assigned from ${asset.fileName} in the preparation workspace.`,
          },
        }),
      );
      setEnvironmentAssignments({ ...environmentAssignments, [role]: assetId });
    }
    setSelectedPartId(role);
  }

  function updatePivot(axis: "x" | "y", value: number): void {
    if (!selectedPart || !Number.isFinite(value)) return;
    setActivePack(
      updatePartPivot(pack, selectedPart.id, {
        x: axis === "x" ? value : selectedPart.pivot.x,
        y: axis === "y" ? value : selectedPart.pivot.y,
      }),
    );
  }

  function updateRegistration(axis: "x" | "y", value: number): void {
    if (!selectedPart || !Number.isFinite(value)) return;
    setActivePack(
      updatePartRegistration(pack, selectedPart.id, {
        x: axis === "x" ? value : selectedPart.registration.x,
        y: axis === "y" ? value : selectedPart.registration.y,
      }),
    );
  }

  function toggleOcclusion(checked: boolean): void {
    if (!selectedPart || mode !== "character") return;
    setActivePack(
      updatePartOcclusion(
        pack,
        selectedPart.id,
        checked
          ? {
              requiresReconstruction: true,
              note: "Marked in the preparation workspace: hidden anatomy requires authored replacement artwork.",
            }
          : undefined,
      ),
    );
  }

  function moveEnvironmentLayer(partId: string, direction: -1 | 1): void {
    if (mode !== "environment") return;
    const ordered = [...pack.parts].sort((left, right) => left.zIndex - right.zIndex);
    const index = ordered.findIndex((part) => part.id === partId);
    const neighbor = ordered[index + direction];
    const current = ordered[index];
    if (!current || !neighbor) return;

    let next = updateEnvironmentLayerOrder(pack, current.id, neighbor.zIndex);
    next = updateEnvironmentLayerOrder(next, neighbor.id, current.zIndex);
    setActivePack(next);
    setSelectedPartId(current.id);
  }

  async function handleArchiveFile(file: File | null): Promise<void> {
    if (!file) return;
    setIsImporting(true);
    setMessage(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = readIllustrationArchive(bytes);
      const nextMode: WorkspaceMode =
        result.pack.kind === "environment" ? "environment" : "character";
      const images = new Map<string, CanvasImageSource>();
      const urls: string[] = [];

      for (const part of result.pack.parts) {
        const assetBytes = result.files.get(part.source);
        if (!assetBytes) continue;
        const objectUrl = URL.createObjectURL(
          new Blob([toArrayBuffer(assetBytes)], { type: mimeForPath(part.source) }),
        );
        createdUrls.current.push(objectUrl);
        urls.push(objectUrl);
        images.set(part.id, await loadImage(objectUrl));
      }

      setArchive({
        mode: nextMode,
        pack: result.pack,
        images,
        preparedAssets: result.files,
        originalAssets: result.files,
        urls,
      });
      if (nextMode === "character") {
        setCharacterPack(result.pack);
      } else {
        setEnvironmentPack(result.pack);
      }
      setMode(nextMode);
      setCharacterAssignments({});
      setEnvironmentAssignments({});
      setSelectedAssetId(null);
      setSelectedPartId(result.pack.parts[0]?.id ?? null);
      setMessage({
        kind: "success",
        text: `Imported ${result.pack.parts.length}-part ${nextMode} pack “${result.pack.name}”. Pivot edits and re-export are available.`,
      });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsImporting(false);
    }
  }

  async function exportPack(): Promise<void> {
    setIsExporting(true);
    setMessage(null);
    try {
      if (!preparation.ready) {
        throw new Error(
          `Pack is not ready for export. ${preparation.issues
            .filter((issue) => issue.severity === "error")
            .map((issue) => issue.message)
            .join(" ")}`,
        );
      }

      const preparedAssets = new Map(
        archiveForMode?.preparedAssets ?? ([] as Array<[string, Uint8Array]>),
      );
      const originalAssets = new Map(
        archiveForMode?.originalAssets ?? ([] as Array<[string, Uint8Array]>),
      );

      for (const part of pack.parts) {
        const assetId = assignments[part.id];
        const asset = assetId ? assetsById.get(assetId) : undefined;
        if (asset) {
          preparedAssets.set(part.source, asset.prepared.preparedBytes);
          if (part.originalSource) {
            originalAssets.set(part.originalSource, asset.bytes);
          }
        }
        if (!preparedAssets.has(part.source)) {
          throw new Error(`No prepared asset bytes exist for part "${part.id}".`);
        }
      }

      const bytes = createIllustrationArchive({
        pack,
        preparedAssets,
        originalAssets,
      });
      triggerDownload(bytes, `${pack.id}.fableon-pack.zip`, "application/zip");
      setMessage({
        kind: "success",
        text: `Exported ${pack.parts.length} parts with manifest, prepared derivatives, originals, and provenance.`,
      });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsExporting(false);
    }
  }

  const templateRows = mode === "character" ? CHARACTER_RIG_TEMPLATE : ENVIRONMENT_LAYER_TEMPLATE;
  const packLabel = mode === "character" ? "Character pack" : "Environment pack";
  const statusLabel = preparation.ready ? "Ready" : "Incomplete";

  return (
    <div className="flex min-h-screen flex-col">
      <h1 className="sr-only">Illustration Asset Preparation</h1>

      <header className="flex min-h-14 flex-wrap items-center gap-3 border-b border-ink-700 bg-ink-900/90 px-4 py-2">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Fableon home">
          <BrandMark className="size-8" />
          <span className="hidden font-serif text-lg tracking-tight text-paper-50 sm:inline">
            Fableon
          </span>
        </Link>
        <span aria-hidden="true" className="hidden h-5 w-px bg-ink-600 sm:block" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-paper-100">
            Illustration Asset Preparation
          </p>
          <p className="truncate font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
            Phase 2.6 · local files only · no AI generation
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="accent">Asset pipeline</Badge>
          <Link href="/studio" className={secondaryButtonClassName}>
            Studio
          </Link>
          <Link
            href="/"
            className="rounded-md border border-ink-700 px-2.5 py-1.5 text-[11px] text-mist-300 transition-colors hover:border-ink-500 hover:text-paper-50"
          >
            Exit
          </Link>
        </div>
      </header>

      <div className="grid flex-1 gap-3 p-3 xl:grid-cols-[20rem_minmax(0,1fr)_22rem]">
        <aside className="flex min-w-0 flex-col gap-3">
          <Panel title="Workspace" status={`${assets.length} sources`} bodyClassName="space-y-3">
            <div
              className="grid grid-cols-2 gap-2"
              role="tablist"
              aria-label="Asset workspace mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "character"}
                onClick={() => switchMode("character")}
                className={cn(
                  "rounded-md border px-3 py-2 text-xs",
                  mode === "character"
                    ? "border-ochre-500/60 bg-ochre-500/10 text-ochre-200"
                    : "border-ink-600 text-mist-300 hover:border-ink-500",
                )}
              >
                Character
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "environment"}
                onClick={() => switchMode("environment")}
                className={cn(
                  "rounded-md border px-3 py-2 text-xs",
                  mode === "environment"
                    ? "border-ochre-500/60 bg-ochre-500/10 text-ochre-200"
                    : "border-ink-600 text-mist-300 hover:border-ink-500",
                )}
              >
                Environment
              </button>
            </div>

            <label
              htmlFor="artwork-import"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-ink-500 bg-ink-950/40 px-4 py-6 text-center transition-colors hover:border-ochre-500/60"
            >
              <span className="font-serif text-lg text-paper-100">
                {isImporting ? "Inspecting artwork…" : "Import artwork"}
              </span>
              <span className="text-[11px] leading-5 text-mist-400">
                PNG, WebP, or JPEG. Transparent parts preferred. Files remain local.
              </span>
              <span className={secondaryButtonClassName}>Select local files</span>
              <input
                id="artwork-import"
                type="file"
                multiple
                accept="image/png,image/webp,image/jpeg"
                aria-label="Import artwork files"
                className="sr-only"
                onChange={(event) => {
                  void handleArtworkFiles(event.currentTarget.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>

            <label className="flex items-center gap-2 text-[11px] text-mist-300">
              <input
                type="checkbox"
                checked={trimOnImport}
                onChange={(event) => setTrimOnImport(event.currentTarget.checked)}
                className="accent-ochre-400"
              />
              Trim transparent padding on import (threshold 0)
            </label>

            <label className={cn(secondaryButtonClassName, "w-full cursor-pointer")}>
              Import pack ZIP
              <input
                type="file"
                accept=".zip,application/zip"
                aria-label="Import illustration pack"
                className="sr-only"
                onChange={(event) => {
                  void handleArchiveFile(event.currentTarget.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
            </label>

            <p className="border-t border-ink-700 pt-3 text-[10px] leading-4 text-mist-500">
              Session-only workspace. Nothing is durably saved until you export a pack archive. No
              generation provider is connected.
            </p>
          </Panel>

          <Panel title="Source inspection" status={selectedAsset ? "Selected" : "None"}>
            {selectedAsset ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-paper-100">{selectedAsset.fileName}</p>
                    <p className="mt-1 font-mono text-[9px] text-mist-500">
                      {selectedAsset.prepared.inspection.format} ·{" "}
                      {formatBytes(selectedAsset.bytes.byteLength)} ·{" "}
                      {selectedAsset.prepared.inspection.sourceHash.slice(0, 12)}…
                    </p>
                  </div>
                  <Badge variant="outline">
                    {selectedAsset.prepared.inspection.analysis.hasAlpha ? "alpha" : "opaque"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 font-mono text-[9px] tracking-[0.1em] text-mist-500 uppercase">
                      Original
                    </p>
                    <Checkerboard>
                      <img
                        src={selectedAsset.originalUrl}
                        alt={`${selectedAsset.fileName} original`}
                        className="aspect-square w-full object-contain"
                      />
                    </Checkerboard>
                  </div>
                  <div>
                    <p className="mb-1 font-mono text-[9px] tracking-[0.1em] text-mist-500 uppercase">
                      Prepared
                    </p>
                    <Checkerboard>
                      <img
                        src={selectedAsset.preparedUrl}
                        alt={`${selectedAsset.fileName} prepared derivative`}
                        className="aspect-square w-full object-contain"
                      />
                    </Checkerboard>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 font-mono text-[10px]">
                  <div>
                    <dt className="text-mist-500">Source</dt>
                    <dd className="text-paper-100">
                      {selectedAsset.prepared.inspection.width}×
                      {selectedAsset.prepared.inspection.height}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-mist-500">Prepared</dt>
                    <dd className="text-paper-100">
                      {selectedAsset.prepared.preparedWidth}×{selectedAsset.prepared.preparedHeight}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-mist-500">Offset</dt>
                    <dd className="text-paper-100">
                      {selectedAsset.prepared.preparedOffsetX},{" "}
                      {selectedAsset.prepared.preparedOffsetY}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-mist-500">Trim</dt>
                    <dd className="text-paper-100">
                      {selectedAsset.prepared.trim.applied ? "applied" : "off"}
                    </dd>
                  </div>
                </dl>

                {selectedAsset.prepared.inspection.warnings.length > 0 ? (
                  <ul className="space-y-1.5 border-t border-ink-700 pt-3">
                    {selectedAsset.prepared.inspection.warnings.map((warning) => (
                      <li
                        key={`${warning.code}-${warning.message}`}
                        className={cn(
                          "text-[10px] leading-4",
                          warning.severity === "warning" ? "text-ochre-200" : "text-mist-400",
                        )}
                      >
                        <span className="font-mono uppercase">{warning.code}</span> —{" "}
                        {warning.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="border-t border-ink-700 pt-3 text-[10px] text-mist-500">
                    No alpha or edge warnings from inspection.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] leading-5 text-mist-500">
                Select an imported asset to inspect dimensions, alpha bounds, trim offsets, hashes,
                and non-destructive edge warnings.
              </p>
            )}
          </Panel>
        </aside>

        <main className="flex min-w-0 flex-col gap-3">
          <Panel
            title="Composition preview"
            status={mode === "character" ? "Character" : "Environment"}
            bodyClassName="flex flex-col gap-3"
          >
            <div
              data-testid="asset-composition"
              data-mode={mode}
              data-ready={previewImages.size > 0 ? "true" : "false"}
              data-part-count={pack.parts.length}
              data-selected-part={selectedPart?.id ?? ""}
              data-pivot={selectedPart ? `${selectedPart.pivot.x},${selectedPart.pivot.y}` : ""}
              data-pack-state={preparation.ready ? "ready" : "incomplete"}
              data-source={archiveForMode ? "archive" : "session"}
              className={cn(
                "relative w-full overflow-hidden rounded-md border border-ink-700",
                mode === "character" ? "aspect-square" : "aspect-video",
              )}
              style={{
                backgroundColor: "#12151a",
                backgroundImage:
                  "linear-gradient(45deg, #1b1f26 25%, transparent 25%), linear-gradient(-45deg, #1b1f26 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1b1f26 75%), linear-gradient(-45deg, transparent 75%, #1b1f26 75%)",
                backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0",
                backgroundSize: "24px 24px",
              }}
            >
              <canvas
                ref={canvasRef}
                role="img"
                aria-label={`${packLabel} composition preview`}
                className="block h-full w-full"
              />
              {pack.parts.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                  <p className="font-serif text-2xl text-paper-50">No prepared layers yet</p>
                  <p className="max-w-md text-xs leading-5 text-mist-400">
                    Import transparent artwork or a pack archive. Fableon will inspect it and show
                    bounds, pivots, trim offsets, and draw order here.
                  </p>
                </div>
              ) : null}
              <span className="pointer-events-none absolute top-3 left-3 rounded-full border border-ink-700 bg-ink-950/70 px-2.5 py-0.5 font-mono text-[9px] text-mist-300">
                {pack.canvas.width}×{pack.canvas.height}
              </span>
              <span className="pointer-events-none absolute top-3 right-3 rounded-full border border-ink-700 bg-ink-950/70 px-2.5 py-0.5 font-mono text-[9px] text-mist-300 uppercase">
                {archiveForMode ? "imported archive" : "session composition"}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-[11px] text-mist-300">
                  <input
                    type="checkbox"
                    checked={showBounds}
                    onChange={(event) => setShowBounds(event.currentTarget.checked)}
                    className="accent-ochre-400"
                  />
                  Bounds &amp; pivot overlay
                </label>
                <span className="font-mono text-[9px] text-mist-500 uppercase">
                  {previewImages.size}/{pack.parts.length} decoded
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={preparation.ready ? "accent" : "outline"}>{statusLabel}</Badge>
                <Badge variant="muted">
                  {mode === "character"
                    ? characterPreparationSummary(validateCharacterPreparation(characterPack))
                    : `${pack.parts.length} layers`}
                </Badge>
              </div>
            </div>
          </Panel>

          <Panel title="Pack readiness" status={statusLabel} bodyClassName="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="muted">{pack.id}</Badge>
              <Badge variant="outline">{pack.kind}</Badge>
              <Badge variant="outline">
                {pack.parts.length} / {templateRows.length} template parts
              </Badge>
              <Badge variant={blockingIssues.length > 0 ? "outline" : "accent"}>
                {blockingIssues.length} blocking
              </Badge>
              {archiveForMode ? <Badge variant="accent">archive source</Badge> : null}
            </div>

            {preparation.issues.length > 0 ? (
              <ul className="space-y-1.5">
                {preparation.issues.map((issue) => (
                  <li
                    key={`${issue.code}-${issue.path}`}
                    className={cn(
                      "rounded-md border px-2.5 py-2 text-[10px] leading-4",
                      issue.severity === "error"
                        ? "border-clay-500/40 bg-clay-500/5 text-clay-500"
                        : "border-ink-700 bg-ink-950/30 text-mist-400",
                    )}
                  >
                    <span className="font-mono uppercase">{issue.severity}</span> · {issue.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] leading-5 text-sage-400">
                All structural checks passed. Export the pack to preserve the manifest, prepared
                derivatives, originals, and provenance.
              </p>
            )}

            <div className="flex flex-wrap gap-2 border-t border-ink-700 pt-3">
              <button
                type="button"
                onClick={() => void exportPack()}
                disabled={isExporting || !preparation.ready}
                className={primaryButtonClassName}
              >
                {isExporting ? "Packaging…" : "Export pack ZIP"}
              </button>
              <button
                type="button"
                onClick={() => setMessage(null)}
                className={secondaryButtonClassName}
              >
                Clear message
              </button>
            </div>
            {message ? (
              <p
                role={message.kind === "error" ? "alert" : "status"}
                className={cn(
                  "rounded-md border px-2.5 py-2 text-[10px] leading-4",
                  message.kind === "error"
                    ? "border-clay-500/40 bg-clay-500/5 text-clay-500"
                    : message.kind === "success"
                      ? "border-sage-500/40 bg-sage-500/5 text-sage-400"
                      : "border-ink-700 text-mist-400",
                )}
              >
                {message.text}
              </p>
            ) : null}
          </Panel>
        </main>

        <aside className="flex min-w-0 flex-col gap-3">
          <Panel
            title={mode === "character" ? "Character parts" : "Environment layers"}
            status={`${pack.parts.length} / ${templateRows.length}`}
            bodyClassName="space-y-3"
          >
            <div className="space-y-1.5">
              {templateRows.map((template) => {
                const part = pack.parts.find(
                  (candidate) =>
                    roleKey(candidate.id) === roleKey(template.id) ||
                    (candidate.role !== undefined &&
                      roleKey(candidate.role) === roleKey(template.id)),
                );
                const selected = selectedPart?.id === part?.id;
                const archivePart = Boolean(archiveForMode && part && !assignments[template.id]);
                return (
                  <div
                    key={template.id}
                    className={cn(
                      "rounded-md border px-2.5 py-2",
                      selected
                        ? "border-ochre-500/60 bg-ochre-500/5"
                        : "border-ink-700 bg-ink-950/30",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (part) {
                            setSelectedPartId(part.id);
                          }
                        }}
                        className="min-w-0 text-left"
                      >
                        <span className="block truncate text-xs text-paper-100">
                          {template.name}
                        </span>
                        <span className="mt-0.5 block font-mono text-[9px] text-mist-500">
                          z{part?.zIndex ?? template.zIndex} · {part ? "present" : "missing"}
                        </span>
                      </button>
                      <Badge variant={part ? "accent" : "outline"}>
                        {part ? "ready" : "needed"}
                      </Badge>
                    </div>

                    <label className="mt-2 block">
                      <span className="sr-only">{`Assign asset to ${template.name}`}</span>
                      <select
                        aria-label={`Assign asset to ${template.name}`}
                        value={assignments[template.id] ?? (archivePart ? "__archive__" : "")}
                        onChange={(event) => {
                          if (event.currentTarget.value === "__archive__") return;
                          handleAssign(template.id, event.currentTarget.value);
                        }}
                        className="w-full rounded-md border border-ink-600 bg-ink-900 px-2 py-1.5 text-[11px] text-mist-200"
                      >
                        {archivePart ? (
                          <option value="__archive__">Archive: {part?.source}</option>
                        ) : null}
                        <option value="">— Missing —</option>
                        {assets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.fileName}
                          </option>
                        ))}
                      </select>
                    </label>

                    {mode === "environment" && part ? (
                      <div className="mt-2 flex gap-1">
                        <button
                          type="button"
                          aria-label={`Move ${template.name} backward`}
                          onClick={() => moveEnvironmentLayer(part.id, -1)}
                          className={secondaryButtonClassName}
                        >
                          ← depth
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${template.name} forward`}
                          onClick={() => moveEnvironmentLayer(part.id, 1)}
                          className={secondaryButtonClassName}
                        >
                          depth →
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Pivot & registration" status={selectedPart ? selectedPart.id : "None"}>
            {selectedPart ? (
              <div className="space-y-3">
                <p className="text-[10px] leading-4 text-mist-500">
                  Pivot is stored in original source coordinates. Registration places the source in
                  the pack canvas. Editing either redraws the composed preview immediately.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="font-mono text-[9px] tracking-[0.1em] text-mist-500 uppercase">
                      Pivot x
                    </span>
                    <input
                      type="number"
                      aria-label="Pivot x"
                      value={selectedPart.pivot.x}
                      onChange={(event) => updatePivot("x", Number(event.currentTarget.value))}
                      className="mt-1 w-full rounded-md border border-ink-600 bg-ink-900 px-2 py-1.5 font-mono text-xs text-paper-100"
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[9px] tracking-[0.1em] text-mist-500 uppercase">
                      Pivot y
                    </span>
                    <input
                      type="number"
                      aria-label="Pivot y"
                      value={selectedPart.pivot.y}
                      onChange={(event) => updatePivot("y", Number(event.currentTarget.value))}
                      className="mt-1 w-full rounded-md border border-ink-600 bg-ink-900 px-2 py-1.5 font-mono text-xs text-paper-100"
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[9px] tracking-[0.1em] text-mist-500 uppercase">
                      Register x
                    </span>
                    <input
                      type="number"
                      aria-label="Registration x"
                      value={selectedPart.registration.x}
                      onChange={(event) =>
                        updateRegistration("x", Number(event.currentTarget.value))
                      }
                      className="mt-1 w-full rounded-md border border-ink-600 bg-ink-900 px-2 py-1.5 font-mono text-xs text-paper-100"
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[9px] tracking-[0.1em] text-mist-500 uppercase">
                      Register y
                    </span>
                    <input
                      type="number"
                      aria-label="Registration y"
                      value={selectedPart.registration.y}
                      onChange={(event) =>
                        updateRegistration("y", Number(event.currentTarget.value))
                      }
                      className="mt-1 w-full rounded-md border border-ink-600 bg-ink-900 px-2 py-1.5 font-mono text-xs text-paper-100"
                    />
                  </label>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-ink-700 pt-3 font-mono text-[10px]">
                  <div>
                    <dt className="text-mist-500">Source bounds</dt>
                    <dd className="text-paper-100">
                      {selectedPart.originalSize.width}×{selectedPart.originalSize.height}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-mist-500">Prepared</dt>
                    <dd className="text-paper-100">
                      {selectedPart.preparedSize.width}×{selectedPart.preparedSize.height}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-mist-500">Trim offset</dt>
                    <dd className="text-paper-100">
                      {selectedPart.preparedOffset.x}, {selectedPart.preparedOffset.y}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-mist-500">Parent</dt>
                    <dd className="text-paper-100">{selectedPart.parentId ?? "root"}</dd>
                  </div>
                </dl>

                {mode === "character" ? (
                  <label className="flex items-start gap-2 border-t border-ink-700 pt-3 text-[10px] leading-4 text-mist-300">
                    <input
                      type="checkbox"
                      checked={selectedPart.occlusion?.requiresReconstruction ?? false}
                      onChange={(event) => toggleOcclusion(event.currentTarget.checked)}
                      className="mt-0.5 accent-ochre-400"
                    />
                    <span>
                      Hidden anatomy requires reconstruction
                      <span className="mt-0.5 block text-mist-500">
                        A flattened or masked source cannot reveal occluded geometry. This blocks
                        animation-readiness until authored replacement artwork is supplied.
                      </span>
                    </span>
                  </label>
                ) : null}
              </div>
            ) : (
              <p className="text-[11px] leading-5 text-mist-500">
                Select a present part to edit its pivot and registration.
              </p>
            )}
          </Panel>

          <Panel title="Scope" status="Phase 2.6">
            <ul className="space-y-2 text-[10px] leading-4 text-mist-400">
              <li>Local import, inspection, and explicit masking are implemented.</li>
              <li>No AI generation, auto-rigging, inpainting, or hidden-anatomy invention.</li>
              <li>Character and environment packs share one portable archive format.</li>
              <li>Session state only; export is the durable artifact.</li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
