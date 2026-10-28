import React from 'react'
import { Link, withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import paintbrush from '@ingka/ssr-icon/paths/paintbrush'
import SSRIcon from '@ingka/ssr-icon'
import Carousel from '@ingka/carousel'
import Button from '@ingka/button'
import camera from '@ingka/ssr-icon/paths/camera'

import { useAppSelector } from 'hooks'
import { toPairs } from 'utils/array'
import { openComposition as openCompositionAction } from 'models/compositions/actions'
import AppDownloadQRModal from 'components/AppDownloadQRModal'
import type { ProductData } from 'models/furniture'
import { trackGaEvent as trackGaEventAction } from 'models/tracking/actions'
import { getShowrooms } from 'models/showrooms/selectors'
import { TAGS } from 'models/showrooms/constants'
import {
    GA_LABEL_PIP_CONTEXT,
    ACCESS_FROM_SCAN_SPACE,
    GA_ACTION_CHOOSE_ROOM_CAROUSEL_PREV,
    GA_ACTION_CHOOSE_ROOM_CAROUSEL_NEXT,
    GA_ACTION_CHOOSE_ROOM_GET_APP,
    GA_ACTION_CHOOSE_ROOM_OPEN_ROOM,
    ROOM_SOURCE_STOCK,
    APP_STORE_SOURCE_WEB_CHOOSE_ROOM,
} from 'models/tracking/constants'
import { buildRoomUrlWithParamsAndHash } from 'models/compositions/utils'
import { click } from 'utils/tracker'

import './styles.scss'

interface ChooseRoomProps {
    productName: string
    openComposition: typeof openCompositionAction
    setShowAppDownloadModal: (show: boolean) => void
    placedProductData: ProductData
    isLoading: boolean
    trackGaEvent: typeof trackGaEventAction
    productLocalItemNo?: string
    roomType?: string
}

const ChooseRoom = (props: ChooseRoomProps) => {
    const { t } = useTranslation()
    const {
        productName,
        openComposition,
        setShowAppDownloadModal,
        placedProductData,
        isLoading,
        trackGaEvent,
        productLocalItemNo,
        roomType,
    } = props

    const showroomColumns = toPairs(
        useAppSelector(getShowrooms).filter((showroom) => showroom.tags.includes(TAGS.CHOOSEROOM)),
    )

    const name = productName.toUpperCase() || t('chooseRoom.this product')
    const onBtnLeftClick = () => {
        const trackingInfo = {
            action: GA_ACTION_CHOOSE_ROOM_CAROUSEL_PREV,
            label: `${GA_LABEL_PIP_CONTEXT}|${roomType || null}|${productLocalItemNo || null}`,
        }
        trackGaEvent(trackingInfo)
        click('ChooseRoom.RoomCarouselPrev', {
            ProductLocalItemNo: productLocalItemNo || null,
            ProductId: placedProductData?.id || null,
            Context: GA_LABEL_PIP_CONTEXT,
        })
    }

    const onBtnRightClick = () => {
        const trackingInfo = {
            action: GA_ACTION_CHOOSE_ROOM_CAROUSEL_NEXT,
            label: `${GA_LABEL_PIP_CONTEXT}|${roomType || null}|${productLocalItemNo || null}`,
        }
        trackGaEvent(trackingInfo)
        click('ChooseRoom.RoomCarouselNext', {
            ProductLocalItemNo: productLocalItemNo || null,
            ProductId: placedProductData?.id || null,
            Context: GA_LABEL_PIP_CONTEXT,
        })
    }

    const onGetAppClick = () => {
        const trackingInfo = {
            action: GA_ACTION_CHOOSE_ROOM_GET_APP,
            label: `${GA_LABEL_PIP_CONTEXT}|${roomType || null}|${productLocalItemNo || null}`,
        }
        trackGaEvent(trackingInfo)
        click('ChooseRoom.GetIkeaApp', {
            ProductLocalItemNo: productLocalItemNo || null,
            ProductId: placedProductData?.id || null,
            Context: GA_LABEL_PIP_CONTEXT,
            AccessFrom: ACCESS_FROM_SCAN_SPACE,
        })

        setShowAppDownloadModal(true)
    }

    return (
        <div className="ChooseRoom">
            <div className="brandName">
                <SSRIcon className="paintBrushIcon" paths={paintbrush} />
                {t('design.ikea kreativ')}
            </div>
            <div className="headerContainer">
                <div>
                    <div className="header">
                        {t('chooseRoom.try in an interactive showroom', { name, ns: 'translation' })}
                    </div>
                    <div className="subheader">{t('chooseRoom.choose room type', { name, ns: 'translation' })}</div>
                </div>
                {placedProductData?.thumbUrl && (
                    <div>
                        <img
                            className="productImage"
                            src={placedProductData?.thumbUrl}
                            alt={t('chooseRoom.alt.product image', { ns: 'translation' })}
                        />
                    </div>
                )}
            </div>

            <div className="showroomsContainer">
                <Carousel
                    id="choose-room-carousel"
                    className="showroomsCards"
                    controlBtnType="primary"
                    hasNoScrollbar
                    itemClass="showroomsItem"
                    onBtnRightClick={onBtnRightClick}
                    onBtnLeftClick={onBtnLeftClick}
                >
                    {showroomColumns.map((column, columnIndex) => (
                        <div key={`${column[0].composition}`} className="showroomsItem">
                            {column.map((showroom, showroomRowIndex) => {
                                const { composition, name: showroomName, images, scene, subCatalog } = showroom

                                return (
                                    <Link
                                        to={buildRoomUrlWithParamsAndHash({
                                            compositionId: composition,
                                            sceneId: scene,
                                            subCatalog,
                                        })}
                                        className={classNames('showroomCard', {
                                            top: showroomRowIndex === 0,
                                            isLoading,
                                        })}
                                        key={composition}
                                        onClick={(event) => {
                                            event.preventDefault()
                                            const trackingInfo = {
                                                DesignName: showroomName,
                                                DesignId: composition,
                                                RoomTitle: null,
                                                RoomId: scene,
                                                RoomSource: ROOM_SOURCE_STOCK,
                                                Context: GA_LABEL_PIP_CONTEXT,
                                            }
                                            click('ChooseRoom.OpenRoom', trackingInfo)
                                            const gaLabel = `${GA_LABEL_PIP_CONTEXT}|${
                                                productLocalItemNo || null
                                            }|${columnIndex}:${showroomRowIndex}|${roomType || null}|${
                                                showroomName || null
                                            }|${composition}:${scene}`
                                            const gaTrackingInfo = {
                                                action: GA_ACTION_CHOOSE_ROOM_OPEN_ROOM,
                                                label: gaLabel,
                                            }
                                            trackGaEvent(gaTrackingInfo)
                                            openComposition(composition, trackingInfo, { subCatalog, sceneId: scene })
                                        }}
                                    >
                                        <div className="showroomCardInner">
                                            <div className="roomImage">
                                                <img src={images[0]} alt={showroomName} />
                                                <div className="overlay">
                                                    <SSRIcon paths={paintbrush} className="roomIcon" />
                                                    {t('dashboard.design this room', { ns: 'dashboard' })}
                                                </div>
                                            </div>
                                            <div className="roomDescription">
                                                <p>{showroomName}</p>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    ))}
                </Carousel>
            </div>
            <div className="designInAppContainer">
                <div className="designInAppText">
                    <div className="header">{t('chooseRoom.try in your space', { name, ns: 'translation' })}</div>
                    <div className="subheader">{t('chooseRoom.use the ikea app', { ns: 'translation' })}</div>
                </div>
                <div className="designInAppImageContainer">
                    <Button
                        type="image-overlay"
                        text={t('chooseRoom.design in ikea app', { ns: 'translation' })}
                        ssrIcon={camera}
                        onClick={onGetAppClick}
                        className="designInAppButton"
                    />
                    <img
                        src={withPrefix('/images/graphics/designInApp.jpg')}
                        alt={t('chooseRoom.design in ikea app', { ns: 'translation' })}
                        className="designInAppImage"
                    />
                </div>
            </div>
            <AppDownloadQRModal source={APP_STORE_SOURCE_WEB_CHOOSE_ROOM} />
        </div>
    )
}

export default ChooseRoom
