export type DragAxis = 'x' | 'y'

export type DragCallbacks = {
    onDragStart?: () => void
    onDrag?: (progress: number, delta: number, velocityNorm: number, axis: DragAxis) => void
    onDragEnd?: (progress: number, delta: number, velocityNorm: number, axis: DragAxis) => void
}

const LOCK_THRESHOLD = 8

export class DragMonitor {
    private element: HTMLElement

    private callbacks: DragCallbacks

    private startX = 0

    private startY = 0

    private lastX = 0

    private lastY = 0

    private lastTime = 0

    private velocityX = 0

    private velocityY = 0

    private dragging = false

    private lockedAxis: DragAxis | null = null

    private onPointerDown: (e: PointerEvent) => void

    private onPointerMove: (e: PointerEvent) => void

    private onPointerUp: (e: PointerEvent) => void

    constructor(element: HTMLElement, callbacks: DragCallbacks) {
        this.element = element
        this.callbacks = callbacks

        this.onPointerDown = (e: PointerEvent) => {
            this.dragging = true
            this.startX = e.clientX
            this.startY = e.clientY
            this.lastX = e.clientX
            this.lastY = e.clientY
            this.lastTime = performance.now()
            this.velocityX = 0
            this.velocityY = 0
            this.lockedAxis = null
            this.element.setPointerCapture(e.pointerId)
            this.callbacks.onDragStart?.()
        }

        this.onPointerMove = (e: PointerEvent) => {
            if (!this.dragging) return

            const now = performance.now()
            const dt = now - this.lastTime
            const dx = e.clientX - this.lastX
            const dy = e.clientY - this.lastY

            if (dt > 0) {
                this.velocityX = dx / dt
                this.velocityY = dy / dt
            }

            this.lastX = e.clientX
            this.lastY = e.clientY
            this.lastTime = now

            if (this.lockedAxis === null) {
                const totalDeltaX = Math.abs(e.clientX - this.startX)
                const totalDeltaY = Math.abs(e.clientY - this.startY)
                if (totalDeltaX + totalDeltaY >= LOCK_THRESHOLD) {
                    this.lockedAxis = totalDeltaX >= totalDeltaY ? `x` : `y`
                } else {
                    return
                }
            }

            if (this.lockedAxis === `x`) {
                const deltaX = e.clientX - this.startX
                const width = this.element.offsetWidth || 1
                const progress = deltaX / width
                const velocityNorm = (this.velocityX * 1000) / width
                this.callbacks.onDrag?.(progress, deltaX, velocityNorm, `x`)
            } else {
                const deltaY = e.clientY - this.startY
                const height = this.element.offsetHeight || 1
                const progress = deltaY / height
                const velocityNorm = (this.velocityY * 1000) / height
                this.callbacks.onDrag?.(progress, deltaY, velocityNorm, `y`)
            }
        }

        this.onPointerUp = (e: PointerEvent) => {
            if (!this.dragging) return
            this.dragging = false

            if (this.lockedAxis === null) {
                this.callbacks.onDragEnd?.(0, 0, 0, `x`)
                return
            }

            if (this.lockedAxis === `x`) {
                const deltaX = e.clientX - this.startX
                const width = this.element.offsetWidth || 1
                const progress = deltaX / width
                const velocityNorm = (this.velocityX * 1000) / width
                this.callbacks.onDragEnd?.(progress, deltaX, velocityNorm, `x`)
            } else {
                const deltaY = e.clientY - this.startY
                const height = this.element.offsetHeight || 1
                const progress = deltaY / height
                const velocityNorm = (this.velocityY * 1000) / height
                this.callbacks.onDragEnd?.(progress, deltaY, velocityNorm, `y`)
            }
        }

        this.element.addEventListener(`pointerdown`, this.onPointerDown)
        this.element.addEventListener(`pointermove`, this.onPointerMove)
        this.element.addEventListener(`pointerup`, this.onPointerUp)
        this.element.addEventListener(`pointercancel`, this.onPointerUp)
    }

    destroy(): void {
        this.element.removeEventListener(`pointerdown`, this.onPointerDown)
        this.element.removeEventListener(`pointermove`, this.onPointerMove)
        this.element.removeEventListener(`pointerup`, this.onPointerUp)
        this.element.removeEventListener(`pointercancel`, this.onPointerUp)
    }
}
