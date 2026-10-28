import { createViewerScene, type ViewerScene } from '../glb-viewer/viewerScene'
import type { WalkedFile } from './folderWalker'

const THUMBNAIL_SIZE_PX = 256

const HIDDEN_CANVAS_STYLE = [
    'position:fixed',
    'left:-9999px',
    'top:0',
    `width:${THUMBNAIL_SIZE_PX}px`,
    `height:${THUMBNAIL_SIZE_PX}px`,
    'visibility:hidden',
    'pointer-events:none',
].join(';')

export type ThumbnailQueueCallbacks = {
    onThumbnail: (entry: WalkedFile, dataUrl: string) => void
    onError: (entry: WalkedFile, err: unknown) => void
    onProgress: (done: number, total: number) => void
}

export type ThumbnailQueue = {
    process(entries: WalkedFile[], callbacks: ThumbnailQueueCallbacks): Promise<void>
    cancel(): void
    dispose(): void
}

const waitForNextFrame = (): Promise<void> =>
    new Promise((resolve) => {
        requestAnimationFrame(() => resolve())
    })

export const createThumbnailQueue = (): ThumbnailQueue => {
    const hiddenCanvas = document.createElement('canvas')
    hiddenCanvas.style.cssText = HIDDEN_CANVAS_STYLE
    document.body.appendChild(hiddenCanvas)

    let scene: ViewerScene | null = null
    let generation = 0
    let disposed = false

    const ensureScene = (): ViewerScene => {
        if (!scene) {
            scene = createViewerScene(hiddenCanvas, { preserveDrawingBuffer: true })
        }
        return scene
    }

    return {
        async process(entries, callbacks) {
            generation += 1
            const myGeneration = generation
            callbacks.onProgress(0, entries.length)

            for (let i = 0; i < entries.length; i += 1) {
                if (disposed || generation !== myGeneration) return

                const entry = entries[i]
                if (entry) {
                    const activeScene = ensureScene()
                    try {
                        // eslint-disable-next-line no-await-in-loop -- sequential thumbnail render is intentional
                        await activeScene.load(entry.file)
                        if (disposed || generation !== myGeneration) return

                        // eslint-disable-next-line no-await-in-loop -- wait for the next render frame before snapshotting
                        await waitForNextFrame()
                        if (disposed || generation !== myGeneration) return

                        const dataUrl = hiddenCanvas.toDataURL('image/png')
                        callbacks.onThumbnail(entry, dataUrl)
                    } catch (err) {
                        if (disposed || generation !== myGeneration) return
                        callbacks.onError(entry, err)
                    }
                }

                callbacks.onProgress(i + 1, entries.length)
            }
        },
        cancel() {
            generation += 1
        },
        dispose() {
            if (disposed) return
            disposed = true
            scene?.dispose()
            scene = null
            if (hiddenCanvas.parentNode) {
                hiddenCanvas.parentNode.removeChild(hiddenCanvas)
            }
        },
    }
}
