import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import { getDesignLabUrl } from 'models/location/selectors'
import { useSelector } from 'react-redux'
import { CONTEXT_ROOM } from 'constants/contexts'
import { getPreviewErrorType } from 'models/preview/selectors'
import { useAppDispatch } from 'hooks'
import { requestLoginPage } from 'models/user/actions'

require('./PreviewError.scss')

export const PreviewError: React.FC = () => {
    const { t } = useTranslation('translation')

    const dispatch = useAppDispatch()
    const requestLogin = () => dispatch(requestLoginPage(false, CONTEXT_ROOM))

    const { isUserNotAllowedError, isLoginError } = useSelector(getPreviewErrorType)

    if (isUserNotAllowedError) {
        return (
            <div className="PreviewError" role="alert">
                <div className="errorText">
                    <Trans i18nKey="design.no access error message">
                        Your account does not have access to this room.
                        <br />
                        Please visit your Dashboard to access your rooms.
                    </Trans>
                </div>
                <Button
                    type="primary"
                    href={getDesignLabUrl()}
                    text={t('design.dashboard')}
                    className="dashboardLink"
                />
            </div>
        )
    }

    if (isLoginError) {
        return (
            <div className="PreviewError" role="alert">
                <p>{t('design.need to login')}</p>
                <Button type="primary" onClick={requestLogin} text={t('login.log in')} />
            </div>
        )
    }

    return (
        <div className="PreviewError" role="alert">
            <Trans i18nKey="design.failed to load scene error message">
                We&apos;re sorry, but this is unexpected. We were not able to load your rooms.
                <br />
                <br />
                Please reload the page, or try again later.
            </Trans>
        </div>
    )
}
