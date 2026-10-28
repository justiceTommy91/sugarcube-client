import { useEffect, useRef } from 'react'

/**
 * Document-level pointer-drag handler that coalesces pointermove events via
 * requestAnimationFrame. `isActive` is polled on each event so the caller
 * controls when a drag starts/ends by mutating its own ref.
 */
export function useRafPointerDrag(
    isActive: () => boolean,
    onFrame: (ev: PointerEvent) => void,
    onEnd: () => void,
): void {
    const cbRef = useRef({ isActive, onFrame, onEnd })
    cbRef.current = { isActive, onFrame, onEnd }

    useEffect(() => {
        let rafId: number | null = null
        let pending: PointerEvent | null = null

        const onMove = (e: PointerEvent) => {
            if (!cbRef.current.isActive()) return
            pending = e
            if (rafId !== null) return
            rafId = requestAnimationFrame(() => {
                const ev = pending
                pending = null
                rafId = null
                if (!ev || !cbRef.current.isActive()) return
                cbRef.current.onFrame(ev)
            })
        }

        const onUp = () => {
            if (!cbRef.current.isActive()) return
            if (rafId !== null) {
                cancelAnimationFrame(rafId)
                rafId = null
            }
            pending = null
            cbRef.current.onEnd()
        }

        document.addEventListener('pointermove', onMove)
        document.addEventListener('pointerup', onUp)
        document.addEventListener('pointercancel', onUp)
        return () => {
            document.removeEventListener('pointermove', onMove)
            document.removeEventListener('pointerup', onUp)
            document.removeEventListener('pointercancel', onUp)
            if (rafId !== null) cancelAnimationFrame(rafId)
        }
    }, [])
}
