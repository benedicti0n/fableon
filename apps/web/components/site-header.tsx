import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-800/80 bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Fableon home">
          <BrandMark />
          <span className="font-serif text-xl tracking-tight text-paper-50">Fableon</span>
          <Badge variant="muted" className="hidden md:inline-flex">
            Phase 0
          </Badge>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-5 text-sm">
          <a
            href="#pipeline"
            className="hidden text-mist-300 transition-colors hover:text-paper-50 sm:inline"
          >
            Pipeline
          </a>
          <Link
            href="/studio"
            className="rounded-md border border-ink-600 px-3.5 py-2 text-paper-100 transition-colors hover:border-ochre-500 hover:text-ochre-300"
          >
            Studio
          </Link>
        </nav>
      </div>
    </header>
  );
}
