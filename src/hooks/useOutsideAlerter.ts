import { useEffect, useRef } from 'react'

export type UseOutsideAlerterProps<E extends HTMLElement = HTMLElement> = {
    /** The ref of the element to monitor for outside clicks */
    ref: React.RefObject<E>
    /** Callback function to call when a click outside the element is detected or ESC is pressed */
    onClickOutside: () => void
    /** Optional array of refs to exclude from the outside click detection */
    excludeRefs?: React.RefObject<HTMLElement>[]
    /** Enable ESC key to trigger onClickOutside callback */
    enableEscapeKey?: boolean
}

/**
 * Hook that alerts clicks outside of the passed ref and optionally ESC key presses
 */
export const useOutsideAlerter = <E extends HTMLElement = HTMLElement>({
    ref,
    onClickOutside,
    excludeRefs,
    enableEscapeKey = false,
}: UseOutsideAlerterProps<E>) => {

    // Store latest callback and excludeRefs to avoid effect re-runs
    // (the array itself is recreated on every render even if contents are the same)
    const currentExcludeRefs = useRef(excludeRefs)
    const onClickOutsideRef = useRef(onClickOutside)

    onClickOutsideRef.current = onClickOutside
    currentExcludeRefs.current = excludeRefs

    useEffect(() => {
        /**
         * If clicked on outside of element, call onClickOutside if it exists
         */
        const handleClickOutside = (event: MouseEvent) => {
            if (!ref.current || !onClickOutsideRef.current) {
                return
            }

            const target = event.target as HTMLElement

            if (ref.current.contains(target)) {
                return
            }

            const excludeMatch = currentExcludeRefs.current?.some((excludeRef) => excludeRef.current?.contains(target))

            if (excludeMatch) {
                return
            }

            onClickOutsideRef.current()
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (!enableEscapeKey || !onClickOutsideRef.current) {
                return
            }

            if (event.key === 'Escape') {
                onClickOutsideRef.current()
            }
        }

        // Bind the event listeners
        // Use capture phase so the handler fires before stopPropagation on child elements (e.g. the 3D canvas) can block it
        document.addEventListener('mousedown', handleClickOutside, { capture: true })

        if (enableEscapeKey) {
            document.addEventListener('keydown', handleKeyDown)
        }

        return () => {
            // Unbind the event listeners on clean up
            document.removeEventListener('mousedown', handleClickOutside, { capture: true })
            if (enableEscapeKey) {
                document.removeEventListener('keydown', handleKeyDown)
            }
        }
    }, [ref, enableEscapeKey]) // Only depend on stable values - onClickOutside/excludeRefs accessed via refs
}
