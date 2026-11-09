import type { Metadata } from "next";

import { CompositionStudio } from "@/components/studio/composition-studio";
import { StudioHeader } from "@/components/studio/studio-header";

export const metadata: Metadata = {
  title: "Composition",
  description: "Deterministic multi-shot composition preview and local MP4 export.",
  robots: { index: false, follow: false },
};

export default function CompositionPage() {
  return (
    <div className="min-h-screen">
      <StudioHeader />
      <main className="mx-auto max-w-[1600px] px-5 py-8">
        <CompositionStudio />
      </main>
    </div>
  );
}
