import { DragMonitor, type DragAxis } from './DragMonitor'

export type SwipeCallbacks = {
    onChange?: (normalized: number, axis: DragAxis) => void
    onSwipe?: (direction: -1 | 0 | 1, axis: DragAxis) => void
}

export type SwipeConfig = {
    threshold?: number
    velocityThreshold?: number
}

export class SwipeControl {
    private dragMonitor: DragMonitor

    constructor(element: HTMLElement, callbacks: SwipeCallbacks, config?: SwipeConfig) {
        const threshold = config?.threshold ?? 0.3
        const velocityThreshold = config?.velocityThreshold ?? 0.5

        // Progress is negated so drag-left maps to positive (next) and drag-up maps to positive (next variant).
        this.dragMonitor = new DragMonitor(element, {
            onDrag(progress, _delta, _velocityNorm, axis) {
                const clamped = Math.max(-1, Math.min(1, -progress))
                callbacks.onChange?.(clamped, axis)
            },

            onDragEnd(progress, _delta, velocityNorm, axis) {
                const p = -progress
                let direction: -1 | 0 | 1 = 0

                if (Math.abs(p) > threshold || Math.abs(velocityNorm) > velocityThreshold) {
                    direction = p > 0 ? 1 : -1
                }

                // Only reset visual for cancelled swipes; committed swipes animate from
                // the current drag position via onSwipe.
                if (direction === 0) {
                    callbacks.onChange?.(0, axis)
                }
                callbacks.onSwipe?.(direction, axis)
            },
        })
    }

    destroy(): void {
        this.dragMonitor.destroy()
    }
}
