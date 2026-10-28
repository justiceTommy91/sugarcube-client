import React, { cloneElement, useCallback, useEffect, useId, useRef, useState } from 'react'
import { withPrefix } from 'gatsby'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right-small'
import SSRIcon from '@ingka/ssr-icon'
import { useTranslation } from 'react-i18next'

import { DAILY_USAGE_LIMIT } from 'models/beautifier/constants'

import './BeautifierPopover.scss'

const AUTO_HIDE_MS = 6_000

type BeautifierPopoverProps = {
    children: JSX.Element
    disabled?: boolean
    onCtaClick?: () => void
}

const BeautifierPopover = ({ children, disabled, onCtaClick }: BeautifierPopoverProps): JSX.Element => {
    const { t } = useTranslation('translation')
    const [isVisible, setIsVisible] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLElement | null>(null)
    const popoverId = useId()
    const titleId = useId()
    const descriptionId = useId()

    const show = useCallback(() => setIsVisible(true), [])
    const hide = useCallback(() => setIsVisible(false), [])

    useEffect(() => {
        if (!isVisible) return undefined

        const autoHideTimer = setTimeout(hide, AUTO_HIDE_MS)
        const handleOutsideClick = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                hide()
            }
        }
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                triggerRef.current?.focus()
                hide()
            }
        }
        document.addEventListener('mousedown', handleOutsideClick)
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            clearTimeout(autoHideTimer)
            document.removeEventListener('mousedown', handleOutsideClick)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isVisible, hide])

    const handleCtaClick = useCallback(() => {
        triggerRef.current?.focus()
        hide()
        onCtaClick?.()
    }, [hide, onCtaClick])

    const handleBlur = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
        const nextFocus = event.relatedTarget as Node | null
        if (!nextFocus || !event.currentTarget.contains(nextFocus)) {
            hide()
        }
    }, [hide])

    return (
        <div
            className="BeautifierPopover"
            ref={wrapperRef}
            onMouseEnter={show}
            onFocus={show}
            onBlur={handleBlur}
        >
            {cloneElement(children, {
                ref: triggerRef,
                onClick: (event: React.MouseEvent<HTMLElement>) => {
                    hide()
                    const originalOnClick = (children.props as { onClick?: (e: React.MouseEvent<HTMLElement>) => void }).onClick
                    originalOnClick?.(event)
                },
                'aria-expanded': isVisible,
                'aria-haspopup': 'dialog',
                ...(isVisible ? { 'aria-controls': popoverId } : {}),
            })}
            {isVisible && (
                <div
                    className="BeautifierPopover__popover"
                    role="dialog"
                    aria-modal="false"
                    id={popoverId}
                    aria-labelledby={titleId}
                    aria-describedby={descriptionId}
                >
                    <div className="BeautifierPopover__card">
                        <div className="BeautifierPopover__header">
                            <span className="BeautifierPopover__title" id={titleId}>
                                {t('design.beautify tooltip title')}
                            </span>
                            <span className="BeautifierPopover__badge">
                                {t('design.beautify tooltip badge')}
                            </span>
                        </div>
                        <div className="BeautifierPopover__image-container">
                            <img
                                className="BeautifierPopover__image"
                                src={withPrefix('/images/beautifier_tooltip_room.png')}
                                alt=""
                            />
                        </div>
                        <div className="BeautifierPopover__body">
                            <p className="BeautifierPopover__description" id={descriptionId}>
                                {t('design.beautify tooltip description', { count: DAILY_USAGE_LIMIT })}
                            </p>
                            <button
                                type="button"
                                className="BeautifierPopover__cta"
                                onClick={handleCtaClick}
                                disabled={disabled}
                            >
                                <span className="BeautifierPopover__cta-label">
                                    {t('design.beautify tooltip cta')}
                                </span>
                                <SSRIcon paths={arrowRight} />
                            </button>
                        </div>
                    </div>
                    <div className="BeautifierPopover__arrow" />
                </div>
            )}
        </div>
    )
}

export default BeautifierPopover
