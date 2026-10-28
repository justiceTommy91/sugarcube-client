import React from 'react'
import classNames from 'classnames'
import SSRIcon from '@ingka/ssr-icon'

import cross from '@ingka/ssr-icon/paths/cross'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import { ORIENTATION_LANDSCAPE } from 'models/ui/constants'
import { useAppSelector } from 'hooks'
import { getSelectedCompositionShoppableProductData } from 'models/compositions/selectors'
import { getOrientation } from 'models/ui/selectors'

require('./DesignSummaryExitPopup.scss')

export type DesignSummaryExitPopupProps = {
    onClose: () => void
    onClickBack: () => void
    onClickCheckout: () => void
}

const DesignSummaryExitPopup: React.FunctionComponent<DesignSummaryExitPopupProps> = ({
    onClose,
    onClickBack,
    onClickCheckout,
}) => {
    const { t } = useTranslation()

    const addedToRoomItems = useAppSelector(getSelectedCompositionShoppableProductData)
    const orientation = useAppSelector(getOrientation)
    const hasLandscapeOrientation = orientation === ORIENTATION_LANDSCAPE
    return (
        <div
            className={classNames('DesignSummaryExitPopup', {
                landscape: hasLandscapeOrientation,
            })}
        >
            <button className="exitPopupClose" onClick={onClose}>
                <SSRIcon paths={cross} />
            </button>
            <div className="popupHeader">
                {t('designSummaryExit.items were added', { count: addedToRoomItems.length })}
            </div>
            <div className="popupSubheader">{t('designSummaryExit.continue to shop the room')}</div>
            <div className="checkout">
                <Button
                    onClick={onClickCheckout}
                    type="secondary"
                    text={t('designSummaryExit.continue to check out')}
                />
            </div>
            <button className="backIkeaBtn" onClick={onClickBack}>
                {t('designSummaryExit.go back to IKEA')}
            </button>
        </div>
    )
}

export default DesignSummaryExitPopup
