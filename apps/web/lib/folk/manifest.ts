import { readFile } from "node:fs/promises";
import path from "node:path";

import type { FolkAssetManifest } from "./assets";

export async function readFolkManifest(): Promise<FolkAssetManifest> {
  const candidates = [
    path.join(process.cwd(), "public", "assets", "folk-pilot", "manifest.json"),
    path.join(process.cwd(), "apps", "web", "public", "assets", "folk-pilot", "manifest.json"),
  ];
  for (const candidate of candidates) {
    try {
      return JSON.parse(await readFile(candidate, "utf8")) as FolkAssetManifest;
    } catch {
      // Try the next workspace-relative location.
    }
  }
  throw new Error("The folk asset manifest could not be read.");
}
