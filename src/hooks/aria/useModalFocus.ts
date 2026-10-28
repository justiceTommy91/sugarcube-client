import { useEffect } from 'react'

const FOCUSABLE_ELEMENTS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export const useModalFocus = (open: boolean, modalRef: React.RefObject<HTMLDivElement>) => {
    useEffect(() => {
        if (open && modalRef.current) {
            const firstInteractive = modalRef.current.querySelector(FOCUSABLE_ELEMENTS)
            if (firstInteractive instanceof HTMLElement) {
                firstInteractive.focus()
            }
        }
    }, [open])
}