import { EPSILON } from "Renderer/geometry/config"

export const isClosetToZero = (x: number) => Math.abs(x) < EPSILON

export const coerceIfCloseToZero = (x: number) => isClosetToZero(x) ? 0 : x

export function easeInQuad(t: number): number {
  return t * t;
}

export function easeInCubic(t: number): number {
  return t * t * t
}

export function easeInExpo(t: number): number {
  return t === 0 ? 0 : 2 ** (10 * t - 10)
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - 2 ** (-10 * t)
}

export function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2;
}

export function easeInOutExpo(x: number): number {
  if (x === 0) {
      return 0
  }
  if (x === 1) {
      return 1
  }
  if (x < 0.5) {
      return 2 ** (20 * x - 10) / 2
  }
  return (2 - 2 ** (-20 * x + 10)) / 2
}

export function easeOutQuint(t: number): number {
  return 1 - (1 - t) ** 5
}

export function linear(t: number): number {
  return t
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/** Perlin smootherstep */
export function smootherstep(x: number, min: number, max: number): number {
  const t = Math.max(0, Math.min(1, (x - min) / (max - min)))
  return t * t * t * (t * (t * 6 - 15) + 10)
}
