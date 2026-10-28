import React, { useRef, useEffect } from 'react'
import { useAppSelector, useOutsideAlerter } from 'hooks'
import { useTranslation } from 'react-i18next'
import SSRIcon from '@ingka/ssr-icon'
import trashCan from '@ingka/ssr-icon/paths/trash-can'
import pencil from '@ingka/ssr-icon/paths/pencil'
import createNew from '@ingka/ssr-icon/paths/create-new'

import './MoreActionsDropdown.scss'
import copy from '@ingka/ssr-icon/paths/copy'
import { getIsSaving } from 'models/compositions/selectors'
import { focusElement, getFocusableElements } from '../../../hooks/focus'

export type MoreActionsDropdownProps = {
    onClickAway: () => void
    onDeleteClick: () => void
    onRenameClick?: () => void
    onCopyClick?: () => void
    onCreateNewDesign?: () => void
    isOpen: boolean
    restoreFocusTo?: HTMLElement | null
}

export const MoreActionsDropdown: React.FunctionComponent<MoreActionsDropdownProps> = ({
    onClickAway,
    onDeleteClick,
    onRenameClick,
    onCopyClick,
    onCreateNewDesign,
    isOpen,
    restoreFocusTo,
}) => {
    const ref = useRef<HTMLDivElement>(null)
    const { t } = useTranslation()
    const isSaving = useAppSelector(getIsSaving)

    // Note: Focus trapping removed to allow natural Tab flow out of dropdown

    useOutsideAlerter({
        ref,
        onClickOutside: onClickAway,
    })

    // Handle initial focus when dropdown opens
    useEffect(() => {
        if (isOpen && ref.current) {
            // Use requestAnimationFrame for better timing with rendering
            const focusTimeout = requestAnimationFrame(() => {
                if (ref.current) {
                    const focusableElements = getFocusableElements(ref.current)
                    if (focusableElements.length > 0) {
                        focusElement(focusableElements[0])
                    }
                }
            })

            return () => {
                cancelAnimationFrame(focusTimeout)
            }
        }
        return undefined
    }, [isOpen])

    // Handle Escape key to close dropdown
    useEffect(() => {
        if (!isOpen) {
            return undefined
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                // Check if the event target is within our dropdown
                const target = event.target as HTMLElement
                if (ref.current && ref.current.contains(target)) {
                    event.preventDefault()
                    event.stopPropagation()
                    onClickAway()

                    // Restore focus to trigger element if available
                    if (restoreFocusTo) {
                        setTimeout(() => {
                            if (restoreFocusTo) {
                                focusElement(restoreFocusTo)
                            }
                        }, 10)
                    }
                }
            }
        }

        document.addEventListener('keydown', handleEscape, true) // Use capture phase
        return () => {
            document.removeEventListener('keydown', handleEscape, true)
        }
    }, [isOpen, onClickAway, restoreFocusTo])

    // Handle focus restoration when dropdown closes
    useEffect(() => {
        // When dropdown closes and we have a focus restoration target, restore focus
        // But only if no modal is currently open (let modal handle focus restoration)
        if (!isOpen && restoreFocusTo) {
            // Check if a modal is currently open by looking for aria-modal elements
            setTimeout(() => {
                const modalExists = document.querySelector('[aria-modal="true"]')
                if (!modalExists && restoreFocusTo) {
                    focusElement(restoreFocusTo)
                }
            }, 10)
        }
    }, [isOpen, restoreFocusTo])

    return (
        <div className="MoreActionsDropdown" ref={ref} role="menu">
            <ul className="moreActionsList" onClick={onClickAway}>
                {onRenameClick && (
                    <li>
                        <button onClick={onRenameClick} disabled={isSaving} role="menuitem">
                            <SSRIcon paths={pencil} />
                            {t('design.rename', { ns: 'translation' })}
                        </button>
                    </li>
                )}
                {onCopyClick && (
                    <li>
                        <button onClick={onCopyClick} disabled={isSaving} role="menuitem">
                            <SSRIcon paths={copy} />
                            {t('design.make a copy')}
                        </button>
                    </li>
                )}
                {onCreateNewDesign && (
                    <li>
                        <button onClick={onCreateNewDesign} disabled={isSaving} role="menuitem">
                            <SSRIcon paths={createNew} />
                            {t('dashboard.create a new design', { ns: 'dashboard' })}
                        </button>
                    </li>
                )}
                <li>
                    <button onClick={onDeleteClick} disabled={isSaving} role="menuitem">
                        <SSRIcon paths={trashCan} />
                        {t('dashboard.delete', { ns: 'dashboard' })}
                    </button>
                </li>
            </ul>
        </div>
    )
}
