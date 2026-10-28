import { AsyncGPUDetector } from "./AsyncGPUDetector"
import { GPUDetector, GPUStats } from "./GPUDetector"

const GPU_STORAGE_KEY = 'gpu-stats-v1'

/**
 * Cached implementation of GPUDetector using localStorage.
 */
export class CachedGPUDetector implements GPUDetector {
  private inner: GPUDetector

  constructor(inner: GPUDetector = new AsyncGPUDetector()) {
    this.inner = inner
  }

  async fetchGPUStats(benchmarksURL?: string): Promise<GPUStats> {
    // Try to read from localStorage
    const cachedRaw = localStorage.getItem(GPU_STORAGE_KEY)

    if (cachedRaw) {
      try {
        const parsed: GPUStats = JSON.parse(cachedRaw)

        // validate parsed structure
        if (
          typeof parsed.tier === 'number' &&
          typeof parsed.isMobile === 'boolean' &&
          typeof parsed.gpu === 'string' &&
          typeof parsed.elapsedTime === 'number' &&
          typeof parsed.cached === 'boolean' &&
          typeof parsed.type === 'string' &&
          typeof parsed.fps === 'number'
        ) {
          return { ...parsed, cached: true }
        }
      } catch {
        // Fallback to fresh detection
      }
    }

    // Fetch fresh stats and cache them
    const fresh = await this.inner.fetchGPUStats(benchmarksURL)
    localStorage.setItem(GPU_STORAGE_KEY, JSON.stringify(fresh))
    return fresh
  }
}
