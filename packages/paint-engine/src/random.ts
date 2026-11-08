/**
 * Stable 32-bit seed derivation and Mulberry32 pseudo-randomness. Paint code
 * never calls Math.random; all variation comes from an explicit seed.
 */

export type SeededRandom = () => number;

const FNV_OFFSET = 2_166_136_261;
const FNV_PRIME = 16_777_619;

/** FNV-1a hash over stable string parts, returned as an unsigned 32-bit integer. */
export function hashSeed(parts: readonly (string | number)[]): number {
  const input = parts.map(String).join("\u001f");
  let hash = FNV_OFFSET;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return hash >>> 0;
}

/**
 * Derives a paint seed from a base seed and stable identifiers. For example:
 * workspace seed + scene ID + layer ID + paint-element ID.
 */
export function derivePaintSeed(baseSeed: number, ...parts: readonly (string | number)[]): number {
  return hashSeed([baseSeed, ...parts]);
}

/** Mulberry32: a compact deterministic PRNG with a documented uint32 state. */
export function createSeededRandom(seed: number): SeededRandom {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}
