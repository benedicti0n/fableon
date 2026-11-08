import { cn } from "@/lib/cn";

interface BrandMarkProps {
  className?: string;
}

/**
 * The Fableon mark: an abstract quill drawn in a single warm stroke.
 * Purely decorative; the adjacent wordmark carries the accessible name.
 */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={cn("size-9 shrink-0", className)}
    >
      <rect x="1" y="1" width="38" height="38" rx="10" fill="#12151a" stroke="#2a2f38" />
      <path
        d="M10.5 29.5c5.7-1.2 10.2-4.4 13.4-9.5 2.1-3.5 3.4-7 3.9-10.6-4.6 1.4-8.3 4-11 7.8-2.6 3.6-4.1 7.6-4.5 12.3Z"
        fill="#dfb168"
      />
      <path
        d="M10.8 29.2c3.4-6.2 7.5-10.8 12.9-14.6"
        stroke="#12151a"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="29" cy="10.5" r="1.2" fill="#9db398" />
    </svg>
  );
}
