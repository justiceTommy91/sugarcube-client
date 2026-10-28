import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Showroom } from 'models/showrooms'
import { useExperiments } from 'hooks/useExperiments'
import {
    DINING_ROOM,
    LIVING_ROOM,
    BEDROOM,
    OFFICE,
    EMPTY,
    UNKNOWN_ROOMTYPE,
    OTHER_ROOMTYPE,
    GENERIC_ROOMTYPE,
    DORM_ROOM,
    CHILDREN_ROOM,
    FurnishingType,
} from 'models/scenes/constants'
import Button from '@ingka/button'
import SSRIcon from '@ingka/ssr-icon'

import paintbrush from '@ingka/ssr-icon/paths/paintbrush'
import chevronUp from '@ingka/ssr-icon/paths/chevron-up'
import chevronDown from '@ingka/ssr-icon/paths/chevron-down'
import table from '@ingka/ssr-icon/paths/table'
import playArea from '@ingka/ssr-icon/paths/play-area'
import { click } from 'utils/tracker'
import type { RoomType } from 'models/scenes/constants'
import { useTranslation } from 'react-i18next'
import Toggle from '@ingka/toggle'
import {
    FILTER_TYPE_ALL,
    FILTER_TYPE_EMPTY,
    FILTER_TYPE_FURNISHED,
    FILTER_TYPE_OTHER,
    FILTER_TYPE_SEMI_FURNISHED,
} from 'models/showrooms/constants'
import classNames from 'classnames'

import cutlery from '@ingka/ssr-icon/paths/cutlery'
import sofa from '@ingka/ssr-icon/paths/sofa'
import laptop from '@ingka/ssr-icon/paths/laptop'
import bed from '@ingka/ssr-icon/paths/bed'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import { Link } from 'gatsby'
import { ROOM_SOURCE_STOCK, ROOM_VIEW_TYPE_MULTI, TRACK_LOCATION_DASHBOARD } from 'models/tracking/constants'
import { useAppSelector, useScrollTracking, useWindowSize } from 'hooks'
import { buildRoomUrlWithParamsAndHash } from 'models/compositions/utils'
import {
    getShowroomFurnishingTypeFilter,
    getShowroomsAlternateAB,
    getShowroomsAlternateABV2,
} from 'models/showrooms/selectors'
import {
    USER_SCROLLED_PAST_EMPTY_SHOWROOMS,
    USER_SCROLLED_PAST_FURNISHED_SHOWROOMS,
} from 'models/sessionStorage/constants'
import { getSubCatalog } from 'models/location/selectors'
import { getContextFromReferrer } from 'models/referrer/selector'

import * as tracker from 'utils/tracker'
import { Page } from 'constants/pages'
import { DashboardRoom } from 'models/compositions'
import ThumbnailInfo from './ThumbnailInfo'

require('./Showrooms.scss')

const TRACKING_EMPTY_SHOWROOMS_SECTION = 'EmptyShowrooms'
const TRACKING_FURNISHED_SHOWROOMS_SECTION = 'FurnishedShowrooms'

const getMaxShowroomsDisplayed = (width: number) => {
    if (width < 899) {
        return { unfurnished: 2 * 2, designed: 2 * 3 }
    }
    if (width < 1200) {
        return { unfurnished: 3 * 2, designed: 3 * 3 }
    }
    return { unfurnished: 4 * 2, designed: 4 * 3 }
}

export interface ShowroomsProps {
    unfilteredShowroomItems?: Showroom[]
    showroomsItems: Showroom[]
    unfurnishedItems: Showroom[]
    openRoom: (room: DashboardRoom) => void
    showroomFilter: string
    filterShowrooms: (roomType: string, furnishType?: string) => void
    showroomFilters: RoomType[]
    filterFurnishingType: (furnishingType: string) => void
}

const showroomIcons = {
    [DINING_ROOM]: cutlery,
    [LIVING_ROOM]: sofa,
    [OFFICE]: laptop,
    [BEDROOM]: bed,
    [EMPTY]: playArea,
    [UNKNOWN_ROOMTYPE]: undefined,
    [OTHER_ROOMTYPE]: undefined,
    [GENERIC_ROOMTYPE]: playArea,
    [DORM_ROOM]: table,
    [CHILDREN_ROOM]: playArea,
    [FILTER_TYPE_SEMI_FURNISHED]: undefined,
    [FILTER_TYPE_FURNISHED]: undefined,
}

