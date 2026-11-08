import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type ButtonLinkVariant = "primary" | "secondary";

const variantStyles: Record<ButtonLinkVariant, string> = {
  primary: "border-ochre-400 bg-ochre-400 text-ink-950 hover:border-ochre-300 hover:bg-ochre-300",
  secondary: "border-ink-600 bg-transparent text-paper-100 hover:border-mist-400 hover:bg-ink-800",
};

interface ButtonLinkProps {
  href: string;
  children: ReactNode;
  variant?: ButtonLinkVariant;
  className?: string;
}

export function ButtonLink({ href, children, variant = "primary", className }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border px-5 py-2.5 text-sm font-medium transition-colors",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}
