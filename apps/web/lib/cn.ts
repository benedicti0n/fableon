/**
 * Minimal class-name combiner. Fableon intentionally avoids runtime styling
 * dependencies in the foundation phases; primitives accept explicit class
 * overrides instead.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
