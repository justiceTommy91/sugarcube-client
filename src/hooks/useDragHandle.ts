import { useEffect, useRef } from 'react'

export const useDragHandle = (
    handleRef: React.RefObject<HTMLElement>,
    parentRef: React.RefObject<HTMLElement>,
) => {
    const position = useRef({ x: 0, y: 0 })

    useEffect(() => {
        const handle = handleRef.current
        const parent = parentRef.current

        if (!handle || !parent) return undefined

        const onMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - position.current.x
            const dy = e.clientY - position.current.y

            const {
                offsetLeft,
                offsetTop,
                offsetWidth,
                offsetHeight,
            } = parent

            const {
                clientWidth,
                clientHeight,
            } = window.document.documentElement

            const nextRight = clientWidth - offsetLeft - offsetWidth - dx
            const nextBottom = clientHeight - offsetTop - offsetHeight - dy

            parent.style.right = `${nextRight}px`
            parent.style.bottom = `${nextBottom}px`

            position.current = { x: e.clientX, y: e.clientY }
        }

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove, true)
            window.removeEventListener('mouseup', onMouseUp, true)
        }

        const onMouseDown = (e: MouseEvent) => {
            e.preventDefault()
            position.current = { x: e.clientX, y: e.clientY }
            window.addEventListener('mousemove', onMouseMove, true)
            window.addEventListener('mouseup', onMouseUp, true)
        }

        handle.addEventListener('mousedown', onMouseDown, true)

        return () => {
            handle.removeEventListener('mousedown', onMouseDown, true)
            window.removeEventListener('mousemove', onMouseMove, true)
            window.removeEventListener('mouseup', onMouseUp, true)
        }
    }, [handleRef, parentRef])
}
