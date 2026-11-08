import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Badge } from "./badge";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  phase?: string;
  className?: string;
}

/**
 * Explicit empty state for capabilities that do not exist yet. It deliberately
 * contains no interactive affordances that could be mistaken for a feature.
 */
export function EmptyState({ title, description, icon, phase, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center gap-3 rounded-md border border-dashed border-ink-600 bg-ink-950/40 px-5 py-8 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="flex size-9 items-center justify-center rounded-full border border-ink-600 bg-ink-800 text-mist-400">
          {icon}
        </span>
      ) : null}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-paper-100">{title}</p>
        <p className="mx-auto max-w-64 text-xs leading-5 text-mist-400">{description}</p>
      </div>
      {phase ? <Badge variant="outline">{phase}</Badge> : null}
    </div>
  );
}
