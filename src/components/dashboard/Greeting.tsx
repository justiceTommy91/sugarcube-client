import Button from '@ingka/button'
import arrowDown from '@ingka/ssr-icon/paths/arrow-down'
import React from 'react'
import { useTranslation } from 'react-i18next'

require('./Greeting.scss')

interface Props {
    userFirstName: string
    onActionButtonClick?: () => void
}

const Greeting = ({ userFirstName, onActionButtonClick }: Props) => {
    const { t } = useTranslation('dashboard')

    const emoji = `👋`
    const welcomeTitle = userFirstName ? `Hej, ${userFirstName}!` : t('dashboard.welcome back')
    const welcomeBody = userFirstName ? t('dashboard.welcome back to ikea') : t('dashboard.access your saved work here')

    return (
        <div className="Greeting">
            <div className="welcomeMessage">
                <span className="emoji">{emoji}</span>
                <div className="greetingTitle">
                    <h2>{welcomeTitle}</h2>
                    <span>{welcomeBody}</span>
                </div>
            </div>
            {onActionButtonClick && (
                <Button
                    className="createNewRoomButton"
                    type="primary"
                    text={t('dashboard.hero.create new room')}
                    onClick={onActionButtonClick}
                    ssrIcon={arrowDown}
                    iconPosition="trailing"
                />
            )}
        </div>
    )
}

export default Greeting
