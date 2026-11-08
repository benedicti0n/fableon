import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Badge } from "./badge";

interface PanelProps {
  title: string;
  status?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  headingId?: string;
}

/**
 * A bordered workspace panel used by the Studio shell. The status is visible
 * by default so placeholder regions cannot be mistaken for working tools.
 */
export function Panel({
  title,
  status = "Not yet implemented",
  children,
  className,
  bodyClassName,
  headingId,
}: PanelProps) {
  return (
    <section
      aria-labelledby={headingId}
      aria-label={headingId ? undefined : title}
      className={cn("flex min-h-0 flex-col rounded-lg border border-ink-700 bg-ink-900", className)}
    >
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-ink-700 px-3.5 py-2">
        <h2
          id={headingId}
          className="font-mono text-[11px] font-medium tracking-[0.14em] text-mist-200 uppercase"
        >
          {title}
        </h2>
        <Badge variant="muted">{status}</Badge>
      </header>
      <div className={cn("min-h-0 flex-1 p-3.5", bodyClassName)}>{children}</div>
    </section>
  );
}
