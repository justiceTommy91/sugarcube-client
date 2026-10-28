export type AsyncResult<T> =
    | {
          status: 'idle'
          result: null
          error: null
      }
    | {
          status: 'loading'
          result: null
          error: null
      }
    | {
          status: 'success'
          result: T
          error: null
      }
    | {
          status: 'error'
          result: null
          error: Error
      }

export const idle = Symbol('idle')
export type Idle = typeof idle

export type AsyncParams<T> = T | Idle

export class TimeoutError extends Error {
    constructor(timeout: number) {
        super(`timeout of ${timeout}ms exceeded`)
    }
}

export const withTimeout = <T>(promise: Promise<T>, timeout: number): Promise<T> => {
    let timerHandle: number
    return Promise.race<T>([
        promise,
        new Promise((_, reject) => {
            timerHandle = window.setTimeout(() => reject(new TimeoutError(timeout)), timeout)
        }),
    ]).finally(() => clearTimeout(timerHandle))
}

/**
 * Add jitter to polling delay to prevent thundering herd
 * Adds ±10% randomization to the delay
 *
 * Example: 5000ms → 4500-5500ms range
 */
export function addJitter(delay: number): number {
    const jitterAmount = delay * 0.1 // 10% of the delay
    return delay - jitterAmount + Math.random() * (jitterAmount * 2)
}
