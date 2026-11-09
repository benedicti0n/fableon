import type { TitleOverlay } from "@fableon/composition-core";

export interface WrappedTitle {
  readonly lines: readonly string[];
  readonly font: string;
  readonly lineHeight: number;
}

export function titleFont(title: TitleOverlay): string {
  return `600 ${title.fontSize}px "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`;
}

/**
 * Deterministic word wrapping for a title overlay. The caller supplies the
 * canvas measurement function so layout and rendering use the same metrics.
 */
export function wrapTitle(
  title: TitleOverlay,
  measure: (text: string, font: string) => number,
): WrappedTitle {
  const font = titleFont(title);
  const words = title.text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (current.length > 0 && measure(candidate, font) > title.maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) lines.push(current);
  return {
    lines,
    font,
    lineHeight: Math.round(title.fontSize * 1.25),
  };
}
