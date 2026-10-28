import React, { useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'

import headsetActive from '@ingka/ssr-icon/paths/headset-active'
import SSRIcon from '@ingka/ssr-icon'
import { useTracker } from 'apps/TrackingBoundary'
import Tooltip from 'components/Tooltip'
import {
    ACTION_OPEN_EXPERT_CHECK_PANEL,
    GA_ACTION_EXPOSE_EXPERT_CHECK,
    GA_ACTION_OPEN_EXPERT_CHECK_PANEL,
    GA_CATEGORY_DYH_SUGARCUBE,
    GA_LABEL_EXPERT_CHECK_HEADER_BUTTON,
} from 'models/tracking/constants'
import { trackGoogleAnalytics } from 'utils/tracker'
import { ExpertCheckCallout } from './ExpertCheckCallout'

require('./PreviewHeaderExpertCheckButton.scss')

interface PreviewHeaderExpertCheckButtonProps {
    onExpertCheckClick: () => void
}
const PreviewHeaderExpertCheckButton = ({ onExpertCheckClick }: PreviewHeaderExpertCheckButtonProps) => {
    const { t } = useTranslation()
    const track = useTracker()
    const tooltipId = useId()

    useEffect(() => {
        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_EXPOSE_EXPERT_CHECK,
            label: 'header',
        })
    }, [])

    return (
        <div className="PreviewHeaderExpertCheckButtonContainer">
            <Tooltip describedById={tooltipId} title={t('expertCheck.tooltip')}>
                <button
                    data-for={tooltipId}
                    onClick={() => {
                        trackGoogleAnalytics({
                            category: GA_CATEGORY_DYH_SUGARCUBE,
                            action: GA_ACTION_OPEN_EXPERT_CHECK_PANEL,
                            label: GA_LABEL_EXPERT_CHECK_HEADER_BUTTON,
                        })
                        track.click({
                            target: 'expertCheck.preview header button',
                            intendedAction: ACTION_OPEN_EXPERT_CHECK_PANEL,
                        })
                        onExpertCheckClick()
                    }}
                    aria-label={t('expertCheck.tooltip')}
                >
                    <SSRIcon paths={headsetActive} className="headerIcons" />
                </button>
            </Tooltip>
            <ExpertCheckCallout
                expertCheckCalloutOnClick={() => {
                    onExpertCheckClick()
                }}
            />
        </div>
    )
}

export default PreviewHeaderExpertCheckButton
