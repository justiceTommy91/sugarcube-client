import { useRef, useEffect, useState } from 'react'

export type Easing = 'easeInOut'
export type EasingFunction = (t: number) => number

const easingFunctions: Record<Easing, EasingFunction> = {
    easeInOut: (dt) => -0.5 * (Math.cos(Math.PI * dt) - 1),
}

export type UseEasingOptions = {
    target: number
    duration: number
    easing?: 'easeInOut' | EasingFunction
}

export type UseEasingResult<T> = {
    current: T
    target: T
    prev: T
    isAnimating: boolean
}

export function useEasing(options: UseEasingOptions): UseEasingResult<number>
export function useEasing<T>(options: UseEasingOptions & { transform: (value: number) => T }): UseEasingResult<T>
export function useEasing({
    target: targetValue,
    duration,
    easing = 'easeInOut',
    transform = (value: number) => value,
}: UseEasingOptions & { transform?: (value: number) => unknown }): UseEasingResult<unknown> {
    const [state, setState] = useState({ current: targetValue, prev: targetValue, isAnimating: false })

    const valueRef = useRef(targetValue)
    useEffect(() => {
        valueRef.current = state.current
    }, [state.current])

    useEffect(() => {
        const easingFn = typeof easing === 'function' ? easing : easingFunctions[easing]

        // Start the animation from whatever value we're currently at in case the target changes
        // mid-animation so we don't jump around.
        const startValue = valueRef.current
        setState((prevState) => ({ ...prevState, prev: startValue, isAnimating: true }))
        const valueDiff = targetValue - startValue
        let startTime: number
        const step = (currentTime: number): void => {
            const elapsedTime = currentTime - startTime
            if (elapsedTime >= duration) {
                setState((prevState) => ({ ...prevState, current: targetValue, isAnimating: false }))
                return
            }
            const animationProgress = easingFn(elapsedTime / duration)
            setState((prevState) => ({ ...prevState, current: startValue + animationProgress * valueDiff }))
            requestAnimationFrame(step)
        }
        const handle = requestAnimationFrame((currentTime) => {
            startTime = currentTime
            step(currentTime)
        })

        return () => {
            cancelAnimationFrame(handle)
        }
    }, [targetValue, duration, easing])

    const { current, prev, isAnimating } = state
    return {
        current: transform(current),
        target: transform(targetValue),
        prev: transform(prev),
        isAnimating,
    }
}
