import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

import type { IllustrationPack } from "./schema";
import {
  deserializeIllustrationPack,
  IllustrationPackError,
  serializeIllustrationPack,
  validateIllustrationPack,
} from "./schema";

export const ILLUSTRATION_PROVENANCE_FORMAT = "fableon.illustration-provenance" as const;
export const ILLUSTRATION_PROVENANCE_VERSION = 1 as const;

export type IllustrationArchiveErrorCode =
  | "invalid_archive"
  | "missing_manifest"
  | "missing_asset"
  | "missing_original_asset"
  | "unsafe_path"
  | "too_large"
  | "invalid_manifest";

export class IllustrationArchiveError extends Error {
  override readonly name = "IllustrationArchiveError";
  readonly code: IllustrationArchiveErrorCode;
  override readonly cause: unknown;

  constructor(code: IllustrationArchiveErrorCode, message: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}

export interface CreateIllustrationArchiveInput {
  readonly pack: IllustrationPack;
  readonly preparedAssets: ReadonlyMap<string, Uint8Array>;
  readonly originalAssets?: ReadonlyMap<string, Uint8Array>;
}

export interface ReadIllustrationArchiveResult {
  readonly pack: IllustrationPack;
  readonly files: ReadonlyMap<string, Uint8Array>;
}

function isSafeArchivePath(path: string): boolean {
  if (
    path.length === 0 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("\0") ||
    path.includes("?") ||
    path.includes("#")
  ) {
    return false;
  }
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(path)) {
    return false;
  }
  return path
    .split("/")
    .every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function provenanceDocument(pack: IllustrationPack): string {
  return `${JSON.stringify(
    {
      format: ILLUSTRATION_PROVENANCE_FORMAT,
      version: ILLUSTRATION_PROVENANCE_VERSION,
      packId: pack.id,
      packName: pack.name,
      parts: pack.parts.map((part) => ({
        id: part.id,
        source: part.source,
        originalSource: part.originalSource ?? null,
        provenance: part.provenance,
        hashes: part.hashes ?? null,
      })),
    },
    null,
    2,
  )}\n`;
}

export function createIllustrationArchive(input: CreateIllustrationArchiveInput): Uint8Array {
  const validation = validateIllustrationPack(input.pack);
  if (!validation.ok) {
    throw new IllustrationArchiveError(
      "invalid_manifest",
      validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"),
    );
  }

  const files: Record<string, Uint8Array> = {
    "manifest.json": strToU8(serializeIllustrationPack(input.pack)),
    "provenance.json": strToU8(provenanceDocument(input.pack)),
  };

  for (const part of input.pack.parts) {
    if (!isSafeArchivePath(part.source)) {
      throw new IllustrationArchiveError(
        "unsafe_path",
        `Part "${part.id}" has an unsafe source path "${part.source}".`,
      );
    }
    const prepared = input.preparedAssets.get(part.source);
    if (!prepared) {
      throw new IllustrationArchiveError(
        "missing_asset",
        `Prepared asset "${part.source}" for part "${part.id}" is missing from the archive.`,
      );
    }
    files[part.source] = prepared;

    if (part.originalSource) {
      if (!isSafeArchivePath(part.originalSource)) {
        throw new IllustrationArchiveError(
          "unsafe_path",
          `Part "${part.id}" has an unsafe original source path "${part.originalSource}".`,
        );
      }
      const original = input.originalAssets?.get(part.originalSource);
      if (!original) {
        throw new IllustrationArchiveError(
          "missing_original_asset",
          `Original asset "${part.originalSource}" for part "${part.id}" is missing from the archive.`,
        );
      }
      files[part.originalSource] = original;
    }
  }

  const sorted: Record<string, Uint8Array> = {};
  for (const path of Object.keys(files).sort()) {
    sorted[path] = files[path] as Uint8Array;
  }

  return zipSync(sorted, { level: 6 });
}

export function readIllustrationArchive(bytes: Uint8Array): ReadIllustrationArchiveResult {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch (error) {
    throw new IllustrationArchiveError(
      "invalid_archive",
      "The illustration pack archive is not a readable ZIP file.",
      error,
    );
  }

  const paths = Object.keys(entries).filter((path) => !path.endsWith("/"));
  if (paths.length > 256) {
    throw new IllustrationArchiveError(
      "too_large",
      `Illustration pack archive contains ${paths.length} entries; the limit is 256.`,
    );
  }

  let totalBytes = 0;
  for (const path of paths) {
    if (!isSafeArchivePath(path)) {
      throw new IllustrationArchiveError(
        "unsafe_path",
        `Illustration pack archive contains an unsafe path "${path}".`,
      );
    }
    totalBytes += entries[path]?.byteLength ?? 0;
  }
  if (totalBytes > 100 * 1024 * 1024) {
    throw new IllustrationArchiveError(
      "too_large",
      `Illustration pack archive expands to ${totalBytes} bytes; the limit is 100 MiB.`,
    );
  }

  const manifestBytes = entries["manifest.json"];
  if (!manifestBytes) {
    throw new IllustrationArchiveError(
      "missing_manifest",
      "Illustration pack archive does not contain manifest.json.",
    );
  }

  let pack: IllustrationPack;
  try {
    pack = deserializeIllustrationPack(strFromU8(manifestBytes));
  } catch (error) {
    if (error instanceof IllustrationPackError) {
      throw new IllustrationArchiveError("invalid_manifest", error.message, error);
    }
    throw new IllustrationArchiveError(
      "invalid_manifest",
      "Illustration pack manifest could not be parsed.",
      error,
    );
  }

  for (const part of pack.parts) {
    if (!entries[part.source]) {
      throw new IllustrationArchiveError(
        "missing_asset",
        `Illustration pack archive is missing prepared asset "${part.source}" for part "${part.id}".`,
      );
    }
    if (part.originalSource && !entries[part.originalSource]) {
      throw new IllustrationArchiveError(
        "missing_original_asset",
        `Illustration pack archive is missing original asset "${part.originalSource}" for part "${part.id}".`,
      );
    }
  }

  return {
    pack,
    files: new Map(Object.entries(entries)),
  };
}
