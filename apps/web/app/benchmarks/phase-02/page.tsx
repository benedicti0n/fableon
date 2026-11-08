import type { Metadata } from "next";

import { BenchmarkHarness } from "./benchmark-harness";

export const metadata: Metadata = {
  title: "Phase 2 benchmark harness",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PhaseTwoBenchmarkPage() {
  return <BenchmarkHarness />;
}
