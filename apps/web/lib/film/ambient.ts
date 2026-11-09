export interface AmbientParticle {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly opacity: number;
  readonly phase: number;
}

export interface AmbientLeaf {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly length: number;
  readonly opacity: number;
}

export interface AmbientState {
  readonly sunOpacity: number;
  readonly mistOffsetX: number;
  readonly mistOpacity: number;
  readonly sway: number;
  readonly particles: readonly AmbientParticle[];
  readonly leaves: readonly AmbientLeaf[];
}

const PARTICLE_COUNT = 22;
const LEAF_COUNT = 9;

function hash01(seed: number, index: number, salt: number): number {
  const value = Math.sin(seed * 0.0001 + index * 127.1 + salt * 311.7) * 43_758.5453;
  return value - Math.floor(value);
}

function wrap01(value: number): number {
  return value - Math.floor(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Ambient state is evaluated from the absolute frame index. It never accumulates
 * state, so rendering frame 400 directly is identical to rendering 0..400.
 */
export function evaluateAmbientState(frame: number, seed: number): AmbientState {
  if (!Number.isInteger(frame) || frame < 0) {
    throw new Error("Ambient frame must be a non-negative integer.");
  }
  const particles: AmbientParticle[] = [];
  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const baseX = hash01(seed, index, 1);
    const baseY = hash01(seed, index, 2);
    const speed = 0.00012 + hash01(seed, index, 3) * 0.00022;
    const drift = Math.sin(frame * 0.012 + index * 1.7 + seed * 0.001) * 0.012;
    particles.push({
      id: index,
      x: clamp(wrap01(baseX + frame * speed + drift), 0.01, 0.99),
      y: clamp(wrap01(baseY + Math.sin(frame * 0.018 + index * 2.3) * 0.008), 0.03, 0.97),
      radius: 0.8 + hash01(seed, index, 4) * 1.8,
      opacity: 0.12 + hash01(seed, index, 5) * 0.26,
      phase: hash01(seed, index, 6) * Math.PI * 2,
    });
  }

  const leaves: AmbientLeaf[] = [];
  for (let index = 0; index < LEAF_COUNT; index += 1) {
    const side = index % 2 === 0 ? 0.08 : 0.92;
    leaves.push({
      id: index,
      x: clamp(side + (hash01(seed, index, 7) - 0.5) * 0.12, 0.02, 0.98),
      y: 0.08 + hash01(seed, index, 8) * 0.72,
      rotation: Math.sin(frame * 0.028 + index * 1.3 + seed * 0.001) * 9,
      length: 10 + hash01(seed, index, 9) * 16,
      opacity: 0.14 + hash01(seed, index, 10) * 0.16,
    });
  }

  return {
    sunOpacity: 0.14 + Math.sin(frame * 0.018) * 0.035,
    mistOffsetX: Math.sin(frame * 0.007) * 0.025,
    mistOpacity: 0.055 + Math.sin(frame * 0.011 + 0.8) * 0.015,
    sway: Math.sin(frame * 0.021) * 1.6,
    particles,
    leaves,
  };
}
