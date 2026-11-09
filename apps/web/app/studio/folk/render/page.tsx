import type { Metadata } from "next";

import { FolkRenderSurface } from "./folk-render-surface";

export const metadata: Metadata = {
  title: "Folk Film Render Surface",
  robots: { index: false, follow: false },
};

export default function FolkRenderPage() {
  return (
    <main className="min-h-screen bg-ink-950">
      <FolkRenderSurface />
    </main>
  );
}
