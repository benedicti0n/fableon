import type { Metadata } from "next";

import { Phase26Benchmark } from "./benchmark";

export const metadata: Metadata = {
  title: "Imported Artwork, Same Motion — Phase 2.6",
  description:
    "A diagnostic Phase 2.6 benchmark that imports the Phase 2.5 layered bird and forest through Fableon's illustration asset pipeline and animates them with the same deterministic landing motion.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PhaseTwoPointSixPage() {
  return <Phase26Benchmark />;
}
