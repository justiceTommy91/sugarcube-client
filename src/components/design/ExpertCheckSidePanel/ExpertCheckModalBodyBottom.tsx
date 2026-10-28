import React, { useEffect, useId, useState } from 'react'
import classNames from 'classnames'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'gatsby'
import Button from '@ingka/button'
import Checkbox from '@ingka/checkbox'
import SSRIcon from '@ingka/ssr-icon'
import calendar from '@ingka/ssr-icon/paths/calendar'
import noticeRed from '@ingka/ssr-icon/paths/notice-red-small'
import { useTracker } from 'apps/TrackingBoundary'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import { useAppDispatch, useAppSelector } from 'hooks'
import { CONTEXT_ROOM } from 'constants/contexts'
import { requestSaveCompositionSharing, requestSaveExpertCheckConsent } from 'models/compositions/actions'
import {
    getIsSaving,
    getIsSavingExpertCheckConsent,
    getIsSavingSharing,
    getSelectedCompositionData,
} from 'models/compositions/selectors'
import { getRegion } from 'models/location/selectors'
import {
    ACTION_ACCEPT_EXPERT_CHECK_TERMS,
    ACTION_LOGIN_SIGNUP_EXPERT_CHECK,
    ACTION_SCHEDULE_EXPERT_CHECK,
    ACTION_UNACCEPT_EXPERT_CHECK_TERMS,
    GA_ACTION_ACCEPT_EXPERT_CHECK_TERMS,
    GA_ACTION_LOGIN_SIGNUP_EXPERT_CHECK,
    GA_ACTION_SCHEDULE_EXPERT_CHECK,
    GA_ACTION_UNACCEPT_EXPERT_CHECK_TERMS,
    GA_CATEGORY_DYH_SUGARCUBE,
} from 'models/tracking/constants'
import { requestLoginPage } from 'models/user/actions'
import { getIsLoggedIn } from 'models/user/selectors'
import { withTimeout } from 'utils/async'
import { getExpertCheckUrl } from 'utils/buildUrls'
import { trackGoogleAnalytics } from 'utils/tracker'

export const ExpertCheckModalBodyBottom = () => {
    const [isChecked, setIsChecked] = useState(true)
    const [shouldRedirect, setShouldRedirect] = useState(false)
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const track = useTracker()
    const checkboxId = useId()
    const selectedCompositionData = useAppSelector(getSelectedCompositionData)
    const isLoggedIn = useAppSelector(getIsLoggedIn)
    const region = useAppSelector(getRegion)

    const isSavingComposition = useAppSelector(getIsSaving)
    const isSavingSharing = useAppSelector(getIsSavingSharing)
    const isSavingExpertCheckConsent = useAppSelector(getIsSavingExpertCheckConsent)
    // Since the CTA redirects the user away from our page, we want to make sure all tracking events gets fired before the redirect
    const [isEmittingCtaTracking, setIsEmittingCtaTracking] = useState(false)
    const isLoading = isSavingSharing || isSavingExpertCheckConsent || isEmittingCtaTracking
    const ExpertCheckCheckboxLabel = (
        <Trans i18nKey="expertCheck.checkbox">
            I agree to share my design with an IKEA co-worker and confirm that I have read and understood the{' '}
            <Link
                to={`https://www.ikea.com/${region}/customer-service/privacy-policy/`}
                target="_blank"
                style={{ textDecoration: 'underline' }}
            >
                Privacy Policy
            </Link>
            .
        </Trans>
    )

    useEffect(() => {
        if (shouldRedirect && !isLoading) {
            const expertCheckUrl = getExpertCheckUrl(selectedCompositionData.uuid)
            window.location.href = expertCheckUrl
        }
    }, [isLoading, shouldRedirect])

    const handleCheckboxChange = () => {
        setIsChecked((checked) => {
            trackGoogleAnalytics({
                category: GA_CATEGORY_DYH_SUGARCUBE,
                action: checked ? GA_ACTION_UNACCEPT_EXPERT_CHECK_TERMS : GA_ACTION_ACCEPT_EXPERT_CHECK_TERMS,
                label: '',
            })
            track.click({
                target: 'expertCheck.checkbox',
                intendedAction: checked ? ACTION_UNACCEPT_EXPERT_CHECK_TERMS : ACTION_ACCEPT_EXPERT_CHECK_TERMS,
            })
            return !checked
        })
    }

    const handleCtaClickTracking = () => {
        setIsEmittingCtaTracking(true)
        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_SCHEDULE_EXPERT_CHECK,
            label: selectedCompositionData.shareUrl || '',
        })
        withTimeout(
            track.click({
                target: 'expertCheck.cta',
                intendedAction: ACTION_SCHEDULE_EXPERT_CHECK,
            }),
            2_000,
        ).finally(() => {
            setIsEmittingCtaTracking(false)
            setShouldRedirect(true)
        })
    }

    const handleExpertCheckConsent = () => {
        const { isShared, uuid, sendNotifications } = selectedCompositionData
        const compositionSharingData = {
            isShared,
            enableRemix: true,
            sendNotifications,
            compositionId: uuid,
        }
        dispatch(requestSaveCompositionSharing(compositionSharingData))
        dispatch(requestSaveExpertCheckConsent(compositionSharingData))
    }

    const handleCtaButtonClick = () => {
        handleExpertCheckConsent()
        handleCtaClickTracking()
    }

    const handleLoginClick = () => {
        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_LOGIN_SIGNUP_EXPERT_CHECK,
            label: '',
        })
        withTimeout(
            track.click({
                target: 'expertCheck.loginSignup',
                intendedAction: ACTION_LOGIN_SIGNUP_EXPERT_CHECK,
            }),
            2_000,
        ).finally(() => {
            dispatch(requestLoginPage(false, CONTEXT_ROOM))
        })
    }

    if (isSavingComposition) {
        return <BouncingBallLoader subheaderText={`${t('shared.saving your design')}...`} />
    }

    if (!isLoggedIn) {
        return (
            <div className="ExpertCheckModalBodyBottom">
                <Button fluid type="primary" onClick={handleLoginClick}>
                    {t('login.log in or sign up')}
                </Button>
                <p className="text-disclaimer">{t('expertCheck.disclaimer')}</p>
            </div>
        )
    }

    return (
        <div className="ExpertCheckModalBodyBottom">
            <Checkbox
                id={checkboxId}
                value="0"
                label={ExpertCheckCheckboxLabel}
                checked={isChecked}
                onChange={handleCheckboxChange}
                disabled={isLoading}
            />
            <div className={classNames('consent-reminder', { visible: !isChecked })}>
                <SSRIcon paths={noticeRed} />
                <p className="text-warning">{t('expertCheck.consent required')}</p>
            </div>
            <Button
                disabled={!isChecked || isLoading}
                text={t('expertCheck.cta')}
                type="primary"
                fluid
                onClick={handleCtaButtonClick}
                loading={isLoading}
                ssrIcon={calendar}
            />
            <p className="text-disclaimer">{t('expertCheck.disclaimer')}</p>
        </div>
    )
}