const Showrooms = (props: ShowroomsProps) => {
    const {
        showroomsItems,
        unfurnishedItems,
        openRoom,
        showroomFilter,
        filterShowrooms,
        showroomFilters,
        filterFurnishingType,
        unfilteredShowroomItems,
    } = props

    const { t } = useTranslation('dashboard')
    const { variations } = useExperiments()
    const { width } = useWindowSize()
    const { unfurnished: maxUnfurnished, designed: maxDesigned } = getMaxShowroomsDisplayed(width)
    const emptyRoomsRef = useRef<HTMLDivElement | null>(null)
    const furnishedRoomsRef = useRef<HTMLDivElement | null>(null)

    useScrollTracking(
        emptyRoomsRef,
        USER_SCROLLED_PAST_EMPTY_SHOWROOMS,
        TRACKING_EMPTY_SHOWROOMS_SECTION,
        TRACK_LOCATION_DASHBOARD,
    )
    useScrollTracking(
        furnishedRoomsRef,
        USER_SCROLLED_PAST_FURNISHED_SHOWROOMS,
        TRACKING_FURNISHED_SHOWROOMS_SECTION,
        TRACK_LOCATION_DASHBOARD,
        0.3,
    )

    const selectedFurnishedType = useAppSelector(getShowroomFurnishingTypeFilter)
    const [viewAll, setViewAll] = useState({ unfurnished: false, designed: false, allItems: false })

    const designedItems = showroomsItems.filter((room) => room.furnishingType === selectedFurnishedType)

    const hasDesignedOverflow = designedItems?.length > maxDesigned
    const hasUnfurnishedOverflow = unfurnishedItems?.length > maxUnfurnished

    const handleItemsToDisplay = (items: Showroom[], expanded: boolean, maxItems: number) =>
        items?.slice(0, expanded ? items.length : maxItems)

    const alternateUnfurnishedItems = useAppSelector(getShowroomsAlternateAB)
    const alternateUnfurnishedItemsV2 = useAppSelector(getShowroomsAlternateABV2)

    const displayedUnfurnishedItems = useMemo(() => {
        if (variations.ShowroomAB === 'alternate_showrooms') {
            return alternateUnfurnishedItems
        }
        if (variations.ShowroomAB === 'alternate_showrooms_v2') {
            return alternateUnfurnishedItemsV2
        }
        return handleItemsToDisplay(unfurnishedItems, viewAll.unfurnished, maxUnfurnished)
    }, [
        unfurnishedItems,
        viewAll.unfurnished,
        maxUnfurnished,
        variations.ShowroomAB,
        alternateUnfurnishedItems,
        alternateUnfurnishedItemsV2,
    ])

    const displayedDesignedItems = handleItemsToDisplay(designedItems, viewAll.designed, maxDesigned)

    const displayedShowroomItems = displayedDesignedItems

    const wasTrackedRef = useRef(false)
    useEffect(() => {
        // Ensure we only track the first time data loads as TTI.
        if (wasTrackedRef.current) {
            return
        }
        if (displayedShowroomItems.length > 0) {
            tracker.pageInteractive(Page.DASHBOARD)
            wasTrackedRef.current = true
        }
    }, [displayedShowroomItems.length])

    const onViewAllDesignedShowroomClick = () => {
        click('Dashboard.ShowroomsExpandAllDesigned', { Expanded: !viewAll.designed })
        setViewAll((prev) => ({ ...prev, designed: !viewAll.designed }))
    }

    const onViewAllUnfurnishedClick = () => {
        click('Dashboard.ShowroomsExpandAllUnfurnished', { Expanded: !viewAll.unfurnished })
        setViewAll((prev) => ({ ...prev, unfurnished: !viewAll.unfurnished }))
    }

    const formatFilterName = (filterName: RoomType) => {
        if (filterName === FILTER_TYPE_FURNISHED.toLocaleLowerCase()) {
            return t('dashboard.filter.FULLY_FURNISHED')
        }
        if (filterName === FILTER_TYPE_SEMI_FURNISHED.toLocaleLowerCase()) {
            return t('dashboard.filter.PARTLY_FURNISHED')
        }
        if (filterName === FILTER_TYPE_EMPTY.toLocaleLowerCase()) {
            return t('dashboard.filter.GENERIC')
        }
        if (filterName === FILTER_TYPE_OTHER.toLocaleLowerCase() || filterName === OTHER_ROOMTYPE) {
            return t('dashboard.filter.OTHER_ROOMTYPE')
        }

        if (filterName === FILTER_TYPE_FURNISHED.toLocaleLowerCase()) {
            return t('dashboard.filter.FULLY_FURNISHED')
        }

        if (filterName === EMPTY) {
            return t('dashboard.filter.UNFURNISHED')
        }

        return t(`dashboard.filter.${filterName}`).split('_').join(' ').toLowerCase()
    }

    const isRoomTypeDisabled = (roomType: RoomType) =>
        !unfilteredShowroomItems
            ?.filter((room) => room.furnishingType === selectedFurnishedType)
            .some((room) => room.roomType === roomType)

    const isDesignedRoomsFurnishFilterDisabled = (furnishType: FurnishingType) => {
        if (showroomFilter === 'all') return false
        return !unfilteredShowroomItems?.some(
            (room) => room.furnishingType === furnishType && room.roomType === showroomFilter,
        )
    }

    const onFilterButtonClick = (filterType: string) => {
        click('Dashboard.ShowroomFilterClick', { SelectedFilter: filterType })
        filterShowrooms(filterType)
    }

    const roomViewType = ROOM_VIEW_TYPE_MULTI // Assume that all showrooms are multiview

    const isContextualCard = useAppSelector(getContextFromReferrer)

    const isUserBucketedInShowroomAB =
        variations.ShowroomAB === 'alternate_showrooms' ||
        variations.ShowroomAB === 'alternate_showrooms_v2' ||
        variations.ShowroomAB === 'disabled'

    return (
        <div className="Showrooms">
            <h2 className={classNames('roomsTitle', { isContextual: isContextualCard })} id="EmptyShowroomsTitle">
                {t('dashboard.empty rooms')}
            </h2>
            <div className={classNames('showroomsContainer', { isUserBucketedInShowroomAB })} ref={emptyRoomsRef}>
                {!displayedUnfurnishedItems?.length && <BouncingBallLoader />}
                {displayedUnfurnishedItems?.map((showroomItem: Showroom) => {
                    const { name, roomShape, roomSize, composition, scene, subCatalog } = showroomItem
                    const paramSubcatalog = getSubCatalog()
                    const roomSubcatalog = subCatalog ?? paramSubcatalog
                    return (
                        <Link
                            to={buildRoomUrlWithParamsAndHash({
                                compositionId: composition,
                                sceneId: scene,
                                subCatalog: roomSubcatalog,
                                roomType: showroomItem.roomType?.toLowerCase(),
                            })}
                            onClick={(event) => {
                                event.preventDefault()
                                openRoom({
                                    sceneName: showroomItem.name,
                                    roomSource: ROOM_SOURCE_STOCK,
                                    sceneId: showroomItem.scene,
                                    compositionId: showroomItem.composition,
                                    furnishingType: showroomItem.furnishingType,
                                    roomViewType,
                                    subCatalog: roomSubcatalog,
                                    roomType: showroomItem.roomType?.toLowerCase(),
                                })
                            }}
                            key={showroomItem.id}
                            className="roomThumbnail"
                        >
                            <div className="roomInnerThumbnail">
                                <div className="roomImage">
                                    <img src={showroomItem.images[0]} alt={showroomItem.name} />
                                    <div className="overlay">
                                        <p className="cardText">
                                            <span>
                                                <SSRIcon paths={paintbrush} className="roomIcon" />
                                            </span>
                                            {t('dashboard.design this room', { ns: 'dashboard' })}
                                        </p>
                                    </div>
                                </div>

                                <div className={classNames('roomDescription', { roomShape })}>
                                    {roomShape ? (
                                        <ThumbnailInfo name={name} shape={roomShape} size={roomSize} />
                                    ) : (
                                        <p>{name}</p>
                                    )}
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>

            {hasUnfurnishedOverflow && (
                <div className="viewAllContainer">
                    <Button
                        onClick={onViewAllUnfurnishedClick}
                        className="viewAllButton"
                        type="primary"
                        text={
                            viewAll.unfurnished
                                ? t('dashboard.view less')
                                : t('dashboard.view more', { quantity: unfurnishedItems.length - maxUnfurnished })
                        }
                        ssrIcon={viewAll.unfurnished ? chevronUp : chevronDown}
                        iconPosition="leading"
                    />
                </div>
            )}

            <div className="showroomFilters" id="furnishedrooms">
                <h2 className={classNames('roomsTitle', { isContextual: isContextualCard })}>
                    {t('dashboard.furnished rooms')}
                </h2>

                <div className="roomTypes filterFurnishType">
                    <div className="roomFilterBlock">
                        <button
                            className={classNames(
                                'filterButton',
                                showroomFilter === FILTER_TYPE_ALL ? 'selected' : null,
                            )}
                            onClick={() => onFilterButtonClick(FILTER_TYPE_ALL)}
                        >
                            {t(`dashboard.${FILTER_TYPE_ALL}`)}
                        </button>
                        {showroomFilters
                            .filter((roomType) => roomType !== GENERIC_ROOMTYPE)
                            .map((roomType) => (
                                <button
                                    key={roomType}
                                    className={classNames(
                                        'filterButton',
                                        showroomFilter.toUpperCase() === roomType ? 'selected' : null,
                                        isRoomTypeDisabled(roomType) ? 'disabled' : 'enabled',
                                    )}
                                    onClick={() => {
                                        onFilterButtonClick(roomType.toLocaleLowerCase())
                                        filterFurnishingType(selectedFurnishedType)
                                    }}
                                    disabled={isRoomTypeDisabled(roomType)}
                                >
                                    <SSRIcon
                                        className={classNames('showroomIcon', roomType)}
                                        paths={showroomIcons[roomType]}
                                    />
                                    <p>{formatFilterName(roomType)}</p>
                                </button>
                            ))}
                    </div>
                    <div className="roomFilterBlock furnishTypes">
                        <Toggle
                            buttons={[
                                {
                                    text: formatFilterName(FILTER_TYPE_FURNISHED),
                                    disabled: isDesignedRoomsFurnishFilterDisabled(FILTER_TYPE_FURNISHED),
                                },
                                {
                                    text: formatFilterName(FILTER_TYPE_SEMI_FURNISHED),
                                    disabled: isDesignedRoomsFurnishFilterDisabled(FILTER_TYPE_SEMI_FURNISHED),
                                },
                            ]}
                            onClick={(_args, index) => {
                                const toggleFurnishType = index ? FILTER_TYPE_SEMI_FURNISHED : FILTER_TYPE_FURNISHED
                                filterFurnishingType(toggleFurnishType)
                            }}
                            activeIndex={selectedFurnishedType === FILTER_TYPE_SEMI_FURNISHED ? 1 : 0}
                        />
                    </div>
                </div>
            </div>

            <div className="showroomsContainer" ref={furnishedRoomsRef}>
                {!displayedShowroomItems.length && <BouncingBallLoader />}
                {displayedShowroomItems.map((showroomItem: Showroom) => {
                    const { name, scene, composition, images, roomShape, roomSize, furnishingType, subCatalog } =
                        showroomItem
                    const paramSubcatalog = getSubCatalog()
                    const roomSubcatalog = subCatalog ?? paramSubcatalog
                    return (
                        <Link
                            to={buildRoomUrlWithParamsAndHash({
                                compositionId: composition,
                                sceneId: scene,
                                subCatalog: roomSubcatalog,
                                roomType: showroomItem.roomType?.toLowerCase(),
                            })}
                            onClick={(event) => {
                                event.preventDefault()
                                openRoom({
                                    sceneName: name,
                                    sceneId: scene,
                                    roomSource: ROOM_SOURCE_STOCK,
                                    compositionId: composition,
                                    furnishingType,
                                    roomViewType,
                                    subCatalog: roomSubcatalog,
                                    roomType: showroomItem.roomType?.toLowerCase(),
                                })
                            }}
                            key={showroomItem.id}
                            className="roomThumbnail"
                        >
                            <div className="roomInnerThumbnail">
                                <div className="roomImage">
                                    <img src={images[0]} alt={name} />
                                    <div className="overlay">
                                        <p className="cardText">
                                            <span>
                                                <SSRIcon paths={paintbrush} className="roomIcon" />
                                            </span>
                                            {t('dashboard.design this room', { ns: 'dashboard' })}
                                        </p>
                                    </div>
                                </div>

                                <div className={classNames('roomDescription', { roomShape })}>
                                    {roomShape ? (
                                        <ThumbnailInfo name={name} shape={roomShape} size={roomSize} />
                                    ) : (
                                        <p>{name}</p>
                                    )}
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>
            {hasDesignedOverflow && (
                <div className="viewAllContainer">
                    <Button
                        onClick={onViewAllDesignedShowroomClick}
                        className="viewAllButton"
                        type="primary"
                        text={
                            viewAll.designed
                                ? t('dashboard.view less')
                                : t('dashboard.view more', { quantity: designedItems.length - maxDesigned })
                        }
                        ssrIcon={viewAll.designed ? chevronUp : chevronDown}
                        iconPosition="leading"
                    />
                </div>
            )}
        </div>
    )
}

export default Showrooms
