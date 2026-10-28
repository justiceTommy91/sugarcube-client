import React from 'react'
import classNames from 'classnames'
import { Trans } from 'react-i18next'
import { useStackableDraggingState } from '@gatsby/Renderer/ui/hooks/useStackableDraggingState'
import './StackableIndicator.scss'

export const StackableIndicator = () => {
    const { isStackableDragging: isStackableDraggingMode } = useStackableDraggingState()

    if (!isStackableDraggingMode) return null

    return (
        <div className={classNames('StackableIndicator', { isStackableDraggingMode })}>
            <p>
                <Trans i18nKey="design.drop stackable while dragging">
                    <div>Drop on a colored surface or floor</div>
                </Trans>
            </p>
        </div>
    )
}
