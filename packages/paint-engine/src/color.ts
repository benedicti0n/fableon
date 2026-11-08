export type HexColor = `#${string}`;

function parseHexColor(color: string): readonly [number, number, number] {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new Error(`Expected a six-digit hex color; received "${color}".`);
  }

  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ];
}

function channelToHex(channel: number): string {
  return Math.round(Math.min(Math.max(channel, 0), 255))
    .toString(16)
    .padStart(2, "0");
}

/** Mixes two #RRGGBB colors. `amount` is clamped to 0..1. */
export function mixHexColors(from: string, to: string, amount: number): string {
  const [r1, g1, b1] = parseHexColor(from);
  const [r2, g2, b2] = parseHexColor(to);
  const t = Math.min(Math.max(amount, 0), 1);

  return `#${channelToHex(r1 + (r2 - r1) * t)}${channelToHex(g1 + (g2 - g1) * t)}${channelToHex(
    b1 + (b2 - b1) * t,
  )}`;
}

/** Produces a CSS rgba() color from #RRGGBB plus an alpha in 0..1. */
export function hexToRgba(color: string, alpha: number): string {
  const [red, green, blue] = parseHexColor(color);
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(Math.max(alpha, 0), 1)})`;
}

/** Relative luminance helper for choosing a light or dark pigment variant. */
export function hexLuminance(color: string): number {
  const [red, green, blue] = parseHexColor(color);
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
}
