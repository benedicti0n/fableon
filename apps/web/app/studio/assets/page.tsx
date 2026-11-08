import type { Metadata } from "next";

import { AssetWorkspace } from "./asset-workspace";

export const metadata: Metadata = {
  title: "Illustration Assets",
  description:
    "Prepare, inspect, register, and export layered illustration packs for Fableon's deterministic animation pipeline.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function IllustrationAssetsPage() {
  return <AssetWorkspace />;
}
