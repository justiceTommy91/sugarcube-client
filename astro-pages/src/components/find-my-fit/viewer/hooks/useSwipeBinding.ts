/* eslint-disable i18next/no-literal-string */
import { useEffect } from 'react'
import { SwipeControl } from '../SwipeControl'
import type { SwipeConfig } from '../SwipeControl'
import type { DragAxis } from '../DragMonitor'

export type SwipeHandlers = {
    onHorizontalChange: (normalized: number) => void
    onHorizontalSwipe: (direction: -1 | 0 | 1) => void
    onVerticalChange: (normalized: number) => void
    onVerticalSwipe: (direction: -1 | 0 | 1) => void
}

export function useSwipeBinding(
    swipeAreaRef: React.RefObject<HTMLDivElement>,
    isViewing: boolean,
    handlers: SwipeHandlers,
    swipeConfig?: SwipeConfig,
) {
    useEffect(() => {
        if (!isViewing) return undefined
        const el = swipeAreaRef.current
        if (!el) return undefined

        const swipe = new SwipeControl(
            el,
            {
                onChange: (normalized: number, axis: DragAxis) => {
                    if (axis === 'x') {
                        handlers.onHorizontalChange(normalized)
                    } else {
                        handlers.onVerticalChange(normalized)
                    }
                },
                onSwipe: (direction: -1 | 0 | 1, axis: DragAxis) => {
                    if (axis === 'x') {
                        handlers.onHorizontalSwipe(direction)
                    } else {
                        handlers.onVerticalSwipe(direction)
                    }
                },
            },
            swipeConfig,
        )

        return () => swipe.destroy()
    }, [isViewing, handlers, swipeAreaRef, swipeConfig])
}
