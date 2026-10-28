import React from 'react'
import Button from '@ingka/button'
import { useTranslation } from 'react-i18next'
import arrowCounterclockwiseIcon from '@ingka/ssr-icon/paths/arrow-counterclockwise'

import { useAppDispatch } from 'hooks/useAppDispatch'

import * as compositionsActions from 'models/compositions/actions'
import { TRACKING_ADDED_FROM } from 'models/tracking/constants'

import Tooltip from 'components/Tooltip'

import './UndoSwapButton.scss'

const MAX_UNDO_BUTTON_LENGTH = 9

export const UndoSwapButton = () => {
    const dispatch = useAppDispatch()
    const undoSwap = () => {
        dispatch(
            compositionsActions.undoSwap({
                trackingInfo: {
                    actionType: 'click',
                    from: TRACKING_ADDED_FROM.PRODUCT_SWAP,
                },
            }),
        )
    }

    const { t } = useTranslation()
    const buttonLabel = t('design.undo')
    const hasLongString = buttonLabel.length > MAX_UNDO_BUTTON_LENGTH

    const tooltipId = React.useId()
    return (
        <div className="UndoSwapButton">
            <div className="UndoSwapButton__notice" role="alert" aria-live="polite">
                {t('design.product swapped')}
            </div>

            <Tooltip describedById={tooltipId} place="bottom" title={buttonLabel} hide={!hasLongString}>
                <Button
                    onClick={undoSwap}
                    type="secondary"
                    text={hasLongString ? undefined : buttonLabel}
                    size="small"
                    iconOnly={hasLongString}
                    ssrIcon={arrowCounterclockwiseIcon}
                />
            </Tooltip>
        </div>
    )
}
