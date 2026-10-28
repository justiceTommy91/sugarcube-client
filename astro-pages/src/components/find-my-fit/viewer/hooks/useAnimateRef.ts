import { useCallback, useRef } from 'react'
import type { AnimParams, EasingFn } from '../types'
import { DEFAULT_ANIM_PARAMS } from '../types'
import { easeOutQuint } from '../carouselMath'

// Drives a mutable ref from its current value to a target using an easing function,
// calling callUpdateItems each frame.
export function useAnimateRef(
    callUpdateItems: () => void,
    animParams: AnimParams | undefined,
    easingFn: EasingFn | undefined,
) {
    const animationRef = useRef<number | null>(null)
    const animParamsRef = useRef(animParams ?? DEFAULT_ANIM_PARAMS)
    const easingFnRef = useRef(easingFn ?? easeOutQuint)
    const callUpdateItemsRef = useRef(callUpdateItems)

    animParamsRef.current = animParams ?? DEFAULT_ANIM_PARAMS
    easingFnRef.current = easingFn ?? easeOutQuint
    callUpdateItemsRef.current = callUpdateItems

    const cancelAnimation = useCallback(() => {
        if (animationRef.current !== null) {
            cancelAnimationFrame(animationRef.current)
            animationRef.current = null
        }
    }, [])

    const animateRef = useCallback(
        (ref: React.MutableRefObject<number>, target: number, onDone?: () => void) => {
            cancelAnimation()

            const startValue = ref.current
            const startTime = performance.now()

            const step = (now: number) => {
                const elapsed = now - startTime
                const duration = animParamsRef.current.animDuration
                const progress = Math.min(1, elapsed / duration)
                const eased = easingFnRef.current(progress)
                ref.current = startValue + (target - startValue) * eased // eslint-disable-line no-param-reassign

                callUpdateItemsRef.current()

                if (progress < 1) {
                    animationRef.current = requestAnimationFrame(step)
                } else {
                    animationRef.current = null
                    ref.current = target // eslint-disable-line no-param-reassign
                    callUpdateItemsRef.current()
                    onDone?.()
                }
            }

            animationRef.current = requestAnimationFrame(step)
        },
        [cancelAnimation],
    )

    return {
        animateRef,
        cancelAnimation,
        get isAnimating() {
            return animationRef.current !== null
        },
        animationRef,
    }
}
