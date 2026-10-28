/**
 * Types used when querying metrics and statistics from the viewer.
 */

/**
 * GPU memory usage. (Duplicated in performance stats below.)
 */
export type GpuMemoryStats = {
  currentTextureMemory: number
  currentBufferMemory: number
}

export type GpuFrameStats = {
  totalSceneTriangles: number // Total number of triangles in the scene.
  totalCompiledShaders: number // Total number of compiled shaders in the scene.
  glTextureMemory: number // GPU texture memory usage in bytes.
  glBufferMemory: number // GPU buffer memory usage in bytes.
}

/**
 * CPU and GPU stats.
 */
export type PerformanceStats =
  | {
      gpuFrameStats: GpuFrameStats
      totalLoadedItems: number // Number of furniture items loaded.
      totalLoadedSize: number // Total byte size of all loaded furniture items.
      totalFrames: number // Total number of frames drawn so far.

      jsHeapSizeLimit?: number // Max heap size in bytes.
      totalJSHeapSize?: number // Allocated heap size in bytes.
      usedJSHeapSize?: number // Current active segments of heap in bytes.
    }
  | {
      // Frame metrics both in steady state and while loading furniture items.
      // The key is the bin name, e.g. 'frame 0-15 ms' or 'loading frame 0-15 ms',
      // while the value is the count of frames in that bin.
      [key: string]: number
    }

/**
 * Download stats for the room background data and furniture items.
 */
export type RoomDownloadStats = {
  // Total number of furniture items currently loaded.
  modelsCount: number
  // Total download size of all furniture items currently in the scene in MBytes.
  totalModelsLoadSizeMB: number
  // Total download size of mask and texture data in MBytes.
  sceneAdditionalDataSizeMB: number
}

/**
 * Time spent on various scene loading stages.
 */
export type SceneLoadingStats = {
  // Covers an interval between renderer initialization and rendering the first frame.
  msBuildScene: number
  // CPU time spent on rendering the first frame of the scene.
  msRenderFirstFrame: number
  // Total CPU time spent on rendering.
  msTotalRenderingTime: number
  // Time spent on parsing and decompressing the data of all the furniture items.
  // Note that this value represents wall clock time of mesh decompression.
  msParseFurnitureData: number
  // Total CPU time spent uploading furniture textures to the GPU.
  msUploadFurnitureTextures: number
  // Time spent updating React render items.
  msUpdateRenderItemsReact: number
}

/**
 * Stats associated with each scene item in the room.
 */
export type SceneItemMetrics = {
  // Same ID as the item these metrics are associated with.
  id: string
  // Start/end time in ms for loading and decompressing the item data.
  msStartLoad: number
  msEndLoad: number
  // Time elapsed in seconds between msStartLoad and msEndLoad.
  sLoadTime: number
  // Time in ms when the item is fully configured in the scene.
  msEndFlush: number
  // Time elapsed in seconds between msEndLoad and msEndFlush.
  sFlushTime: number
  // Time elapsed between msStartLoad and msEndFlush.
  sTotalTime: number
  // Time it took to download the item's data from the server.
  sFileDownloadTime: number
  // Timestamp in ms when the item's data has been downloaded and the parsing starts.
  msStartParsing: number
  // Time it took to load and setup all the textures associated with the item.
  msBasisUniversalTextureTranscodingTime: number
  // Time in ms it took to decompressed the geometry.
  msDracoDecompress: number
  // Time in ms it took to process react updates for this item.
  msReactUpdateTime: number
  // Item download size in bytes.
  LoadSize: number
  // Type of compression for item's mesh data.
  MeshCompression: 'draco' | 'none'
  // Type of compression used the texture data.
  TextureCompression: 'basisU' | 'none'
  // Size in MBytes of the item's data, not including the textures.
  MbFileSizeTransferred: number
  // Whether the item's initial position is within the room's bounds.
  isInitPosInRoomBounds: boolean
  // Loading error message, if any.
  errorMessage?: string
}
