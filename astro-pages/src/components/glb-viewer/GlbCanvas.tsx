import React, { useEffect, useRef } from 'react'
import { createViewerScene, type ViewerScene } from './viewerScene'

type Props = {
    source: string | File | null
    className?: string
    onLoadStart?: () => void
    onProgress?: (loaded: number, total: number) => void
    onLoaded?: () => void
    onError?: (err: unknown) => void
}

export const GlbCanvas = ({ source, className, onLoadStart, onProgress, onLoaded, onError }: Props) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const viewerRef = useRef<ViewerScene | null>(null)
    const loadGenerationRef = useRef(0)
    const callbacksRef = useRef({ onLoadStart, onProgress, onLoaded, onError })
    callbacksRef.current = { onLoadStart, onProgress, onLoaded, onError }

    useEffect(() => {
        if (!canvasRef.current) {
            return undefined
        }
        const viewer = createViewerScene(canvasRef.current)
        viewerRef.current = viewer
        return () => {
            viewer.dispose()
            viewerRef.current = null
        }
    }, [])

    useEffect(() => {
        const viewer = viewerRef.current
        if (!viewer || source === null) return

        loadGenerationRef.current += 1
        const generation = loadGenerationRef.current
        callbacksRef.current.onLoadStart?.()

        viewer
            .load(source, {
                onProgress: (loaded, total) => {
                    if (loadGenerationRef.current === generation) {
                        callbacksRef.current.onProgress?.(loaded, total)
                    }
                },
            })
            .then(() => {
                if (loadGenerationRef.current === generation) {
                    callbacksRef.current.onLoaded?.()
                }
            })
            .catch((err: unknown) => {
                if (loadGenerationRef.current === generation) {
                    callbacksRef.current.onError?.(err)
                }
            })
    }, [source])

    return <canvas ref={canvasRef} className={className} />
}
