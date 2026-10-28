import { GeomViewer } from 'Renderer/geomviewer'

let trackingActive = false
let intervalBinding = null
let heapMemTracking = null
const snapshotEvent = new Event('memorySnapshot')

function takeMemorySnapshot() {
    snapshotEvent.memorySnapshot = {
        ...(heapMemTracking
            ? {
                  jsHeapSizeLimit: performance.memory.jsHeapSizeLimit / 1024 / 1024,
                  totalJSHeapSize: performance.memory.totalJSHeapSize / 1024 / 1024,
                  usedJSHeapSize: performance.memory.usedJSHeapSize / 1024 / 1024,
              }
            : {}),
    }
    const gpuMemoryUsage = GeomViewer.bindings?.queryGpuMemoryUsage()
    if (gpuMemoryUsage) {
        snapshotEvent.memorySnapshot.textureMemory = gpuMemoryUsage.currentTextureMemory / 1024 / 1024
        snapshotEvent.memorySnapshot.bufferMemory = gpuMemoryUsage.currentBufferMemory / 1024
    }
    document.dispatchEvent(snapshotEvent)
}

export function toggleMemoryTracking(onoroff) {
    // Stop current memory tracking if any
    trackingActive = onoroff
    if (intervalBinding) {
        clearInterval(intervalBinding)
        intervalBinding = null
    }
    if (!onoroff) {
        return
    }

    // Check the memory tracking support
    heapMemTracking = performance.memory
    if (!heapMemTracking) {
        // eslint-disable-next-line no-console
        console.warn('Memory tracking is not supported by this browser/device combination.')
        return
    }
    if (!heapMemTracking) {
        // eslint-disable-next-line no-console
        console.warn(`${heapMemTracking ? 'WebGL' : 'Heap'} memory tracking is not supported by this browser/device.`)
    }

    // Clear the earlier binding if any
    if (intervalBinding) {
        clearInterval(intervalBinding)
    }

    // Start the interval
    intervalBinding = setInterval(takeMemorySnapshot, 500)
    takeMemorySnapshot()
}

export function isMemoryTrackingActive() {
    return trackingActive
}
