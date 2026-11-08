import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-800">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-xs text-mist-500 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Fableon home">
          <BrandMark className="size-7" />
          <span className="font-serif text-sm text-mist-200">Fableon</span>
        </Link>
        <p>
          Phase 1 · Scene timeline. Scene data and inspection are live; no renderer, audio, or AI
          pipeline is connected yet.
        </p>
      </div>
    </footer>
  );
}
