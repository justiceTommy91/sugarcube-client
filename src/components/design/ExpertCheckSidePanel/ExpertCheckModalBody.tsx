import React from 'react'
import { withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from 'hooks'
import { getIsLoggedIn } from 'models/user/selectors'
import { ExpertCheckModalBodyBottom } from './ExpertCheckModalBodyBottom'

export const ExpertCheckModalBody = () => {
    const { t } = useTranslation()
    const isLoggedIn = useAppSelector(getIsLoggedIn)

    return (
        <>
            <div>
                <img
                    className="image"
                    src={withPrefix('/images/graphics/expertCheck.jpg')}
                    alt={t('expertCheck.header')}
                />
                <h2 className="header">{t('expertCheck.header')}</h2>
                <div className="text">
                    <p>{isLoggedIn ? t('expertCheck.body') : t('expertCheck.login prompt')}</p>
                </div>
            </div>
            <ExpertCheckModalBodyBottom />
        </>
    )
}
