import type { Metadata } from "next";

import { FolkStudio } from "@/components/studio/folk-studio";
import { StudioHeader } from "@/components/studio/studio-header";

export const metadata: Metadata = {
  title: "Folk Production",
  description: "Rajasthani-inspired cutout animation production and local export.",
  robots: { index: false, follow: false },
};

export default function FolkPage() {
  return (
    <div className="min-h-screen">
      <StudioHeader />
      <main className="mx-auto max-w-[1600px] px-5 py-8">
        <FolkStudio />
      </main>
    </div>
  );
}
