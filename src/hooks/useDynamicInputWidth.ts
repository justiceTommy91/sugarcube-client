import { useState, useEffect, useRef } from 'react'

interface UseDynamicInputWidthOptions {
    minWidth?: number
    maxWidth?: number
    padding?: number
}
/**
 * A custom hook that dynamically calculates input width based on its text content.
 * Uses canvas to measure text width and adjusts the input field accordingly.\
 * NOTE: in the future this can be replaced with the css field-sizing when browser support improves
 *
 * @param value - The current value of the input field
 * @param inputRef - React ref to the input element
 * @param options - Configuration options
 * @param options.minWidth - Minimum width in pixels (default: 10)
 * @param options.maxWidth - Maximum width in pixels (default: 275)
 * @param options.padding - Additional padding in pixels (default: 30), if too low the text will shift left and right while resizing
 *
 * @returns number - The calculated width in pixels
 *
 * @example
 * ```jsx
 * const ExampleComponent = () => {
 *   const inputRef = useRef(null);
 *   const [value, setValue] = useState('');
 *   const width = useDynamicInputWidth(value, inputRef, {
 *     minWidth: 100,
 *     maxWidth: 300
 *   });
 *
 *   return (
 *     <input
 *       ref={inputRef}
 *       value={value}
 *       onChange={(e) => setValue(e.target.value)}
 *       style={{ width: `${width}px` }}
 *     />
 *   );
 * };
 * ```
 */
export const useDynamicInputWidth = (
    value: string,
    inputRef: React.RefObject<HTMLInputElement>,
    options: UseDynamicInputWidthOptions = {},
) => {
    const { minWidth = 10, maxWidth = 275, padding = 30 } = options

    const [width, setWidth] = useState(minWidth)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas')
        }

        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        // Ensure minWidth is not greater than maxWidth
        const min = Math.min(minWidth, maxWidth)
        const max = Math.max(minWidth, maxWidth)

        if (context && inputRef.current) {
            const computedStyles = window.getComputedStyle(inputRef.current)
            context.font = `${computedStyles.fontWeight} ${computedStyles.fontSize} ${computedStyles.fontFamily}`

            const metrics = context.measureText(value)
            const textWidth = metrics.width

            const newWidth = Math.min(Math.max(textWidth + padding, min), max)
            setWidth(newWidth)
        }
    }, [value, minWidth, maxWidth, padding, inputRef])

    return width
}
