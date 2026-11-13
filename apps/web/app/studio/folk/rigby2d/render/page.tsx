import type { Metadata } from "next";

import { Rigby2DShotSurface } from "@/components/studio/rigby2d-shot-surface";

export const metadata: Metadata = {
  title: "Rigby2D Shot Render",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function numeric(value: string | undefined, fallback: number): number {
  const parsed = value === undefined ? NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

interface PageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Rigby2DShotPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <Rigby2DShotSurface
      renderId={first(params["renderId"]) ?? ""}
      anchorX={numeric(first(params["anchorX"]), 960)}
      anchorY={numeric(first(params["anchorY"]), 1040)}
      scale={numeric(first(params["scale"]), 0.9)}
      clipStartFrame={Math.max(0, Math.floor(numeric(first(params["startFrame"]), 0)))}
    />
  );
}
