export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

function catmullRom(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

/**
 * Samples a curved polyline through the supplied control points using
 * Catmull-Rom interpolation. Two points become a line; one point returns it.
 */
export function sampleCurve(points: readonly Vec2[], samplesPerSegment = 16): Vec2[] {
  if (points.length === 0) {
    return [];
  }
  if (points.length === 1) {
    return [points[0] as Vec2];
  }

  if (samplesPerSegment < 1 || !Number.isInteger(samplesPerSegment)) {
    throw new Error("samplesPerSegment must be a positive integer.");
  }

  if (points.length === 2) {
    const [start, end] = points as [Vec2, Vec2];
    const result: Vec2[] = [];
    for (let index = 0; index <= samplesPerSegment; index += 1) {
      const t = index / samplesPerSegment;
      result.push({
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
      });
    }
    return result;
  }

  const result: Vec2[] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(index - 1, 0)] as Vec2;
    const p1 = points[index] as Vec2;
    const p2 = points[index + 1] as Vec2;
    const p3 = points[Math.min(index + 2, points.length - 1)] as Vec2;

    for (let step = 0; step < samplesPerSegment; step += 1) {
      result.push(catmullRom(p0, p1, p2, p3, step / samplesPerSegment));
    }
  }

  result.push(points[points.length - 1] as Vec2);
  return result;
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function normalAt(previous: Vec2, next: Vec2): Vec2 {
  const dx = next.x - previous.x;
  const dy = next.y - previous.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: -dy / length, y: dx / length };
}
