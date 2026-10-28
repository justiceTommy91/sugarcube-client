import { GPUDetector, GPUStats } from './GPUDetector'

/**
 * Concrete implementation of GPUDetector using `detect-gpu` with dynamic import.
 */
export class AsyncGPUDetector implements GPUDetector {
  // eslint-disable-next-line class-methods-use-this
  async fetchGPUStats(benchmarksURL?: string): Promise<GPUStats> {
    const start = performance.now()

    // eslint-disable-next-line import/no-extraneous-dependencies
    const { getGPUTier } = await import('detect-gpu')

    const gpuTier = await getGPUTier({ 
      benchmarksURL,
      desktopTiers: [0, 15, 30, 60, 120, 240],
      mobileTiers: [0, 15, 30, 60, 120, 240]
    })

    const end = performance.now()

    return {
      tier: gpuTier.tier,
      isMobile: gpuTier.isMobile,
      gpu: gpuTier.gpu,
      elapsedTime: end - start,
      cached: false,
      type: gpuTier.type,
      fps: gpuTier.fps
    }
  }
}
