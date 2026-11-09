import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";

export function StudioHeader() {
  return (
    <header
      data-testid="studio-header"
      className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/90 backdrop-blur-md"
    >
      <div className="mx-auto flex min-h-16 max-w-[1600px] flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3">
        <Link href="/" className="flex items-center gap-3" aria-label="Fableon home">
          <BrandMark />
          <span className="font-serif text-xl tracking-tight text-paper-50">Fableon</span>
        </Link>
        <span aria-hidden="true" className="hidden h-5 w-px bg-ink-700 sm:block" />
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-[0.18em] text-mist-400 uppercase">
            AI Video Studio
          </span>
          <Badge variant="accent">Phase 4</Badge>
        </div>
        <nav aria-label="Studio" className="ml-auto flex flex-wrap items-center gap-1 text-xs">
          <Link
            href="/studio/projects"
            className="rounded-md px-3 py-2 text-mist-300 transition-colors hover:bg-ink-850 hover:text-paper-50"
          >
            Projects
          </Link>
          <Link
            href="/studio/composition"
            className="rounded-md px-3 py-2 text-mist-300 transition-colors hover:bg-ink-850 hover:text-paper-50"
          >
            Composition
          </Link>
          <Link
            href="/studio"
            className="rounded-md px-3 py-2 text-mist-300 transition-colors hover:bg-ink-850 hover:text-paper-50"
          >
            Timeline Inspector
          </Link>
          <Link
            href="/studio/assets"
            className="rounded-md px-3 py-2 text-mist-300 transition-colors hover:bg-ink-850 hover:text-paper-50"
          >
            Illustration Assets
          </Link>
        </nav>
      </div>
    </header>
  );
}
