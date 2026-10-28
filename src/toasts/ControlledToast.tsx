import React, { useState, useTransition, useEffect } from 'react'
import Toast from '@ingka/toast'
import AriaLiveAnnouncer from '../components/accessibility/AriaLiveAnnouncer'

// ControlledToastProps extends from ToastProps but omits the props we control internally
export type ControlledToastProps = Omit<
    React.ComponentProps<typeof Toast>,
    'isOpen' | 'onCloseRequest' | 'onTransitionEnd'
> & {
    onDismiss: () => void
    announcement?: string // Optional explicit announcement text for screen readers
}

/**
 * Wrapper around @ingka/toast that adds ARIA live region support for screen reader announcements.
 * This ensures that toast messages are announced to screen reader users without moving focus.
 */
const ControlledToast = ({
    onDismiss,
    text,
    children,
    announcement,
    actionButtonText,
    actionClick,
    ariaLabel,
    ...props
}: ControlledToastProps) => {
    const [, startTransition] = useTransition()
    const [isOpen, setIsOpen] = useState(true)
    const [liveRegionText, setLiveRegionText] = useState('')

    const close = () => {
        startTransition(() => {
            setIsOpen(false)
        })
    }

    // Use explicit announcement if provided, otherwise extract from text/children
    const messageContent = announcement || text || children || ''
    const announcementText = typeof messageContent === 'string' ? messageContent : messageContent?.toString() || ''

    // Update live region when toast opens
    useEffect(() => {
        if (isOpen && announcementText) {
            // Small delay to ensure live region is in DOM before content change
            const timer = setTimeout(() => {
                setLiveRegionText(announcementText)
            }, 100)

            return () => clearTimeout(timer)
        }
        return undefined
    }, [isOpen, announcementText])

    // Clear announcement after delay
    useEffect(() => {
        if (liveRegionText) {
            const timer = setTimeout(() => {
                setLiveRegionText('')
            }, 5000)

            return () => clearTimeout(timer)
        }
        return undefined
    }, [liveRegionText])

    // Prepare action props conditionally to satisfy Toast's discriminated union type
    const actionProps =
        actionButtonText && actionClick && ariaLabel
            ? { actionButtonText, actionClick, ariaLabel }
            : { actionButtonText: undefined, actionClick: undefined, ariaLabel: undefined }

    return (
        <>
            {/* ARIA live region for screen reader announcements */}
            <AriaLiveAnnouncer message={liveRegionText} politeness="polite" />
            {/* The visual toast component */}
            <Toast
                isOpen={isOpen}
                onCloseRequest={close}
                onTransitionEnd={onDismiss}
                text={text}
                {...actionProps}
                {...props}
            >
                {children}
            </Toast>
        </>
    )
}

export default ControlledToast
