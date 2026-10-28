import React from 'react'
import { useTranslation } from 'react-i18next'
import { withPrefix } from 'gatsby'
import SSRIcon from '@ingka/ssr-icon'
import crossSmall from '@ingka/ssr-icon/paths/cross-small'
import { useAppSelector } from 'hooks'
import { getShouldShowExpertCheckCallout } from 'models/ui/selectors'
import { useExpertCheckCallout } from './useExpertCheckCallout'

require('./ExpertCheckCallout.scss')

export const ExpertCheckCallout = ({ expertCheckCalloutOnClick }: { expertCheckCalloutOnClick: () => void }) => {
    const { t } = useTranslation()
    const { handleCalloutBodyClick, handleCalloutCloseButtonClick } = useExpertCheckCallout()
    const shouldShowCallout = useAppSelector(getShouldShowExpertCheckCallout)

    if (!shouldShowCallout) {
        return null
    }

    return (
        <div className="ExpertCheckCallout">
            <div
                className="ExpertCheckCallout__box"
                onClick={() => {
                    handleCalloutBodyClick()
                    expertCheckCalloutOnClick()
                }}
            >
                <span className="ExpertCheckCallout__triangle" />
                <img src={withPrefix('/images/graphics/expertCheckTooltip.jpg')} alt="" />
                <div className="ExpertCheckCallout__text">
                    <h4>{t('expertCheck.callout title')}</h4>
                    <p>{t('expertCheck.callout body')}</p>
                </div>
                <button onClick={handleCalloutCloseButtonClick} className="ExpertCheckCallout__close-button">
                    <SSRIcon paths={crossSmall} />
                </button>
            </div>
        </div>
    )
}
