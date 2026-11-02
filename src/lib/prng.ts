// Seeded randomness. The only source of randomness allowed in the film (never Math.random).
// Everything is a pure function of its seed, so frame N always looks the same.

/** Sequential generator: each call returns the next float in [0, 1). Classic mulberry32. */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stateless: one deterministic float in [0, 1) for a seed. Good for per-frame values: rand(frame * 7 + 3). */
export function rand(seed: number): number {
  return mulberry32(seed)();
}

/** Stateless float in [min, max). */
export function randRange(seed: number, min: number, max: number): number {
  return min + (max - min) * rand(seed);
}

/** Stateless integer in [min, max] inclusive. */
export function randInt(seed: number, min: number, max: number): number {
  return Math.floor(randRange(seed, min, max + 1));
}

/** 32-bit FNV-1a hash of a string, for seeding from names ("rewind_after_rm_rf"). */
export function hashStringToSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Mixes two integers into one well-spread 32-bit seed (an integer finalizer, no state, no clock).
 * Use it to derive one stateless seed per (seed, index) pair: rand(mixSeed(seed, i)).
 * Plain sums like seed + i give correlated neighbours; this does not.
 */
export function mixSeed(a: number, b: number): number {
  let h = Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x7f4a7c15, 0x85ebca6b);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}
