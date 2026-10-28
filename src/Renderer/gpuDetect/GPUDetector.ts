/**
 * GPU statistics describing the detected hardware and performance tier.
 */
export type GPUStats = {
  /**
   * GPU Tier from 0 (lowest) to 5 (highest).
   */
  tier: number

  /**
   * Whether the device is identified as mobile.
   */
  isMobile: boolean | undefined

  /**
   * GPU vendor and model string (e.g., "NVIDIA GeForce RTX 3080").
   */
  gpu: string | undefined

  /**
   * Time in milliseconds it took to determine GPU stats.
   */
  elapsedTime: number

  /**
   * Indicates if the stats were retrieved from local cache.
   */
  cached: boolean

  /**
   * Describes the detection type/source.
   * eg. "BENCHMARK" or "FALLBACK"
   */
  type: string

  /**
   * Estimated fps for user's screensize and gpu.
   */
  fps: number | undefined
}

/**
 * Interface for a GPU detection utility.
 */
export interface GPUDetector {
  /**
   * Asynchronously fetches GPU statistics.
   * @returns A promise that resolves to GPUStats.
   */
  fetchGPUStats: (benchmarksURL?: string) => Promise<GPUStats>
}
