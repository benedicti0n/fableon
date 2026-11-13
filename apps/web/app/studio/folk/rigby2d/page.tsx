import type { Metadata } from "next";

import { Rigby2DStudio } from "@/components/studio/rigby2d-studio";
import { StudioHeader } from "@/components/studio/studio-header";

export const metadata: Metadata = {
  title: "Rigby2D Character Runtime",
  description:
    "Import, validate, render and preview a real Rigby2D character inside Fableon Studio.",
  robots: { index: false, follow: false },
};

export default function Rigby2DPage() {
  return (
    <div className="min-h-screen">
      <StudioHeader />
      <main className="mx-auto max-w-[1600px] px-5 py-8">
        <Rigby2DStudio />
      </main>
    </div>
  );
}
