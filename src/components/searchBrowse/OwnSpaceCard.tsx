import React from 'react'
import { useTranslation } from 'react-i18next'

import camera from '@ingka/ssr-icon/paths/camera'
import Button from '@ingka/button'
import { withPrefix } from 'gatsby'
import classNames from 'classnames'

interface OwnSpaceCardProps {
    openAppDownload: () => void
    disabled?: boolean
    loading?: boolean
}

export const OwnSpaceCard = (props: OwnSpaceCardProps) => {
    const { openAppDownload, disabled, loading } = props

    const { t } = useTranslation()

    return (
        <div className={classNames('searchBrowseCard ownSpace', { disabled, loading })}>
            {disabled ? <div className={classNames('image', { disabled })} /> : null}
            {!loading && !disabled ? (
                <div className="designInAppContainer">
                    <div className="designInAppText">
                        <div className="header">{t('searchBrowse.want to use your own space')}</div>
                        <div className="subheader">{t('searchBrowse.easily scan erase and design')}</div>
                    </div>
                    <div className="designInAppImageContainer">
                        <Button
                            type="image-overlay"
                            text={t('chooseRoom.design in ikea app', { ns: 'translation' })}
                            ssrIcon={camera}
                            onClick={openAppDownload}
                            className="designInAppButton"
                        />
                        <img
                            src={withPrefix('/images/graphics/designInApp.jpg')}
                            alt={t('chooseRoom.design in ikea app', { ns: 'translation' })}
                            className="designInAppImage"
                        />
                    </div>
                </div>
            ) : null}
        </div>
    )
}
