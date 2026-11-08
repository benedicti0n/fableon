import type { Metadata } from "next";

import { LandingPreview } from "./landing-preview";

export const metadata: Metadata = {
  title: "The Little Bird Comes Home — Phase 2.5",
  description:
    "A two-second layered-bird landing animation rendered by Fableon's hybrid paint and Canvas 2D pipeline.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PhaseTwoPointFivePage() {
  return <LandingPreview />;
}
