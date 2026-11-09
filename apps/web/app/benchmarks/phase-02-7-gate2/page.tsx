import type { Metadata } from "next";

import { Gate2Benchmark } from "./benchmark";

export const metadata: Metadata = {
  title: "The Little Bird — Gate 2 Production Renderer Proof",
  description:
    "A Gate 2 production-renderer validation of the repaired nine-part Little Bird candidate through Fableon's illustration pack and landing rig.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PhaseTwoPointSevenGateTwoPage() {
  return <Gate2Benchmark />;
}
