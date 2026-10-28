// Generic utility functions
/* eslint-disable no-bitwise */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
function assert(condition: unknown, msg?: string): asserts condition {
    if (condition === false) throw new Error(msg)
}

export const zip = <S, T>(a: Array<S>, b: Array<T>): Array<[S, T]> => 
    Array.from(Array(Math.max(b.length, a.length)), (_, i) => [a[i], b[i]]);

export const partition = <T>(arr: Array<T>, n: number): Array<Array<T>> => {
    const result = []
    if (n > 0) {
        for (let i = 0; i < arr.length; i += n) {
            result.push(arr.slice(i, i + n))
        }
    }
    return result
}

// Simple seeded pseudo random generator.
export function mulberry32(a: number) {
  return () => {
    let t = a += 0x6D2B79F5 // eslint-disable-line no-multi-assign, no-param-reassign
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
