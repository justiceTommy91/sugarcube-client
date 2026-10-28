import React, { useRef, useEffect, useCallback } from 'react'
import Modal from '@ingka/modal'
import { AccessibleModalProps, defaultAccessibleModalProps } from './AccessibleModal.types'
import { useModalFocus, useFocusTrap, focusElement } from '../../hooks/focus'

// Global stack to track modal order for proper Escape key handling
const modalStack: string[] = []

/**
 * AccessibleModal - A wrapper around @ingka/modal with proper focus management
 *
 * This component provides:
 * - Automatic focus capture and restoration (WCAG 2.4.3)
 * - Focus trapping within modal boundaries
 * - Proper ARIA attributes
 * - Keyboard navigation support (Tab, Shift+Tab, Escape)
 * - Screen reader compatibility
 *
 * Focus Management Pattern:
 * - Use native HTML `autoFocus` attribute on elements that should receive initial focus
 * - The `restoreFocusTo` prop specifies which element receives focus when the modal closes
 * - Focus restoration only happens when the modal is dismissed (Cancel/Escape)
 * - Parent components handle post-action focus through callbacks
 *
 * Escape Key Handling:
 * - Uses a global stack to track which modal is topmost
 * - Only the topmost modal handles the Escape key
 * - Prevents event bubbling to avoid multiple modals closing
 *
 * @param props - AccessibleModalProps
 * @returns JSX.Element
 */
const AccessibleModal: React.FC<AccessibleModalProps> = ({
    isOpen,
    onClose,
    children,
    restoreFocusTo,
    initialFocusSelector,
    className,
    escapable = true,
    ariaLabel,
    ariaDescribedBy,
    wrapContent = true,
    ...otherProps
}) => {
    const modalRef = useRef<HTMLDivElement>(null)
    const modalIdRef = useRef<string>(`modal-${ariaLabel}-${Date.now()}`)
    const isNestedModalRef = useRef<boolean>(false)

    // Manage modal stack
    useEffect(() => {
        if (isOpen) {
            // Check for existing modals when this modal opens
            const existingModals = document.querySelectorAll('[aria-modal="true"]')
            isNestedModalRef.current = existingModals.length > 0

            // Add to stack
            modalStack.push(modalIdRef.current)

            return () => {
                // Remove from stack when modal closes
                const index = modalStack.indexOf(modalIdRef.current)
                if (index > -1) {
                    modalStack.splice(index, 1)
                }
            }
        }
        return undefined
    }, [isOpen])

    // Only use automatic focus capture if we don't have a specific restore target
    const shouldUseAutoFocus = !restoreFocusTo
    useModalFocus(isOpen && shouldUseAutoFocus, false)

    // Enable focus trapping when modal is open
    useFocusTrap(modalRef, isOpen)

    // Handle focus restoration when modal closes
    useEffect(() => {
        if (!isOpen) return undefined

        return () => {
            // Restore focus when modal is closing
            if (restoreFocusTo && document.contains(restoreFocusTo)) {
                // Use setTimeout to ensure DOM has updated after modal closes
                setTimeout(() => {
                    if (document.contains(restoreFocusTo)) {
                        focusElement(restoreFocusTo, { preventScroll: true })
                    }
                }, 0)
            }
        }
    }, [isOpen, restoreFocusTo, ariaLabel])

    // Handle Escape key
    useEffect(() => {
        if (!isOpen || !escapable) return undefined

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                // Only handle escape if this is the topmost modal in our stack
                if (modalStack.length > 0 && modalStack[modalStack.length - 1] === modalIdRef.current) {
                    event.preventDefault()
                    event.stopPropagation()
                    event.stopImmediatePropagation() // Stop other handlers from seeing this event
                    onClose()
                }
            }
        }

        // Use capture phase to handle the event before it bubbles
        document.addEventListener('keydown', handleEscape, true)
        return () => {
            document.removeEventListener('keydown', handleEscape, true)
        }
    }, [isOpen, escapable, onClose])

    // Add keyboard handler for close button interaction
    useEffect(() => {
        if (!isOpen) return undefined

        const handleCloseButtonKeydown = (event: KeyboardEvent) => {
            // Only handle Enter and Space keys
            if (event.key !== 'Enter' && event.key !== ' ') {
                return
            }

            // Check if the target is an element (not document or window)
            const target = event.target as EventTarget
            if (!target || !(target instanceof Element)) {
                return
            }

            // Check if target is or is within a close button
            const isCloseButton = target.closest(
                'button[aria-label*="close" i], button[aria-label*="stäng" i], button.modal__close',
            )

            if (isCloseButton) {
                event.preventDefault()
                event.stopPropagation()
                onClose()
            }
        }

        // Add listener to document to catch all close button interactions
        document.addEventListener('keydown', handleCloseButtonKeydown, true)

        return () => {
            document.removeEventListener('keydown', handleCloseButtonKeydown, true)
        }
    }, [isOpen, onClose])

    // Handle initial focus when modal animation completes
    const handleModalOpened = useCallback(() => {
        if (!initialFocusSelector) return

        const element = document.querySelector<HTMLElement>(initialFocusSelector)
        if (element) {
            element.tabIndex = -1
            element.focus()
        }
    }, [initialFocusSelector])

    if (!isOpen) {
        return null
    }

    // Determine whether to wrap content based on the wrapContent prop
    // When false, pass children directly (for Theatre, Prompt, Sheets)
    // When true, wrap in a div with ARIA attributes (for regular content)
    const modalContent = wrapContent ? (
        <div ref={modalRef} role="dialog" aria-modal="true" aria-label={ariaLabel} aria-describedby={ariaDescribedBy}>
            {children}
        </div>
    ) : (
        (children as React.ReactElement)
    )

    return (
        <Modal
            className={className}
            visible={isOpen}
            handleCloseBtn={onClose}
            scrollLock={false} // Disable scroll lock to prevent page jump to top
            focusLockProps={{ locked: true }} // Enable focus locking (fixes ModalWrapper issue)
            onModalOpened={initialFocusSelector ? handleModalOpened : undefined}
            {...otherProps}
        >
            {modalContent}
        </Modal>
    )
}

AccessibleModal.defaultProps = defaultAccessibleModalProps

export default AccessibleModal
