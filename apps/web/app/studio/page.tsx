import type { Metadata } from "next";

import { SAMPLE_PROJECT } from "@fableon/scene-schema/fixtures";

import { StudioInspector } from "./studio-inspector";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "Fableon's read-only Phase 1 timeline inspector for the Where the Light Lands scene fixture.",
};

export default function StudioPage() {
  return <StudioInspector project={SAMPLE_PROJECT} />;
}
