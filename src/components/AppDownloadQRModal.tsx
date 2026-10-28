import React from 'react'
import { useTranslation } from 'react-i18next'
import { withPrefix } from 'gatsby'
import { useAppDispatch, useAppSelector } from 'hooks'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { getChooseRoomRoomType } from 'models/location/selectors'
import { getLocaleForMobileAppStores } from 'models/location/helpers'

import {
    GA_CATEGORY_DESIGN_LAB,
    GA_ACTION_GET_IKEA_APP,
    GA_LABEL_PIP_CONTEXT,
    GA_LABEL_PLAY_STORE,
    GA_LABEL_APP_STORE,
    type WebSourceType,
} from 'models/tracking/constants'
import { click } from 'utils/tracker'

import Modal, { ModalHeader, Theatre } from '@ingka/modal'
import Button from '@ingka/button'
import { NO_BADGE_LOCALES } from 'models/location/constants'
import { getRoomSourceFromScene } from 'models/scenes/utils'
import { trackGaEvent } from 'models/tracking/actions'
import { getSelectedComposition, getPlacedProductData } from 'models/compositions/selectors'
import { getShowAppDownloadModal } from 'models/ui/selectors'
import { showAppDownloadModal } from 'models/ui/actions'
import { getAppStoreUrl } from 'utils/buildUrls'
import QRCode from 'react-qr-code'

require('./AppDownloadQRModal.scss')

type AppDownloadQRModalProps = {
    source: WebSourceType
}
const AppDownloadQRModal = ({ source }: AppDownloadQRModalProps) => {
    const { isPipIntegration } = useSugarcubeContext()
    const dispatch = useAppDispatch()
    const composition = useAppSelector(getSelectedComposition)
    const isAppDownloadModalVisible = useAppSelector(getShowAppDownloadModal)
    const placedProductData = useAppSelector(getPlacedProductData)

    const roomTitle = composition?.scene?.name
    const roomSource = composition?.scene ? getRoomSourceFromScene(composition.scene) : undefined
    const roomId = composition?.sceneId

    const qrLink = getAppStoreUrl({ source })
    const closeAppDownloadModal = () => {
        dispatch(showAppDownloadModal(false))

        click('DecorateRoom.TryInMyRoomInfo.Quit', {
            RoomTitle: roomTitle,
            RoomId: roomId,
            RoomSource: roomSource,
        })
    }

    const clickAppStoreButton = (isGoogleStore: boolean) => {
        let eventName = isGoogleStore
            ? `DecorateInMyRoom.TryInMyRoom.GooglePlayStoreAccessClick`
            : `DecorateInMyRoom.TryInMyRoom.AppleStoreAccessClick`
        if (isPipIntegration) {
            eventName = isGoogleStore
                ? `ChooseRoom.GetIkeaApp.GooglePlayStoreAccessClick`
                : `ChooseRoom.GetIkeaApp.AppleStoreAccessClick`
        }

        const trackingInfo = {
            RoomTitle: roomTitle,
            RoomId: roomId,
            RoomSource: roomSource,
        }
        click(eventName, trackingInfo)

        const roomType = getChooseRoomRoomType()

        let gaLabel = isGoogleStore ? GA_LABEL_PLAY_STORE : GA_LABEL_APP_STORE
        if (isPipIntegration) {
            gaLabel = `${GA_LABEL_PIP_CONTEXT}|${roomType || null}|${
                placedProductData ? placedProductData.localItemNumber : null
            }|${gaLabel}`
        }
        const gaTrackingInfo = {
            category: GA_CATEGORY_DESIGN_LAB,
            action: GA_ACTION_GET_IKEA_APP,
            label: gaLabel,
        }
        dispatch(trackGaEvent(gaTrackingInfo))
    }

    const [appStoreLocale, appStoreCountry] = getLocaleForMobileAppStores()

    const playStoreLink = `https://play.google.com/store/apps/details?id=com.ingka.ikea.app&hl=${appStoreLocale}&gl=${appStoreCountry}`
    const iosStoreLink = `https://apps.apple.com/${appStoreCountry}/app/ikea/id1452164827?platform=iphone`

    // TODO Locale: make sure the app store and play store badges are localized in static folder
    const iosBadgeUrl = withPrefix(`/images/graphics/appStore/${appStoreLocale}/black_lockup/appStore.svg`)
    const androidBadgeUrl = withPrefix(`/images/graphics/playStore/${appStoreLocale}/playStore.png`)
    const ikeaLogo = withPrefix(`/images/graphics/IKEA-App-badge.jpg`)

    const noBadgeLocale = NO_BADGE_LOCALES.includes(appStoreLocale)

    const { t } = useTranslation()

    if (!isAppDownloadModalVisible) {
        return null
    }

    return (
        <Modal
            className="AppDownloadQRModal"
            visible={isAppDownloadModalVisible}
            handleCloseBtn={closeAppDownloadModal}
        >
            <Theatre header={<ModalHeader floating />}>
                <div className="modalContentContainer">
                    <div className="modalBody">
                        <img className="ikeaLogo" src={ikeaLogo} alt={t('common.alt.logo')} />
                        <div className="flexContainer">
                            <div className="modalBodyHeaderContainer">
                                <h2 className="modalBodyHeader">{t('mobile.scan and design')}</h2>
                                <p className="modalBodySubheader">{t('mobile.to access the IKEA app')}</p>
                            </div>
                        </div>
                        <div className="storeContainer">
                            {noBadgeLocale ? (
                                <>
                                    {' '}
                                    <Button
                                        type="primary"
                                        onClick={() => clickAppStoreButton(false)}
                                        className="storeCta"
                                        size="small"
                                    >
                                        <a href={iosStoreLink} target="_blank" rel="noopener noreferrer">
                                            {t('mobile.download app store')}
                                        </a>
                                    </Button>
                                    <Button
                                        type="primary"
                                        onClick={() => clickAppStoreButton(true)}
                                        className="storeCta playStore"
                                        size="small"
                                    >
                                        <a href={playStoreLink} target="_blank" rel="noopener noreferrer">
                                            {t('mobile.download play store')}
                                        </a>
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="storeCta" onClick={() => clickAppStoreButton(false)}>
                                        <a href={iosStoreLink} target="_blank" rel="noopener noreferrer">
                                            <img src={iosBadgeUrl} alt={t('mobile.alt.app store icon button')} />
                                        </a>
                                    </div>
                                    <div className="storeCta playStore" onClick={() => clickAppStoreButton(true)}>
                                        <a href={playStoreLink} target="_blank" rel="noopener noreferrer">
                                            <img src={androidBadgeUrl} alt={t('mobile.alt.google play icon button')} />
                                        </a>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="heroImage">
                        <div className="qrCode">
                            <QRCode size={220} value={qrLink} />
                            <div className="scan">{t('mobile.scan to start')}</div>
                        </div>
                    </div>
                </div>
            </Theatre>
        </Modal>
    )
}

export default AppDownloadQRModal
