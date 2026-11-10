import type { Metadata } from "next";

import { ProviderWorkspace } from "@/components/studio/provider-workspace";
import { StudioHeader } from "@/components/studio/studio-header";

export const metadata: Metadata = {
  title: "Provider Artwork",
  description: "OpenAI and Gemini image-generation workspace with explicit spending gates.",
  robots: { index: false, follow: false },
};

export default function ProvidersPage() {
  return (
    <div className="min-h-screen">
      <StudioHeader />
      <main className="mx-auto max-w-[1600px] px-5 py-8">
        <ProviderWorkspace />
      </main>
    </div>
  );
}
