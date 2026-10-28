import React from 'react'
import { useTranslation } from 'react-i18next'
import paintbrush from '@ingka/ssr-icon/paths/paintbrush'

import SSRIcon from '@ingka/ssr-icon'
import AppDownloadQRModal from 'components/AppDownloadQRModal'
import { openComposition as openCompositionAction } from 'models/compositions/actions'
import { trackGaEvent as trackGaEventAction } from 'models/tracking/actions'
import { toPairs } from 'utils/array'
import Pill from '@ingka/pill'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right'
import Carousel from '@ingka/carousel'
import { Link, withPrefix } from 'gatsby'
import { click } from 'utils/tracker'
import { ProductData } from 'models/furniture'
import classNames from 'classnames'
import { getDesignLabUrl } from 'models/location/selectors'

import {
    ACCESS_FROM_SEARCH_BROWSE,
    APP_STORE_SOURCE_WEB_SEARCH_BROWSE,
    GA_ACTION_SEARCH_BROWSE_GET_APP,
    GA_ACTION_SEARCH_BROWSE_OPEN_ROOM,
    GA_ACTION_SEARCH_BROWSE_SHOWROOM,
    GA_LABEL_SEARCH_BROWSE_CONTEXT,
    ROOM_SOURCE_STOCK,
} from 'models/tracking/constants'
import { SearchBrowseCategories } from 'containers/searchBrowse/types'
import { Showroom } from 'models/showrooms'
import { buildRoomUrlWithParamsAndHash } from 'models/compositions/utils'
import { NewSearchBrowseItem } from './constants'
import { OwnSpaceCard } from './OwnSpaceCard'

import './styles.scss'

interface SearchBrowseProps {
    setShowAppDownloadModal: (show: boolean) => void
    trackGaEvent: typeof trackGaEventAction
    onSceneOpen: (id: string) => void
    item: NewSearchBrowseItem
    homeUrl?: string
    openComposition: typeof openCompositionAction
    placedProductData: ProductData
    productLocalItemNo: string
    loading?: boolean
}

const SearchBrowse = (props: SearchBrowseProps) => {
    const { t } = useTranslation()
    const {
        setShowAppDownloadModal,
        onSceneOpen,
        openComposition,
        item,
        homeUrl,
        trackGaEvent,
        placedProductData,
        productLocalItemNo,
        loading,
    } = props

    const eventKeyName = `SearchBrowse`

    const onOpenRoom = (showroom: Showroom, columnIndex: number, rowIndex: number) => {
        const { scene, composition, name, subCatalog, roomType } = showroom

        const trackingInfo = {
            RoomId: scene,
            DesignId: composition,
            DesignName: name,
            ColumnIndex: columnIndex,
            RowIndex: rowIndex,
            RoomType: roomType.toString() || null,
            RoomSource: ROOM_SOURCE_STOCK,
        }

        click(`${eventKeyName}.OpenRoom`, trackingInfo)

        trackGaEvent({
            action: GA_ACTION_SEARCH_BROWSE_OPEN_ROOM,
            label: `${columnIndex}:${rowIndex}|${roomType}|${name}|${composition}:${scene}`,
        })

        if (composition) {
            openComposition(composition, trackingInfo, { sceneId: scene, subCatalog })
        } else {
            onSceneOpen(scene)
        }
    }

    const showrooms = toPairs(item?.showrooms || [])

    const toCategory = (categoryName?: SearchBrowseCategories) => {
        if (!categoryName) {
            return t(`searchBrowse.category.items`)
        }

        return t(`searchBrowse.category.${categoryName}`)
    }

    const openShowAppDownloadModal = () => {
        const trackingInfo = {
            action: GA_ACTION_SEARCH_BROWSE_GET_APP,
            label: `${GA_LABEL_SEARCH_BROWSE_CONTEXT}|${productLocalItemNo || null}`,
        }
        trackGaEvent(trackingInfo)
        click(`${eventKeyName}.GetIkeaApp`, {
            ProductLocalItemNo: productLocalItemNo || null,
            ProductId: placedProductData?.id || null,
            Context: GA_LABEL_SEARCH_BROWSE_CONTEXT,
        })

        setShowAppDownloadModal(true)
    }

    const showroomsUrl = `${getDesignLabUrl()}#showrooms`
    const onShowroomButtonClick = () => {
        click(`${eventKeyName}.MoreRooms`)
        trackGaEvent({
            action: GA_ACTION_SEARCH_BROWSE_SHOWROOM,
            label: ACCESS_FROM_SEARCH_BROWSE,
        })
    }

    return (
        <div className="SearchBrowse">
            <div className="brandName">
                <a href={homeUrl}>
                    <SSRIcon className="paintBrushIcon" paths={paintbrush} />
                    <span className="label">{t('design.ikea kreativ')}</span>
                </a>
            </div>

            {!loading && (
                <div className="headerContainer">
                    <div className="info">
                        <div className="header">
                            {t('searchBrowse.see in kreativ space', {
                                category: toCategory(item?.categoryName),
                            })}
                        </div>
                        <div className="subheader">{t('searchBrowse.quickly add move and change')}</div>
                    </div>
                    {item?.images?.length ? (
                        <div className="images">
                            {item.images.map((image) => (
                                <img
                                    className="productImage"
                                    src={withPrefix(image)}
                                    alt={t('chooseRoom.alt.product image', { ns: 'translation' })}
                                />
                            ))}
                        </div>
                    ) : null}
                </div>
            )}
            <div className="showroomsContainer">
                <Carousel
                    id="search-browse-showrooms"
                    className="showroomsCards"
                    hasNoScrollbar
                    itemClass="showroomsItem"
                >
                    {showrooms.map((column, columnIndex) => (
                        <div key={`${column[0].composition}`} className="showroomsItem">
                            {column.map((showroom, showroomRowIndex) => {
                                const { composition, name: showroomName, scene, subCatalog, images } = showroom
                                return (
                                    <Link
                                        to={buildRoomUrlWithParamsAndHash({
                                            compositionId: composition,
                                            sceneId: scene,
                                            subCatalog,
                                        })}
                                        className={classNames('showroomCard', {
                                            top: showroomRowIndex === 0,
                                            isLoading: loading,
                                        })}
                                        key={composition}
                                        onClick={() => {
                                            onOpenRoom(showroom, columnIndex, showroomRowIndex)
                                        }}
                                        aria-label={`open scene ${showroomName}`}
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

            {!loading && (
                <Link className="moreRooms" to={showroomsUrl}>
                    <Pill
                        label={t('searchBrowse.more rooms')}
                        trailingIcon={arrowRight}
                        onClick={onShowroomButtonClick}
                    />
                </Link>
            )}

            <OwnSpaceCard openAppDownload={openShowAppDownloadModal} loading={loading} />
            <AppDownloadQRModal source={APP_STORE_SOURCE_WEB_SEARCH_BROWSE} />
        </div>
    )
}

export default SearchBrowse
