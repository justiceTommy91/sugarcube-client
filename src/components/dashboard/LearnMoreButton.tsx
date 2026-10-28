import Button, { type ButtonProps } from '@ingka/button'
import chevronRightSmall from '@ingka/ssr-icon/paths/chevron-right-small'
import { navigate } from 'gatsby'
import * as tracker from 'utils/tracker'
import { GA_CATEGORY_DESIGN_LAB, OPTIMIZELY_LEARNMORE } from 'models/tracking/constants'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { experimentsService } from 'services/experiments'

// There are many learn more buttons and we want to track where the
// learn more button was clicked from. For mixpanel events, this is th
// AccessFrom field and for ga events, it is the label of the ga event.
const trackLearnMoreClick = (clickFromGaAction: string, clickAccessFrom: string) => {
    tracker.trackGoogleAnalytics({
        category: GA_CATEGORY_DESIGN_LAB,
        action: clickFromGaAction,
        label: 'learn_more',
    })
    tracker.click('Dashboard.LearnMoreClick', { AccessFrom: clickAccessFrom })
    experimentsService.track(OPTIMIZELY_LEARNMORE)
}

export type LearnMoreButtonProps = Omit<ButtonProps, 'onClick'> & {
    track?: { action: string; from: string }
}

export const LearnMoreButton: React.FunctionComponent<LearnMoreButtonProps> = ({ track, ...props }) => {
    const { t } = useTranslation('dashboard')
    return (
        <Button
            text={t('dashboard.learn more')}
            ssrIcon={chevronRightSmall}
            iconPosition="trailing"
            onClick={() => {
                if (track) {
                    trackLearnMoreClick(track.action, track.from)
                }
                navigate(`/learnmore`)
            }}
            {...props}
        />
    )
}
