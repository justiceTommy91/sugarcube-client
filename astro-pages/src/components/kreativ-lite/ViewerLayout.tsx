import React, { useEffect, useRef, useState } from 'react'
import { ItemActionBar } from './ItemActionBar'
import './ViewerLayout.scss'

const MIN_AR = 3 / 4 // tallest (portrait 3:4)
const MAX_AR = 4 / 3 // shortest (landscape 4:3)
const MAX_HEIGHT_FRACTION = 0.7 // outer area may never exceed 70% of viewport height

interface ViewerLayoutProps {
    sceneAR: number | null
    magicEraserMode: boolean
    children: React.ReactNode
    /** Called whenever the computed canvas-area height changes (px). */
    onCanvasHeightChange?: (height: number) => void
}

interface LayoutDimensions {
    outerHeight: number
    canvasWidth: number
    canvasHeight: number
}

function computeDimensions(
    containerWidth: number,
    viewportHeight: number,
    nativeAR: number,
    clampedAR: number,
): LayoutDimensions {
    const maxHeight = Math.floor(viewportHeight * MAX_HEIGHT_FRACTION)
    // Outer box is constrained by both the clamped AR and the max-height cap.
    const outerHeight = Math.round(Math.min(containerWidth / clampedAR, maxHeight))
    // Effective outer AR (may differ from clampedAR when height cap kicks in).
    const outerBoxAR = containerWidth / outerHeight
    let canvasWidth: number
    let canvasHeight: number
    if (nativeAR >= outerBoxAR) {
        // scene wider than outer box → fill width, grey bars top/bottom (letterbox)
        canvasWidth = containerWidth
        canvasHeight = Math.round(containerWidth / nativeAR)
    } else {
        // scene taller than outer box → fill height, grey bars left/right (pillarbox)
        canvasHeight = outerHeight
        canvasWidth = Math.round(outerHeight * nativeAR)
    }
    return { outerHeight, canvasWidth, canvasHeight }
}

export const ViewerLayout = ({ sceneAR, magicEraserMode, children, onCanvasHeightChange }: ViewerLayoutProps) => {
    const clampedAR = sceneAR !== null ? Math.min(MAX_AR, Math.max(MIN_AR, sceneAR)) : MAX_AR
    const nativeAR = sceneAR ?? clampedAR

    // Initialise from window width so there's no blank frame on first paint.
    const [dimensions, setDimensions] = useState<LayoutDimensions | null>(() => {
        if (typeof window === 'undefined') return null
        return computeDimensions(window.innerWidth, window.innerHeight, nativeAR, clampedAR)
    })

    const rootRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const el = rootRef.current
        if (!el) return undefined
        const update = () => {
            const w = Math.round(el.getBoundingClientRect().width)
            if (!w) return
            const next = computeDimensions(w, window.innerHeight, nativeAR, clampedAR)
            setDimensions(next)
        }
        update()
        const ro = new ResizeObserver(update)
        ro.observe(el)
        return () => ro.disconnect()
    }, [nativeAR, clampedAR])

    // Notify parent when the outer canvas-area height changes.
    const prevOuterHeightRef = useRef<number | null>(null)
    useEffect(() => {
        if (dimensions && dimensions.outerHeight !== prevOuterHeightRef.current) {
            prevOuterHeightRef.current = dimensions.outerHeight
            onCanvasHeightChange?.(dimensions.outerHeight)
        }
    }, [dimensions, onCanvasHeightChange])

    return (
        <div ref={rootRef} className="ViewerLayout">
            {dimensions && (
                <div className="ViewerLayout__canvas" style={{ height: dimensions.outerHeight }}>
                    <div
                        className="ViewerLayout__canvas-native"
                        style={{ width: dimensions.canvasWidth, height: dimensions.canvasHeight }}
                    >
                        {children}
                    </div>
                    <ItemActionBar magicEraserMode={magicEraserMode} />
                </div>
            )}
        </div>
    )
}
