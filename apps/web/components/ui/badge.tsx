import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type BadgeVariant = "neutral" | "accent" | "muted" | "outline";

const variantStyles: Record<BadgeVariant, string> = {
  neutral: "border-ink-600 bg-ink-800 text-mist-200",
  accent: "border-ochre-500/50 bg-ochre-500/10 text-ochre-300",
  muted: "border-ink-700 bg-ink-850 text-mist-400",
  outline: "border-ink-600 bg-transparent text-mist-300",
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-wide whitespace-nowrap uppercase",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
