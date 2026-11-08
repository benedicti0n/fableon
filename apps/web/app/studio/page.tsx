import type { Metadata } from "next";

import { SAMPLE_PROJECT } from "@fableon/scene-schema/fixtures";

import { StudioInspector } from "./studio-inspector";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "Fableon's Phase 2 Canvas 2D preview and deterministic timeline inspector for the Where the Light Lands benchmark.",
};

export default function StudioPage() {
  return <StudioInspector project={SAMPLE_PROJECT} />;
}
