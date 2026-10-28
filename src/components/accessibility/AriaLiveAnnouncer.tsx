import React, { useEffect, useState } from 'react'
import classNames from 'classnames'

import './AriaLiveAnnouncer.scss'

export interface AriaLiveAnnouncerProps {
    message: string
    politeness?: 'polite' | 'assertive'
    clearAfter?: number // milliseconds
    className?: string
}

/**
 * AriaLiveAnnouncer is a reusable component for announcing messages to screen readers.
 * It uses ARIA live regions to communicate status updates without moving focus.
 * 
 * @param message - The message to announce
 * @param politeness - 'polite' (default) for non-critical updates, 'assertive' for urgent messages
 * @param clearAfter - Optional milliseconds to clear the message after announcing
 * @param className - Additional CSS classes
 */
const AriaLiveAnnouncer: React.FC<AriaLiveAnnouncerProps> = ({
    message,
    politeness = 'polite',
    clearAfter,
    className,
}) => {
    const [announcedMessage, setAnnouncedMessage] = useState(message)

    useEffect(() => {
        setAnnouncedMessage(message)

        if (clearAfter && message) {
            const timeoutId = setTimeout(() => {
                setAnnouncedMessage('')
            }, clearAfter)

            return () => clearTimeout(timeoutId)
        }
        
        return undefined
    }, [message, clearAfter])

    return (
        <div
            role="status"
            aria-live={politeness}
            aria-atomic="true"
            className={classNames('AriaLiveAnnouncer', className)}
        >
            {announcedMessage}
        </div>
    )
}

export default AriaLiveAnnouncer