import React from 'react'
import { Trans, useTranslation } from 'react-i18next'

import classNames from 'classnames'

import { useFlags } from 'hooks'

require('./AuthMessage.scss')

type AuthMessageProps = {
    onLogin: () => void
    onSignup: () => void
}

const AuthMessage = ({ onLogin, onSignup }: AuthMessageProps) => {
    const { t } = useTranslation('dashboard')

    const { flags } = useFlags()
    const isMorpheusEnabled = flags.Morpheus

    return (
        <div className={classNames('AuthMessage', { isMorpheusEnabled })}>
            {isMorpheusEnabled ? (
                <p>
                    <Trans i18nKey="dashboard.ikea kreativ is free for everyone" ns="dashboard">
                        IKEA Kreativ is free for everyone.
                        <button onClick={onLogin}>Log in</button>
                        <button onClick={onSignup}>sign up</button>
                    </Trans>
                </p>
            ) : (
                <>
                    {' '}
                    <div className="sectionHeader">
                        <p>{t('dashboard.use ikea kreativ as a guest')}</p>
                    </div>
                    <p>
                        <button onClick={onLogin}>{t('dashboard.log in')}</button>
                        <span> {t('dashboard.or')} </span>
                        <button onClick={onSignup}>{t('dashboard.sign up')}</button>
                        <span> {t('dashboard.to save your designs')}</span>
                    </p>
                </>
            )}
        </div>
    )
}

export default AuthMessage