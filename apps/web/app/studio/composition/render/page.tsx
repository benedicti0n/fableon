import type { Metadata } from "next";

import { FilmRenderSurface } from "./film-render-surface";

export const metadata: Metadata = {
  title: "Film Render Surface",
  robots: { index: false, follow: false },
};

export default function FilmRenderPage() {
  return (
    <main className="min-h-screen bg-ink-950">
      <FilmRenderSurface />
    </main>
  );
}
