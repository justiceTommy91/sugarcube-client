/* eslint-disable jsx-a11y/media-has-caption */
import { Link } from 'gatsby'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'

import AppDownloadQRModal from 'components/AppDownloadQRModal'
import AuthMessageContainer from 'containers/dashboard/AuthMessageContainer'
import type { Showroom } from 'models/showrooms'
import { click, trackGoogleAnalytics } from 'utils/tracker'

import type { CompositionDataItem, DashboardRoom, RoomGroup } from 'models/compositions'
import { copyComposition, type openComposition } from 'models/compositions/actions'
import { getHash } from 'models/location/selectors'
import type { Scene } from 'models/scenes'
import { RoomType } from 'models/scenes/constants'
import { GATrackingInfoProps } from 'models/tracking'
import {
    APP_STORE_SOURCE_WEB_DASHBOARD,
    GA_ACTION_OPEN_ROOM,
    GA_ACTION_ROOM_BUILDER_OPEN_MODAL,
    GA_CATEGORY_DESIGN_LAB,
    GA_CATEGORY_DYH_SUGARCUBE,
    TRACK_LOCATION_DASHBOARD,
    ROOM_BUILDER_MODE_CREATE,
} from 'models/tracking/constants'
import { useAppDispatch, useAppSelector, useScrollTracking, useScenePolling, useWindowSize } from 'hooks'
import { getIsCompositionDataLoadedRaw, getSortedCompositionsGroupedByScene } from 'models/compositions/selectors'
import { autoShowRoomBuilderModal, setDelete } from 'models/ui/actions'
import { DeletedType } from 'services/toasts'

import { getAreScenesDataLoaded, getHasProcessingScenes, getById as getScenesById } from 'models/scenes/selectors'
import { LOCALE_US_EN } from 'models/location/constants'
import { getSceneTypeLabel } from 'models/scenes/utils'

import { TRACK_CLONE_COMPOSITION } from 'models/compositions/constants'
import { USER_SCROLLED_PAST_MY_SCANS } from 'models/sessionStorage/constants'
import { getContextFromReferrer } from 'models/referrer/selector'
import { loadReferrerFromStorage } from 'models/referrer/slice'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { SLUG_TO_ROOM_TYPE, type RoomPlannerSlug } from 'constants/contexts'
import { requestRoomTypes } from 'models/roomTypes/actions'
import { getRoomTypes } from 'models/roomTypes/selectors'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'

import { getShouldAutoShowRoomBuilderModal } from 'models/ui/selectors'
import CompositionThumbnail from './CompositionThumbnail'
import DeleteConfirmationModal from './DeleteConfirmationModal'
import DesignsModal from './DesignsModal'
import Greeting from './Greeting'
import ScanMyRoomCTA from './ScanMyRoomCTA'
import Showrooms from './Showrooms'
import { BlogEntries } from './BlogEntries'
import { DetailsPlan } from './DetailsPlan'
import { ContextualCard } from './contextualCard'
import { formatReferrerContextForTracking } from './contextualCard/utils'
import { HeroV2 } from './HeroV2'
import UploadImageModal from './UploadImageModal'

require('./Dashboard.scss')

const TRACKING_MY_SCANS_SECTION = 'MyScans'

export type DashboardProps = {
    unfilteredShowroomItems: Showroom[]
    showroomsItems: Showroom[]
    unfurnishedShowroomItems: Showroom[]
    sceneItems: Scene[]
    compositionDataItems: CompositionDataItem[]
    isCompositionDataLoaded: boolean
    isLoggedIn: boolean
    hasValidAuthToken: boolean
    isUserLoaded: boolean
    userFirstName: string
    onSceneOpen: (id: string) => void
    openComposition: typeof openComposition
    showroomFilter: string
    hasSeenDashboard: boolean
    setSeenDashboard: () => void
    filterShowrooms: (roomType: string) => void
    trackGaEvent: (trackingInfo: GATrackingInfoProps) => void
    showroomFilters: RoomType[]
    selectScene: (id: string) => void
    filterFurnishingType: (furnishingType: string) => void
    setShowAppDownloadModal: (show: boolean) => void
    setShowDeleteModal: (show: boolean) => void
    isDeleteModalVisible: boolean
    isAdmin: boolean
    email: string
    uiStateLoaded: boolean
    posts?: Queries.BlogEntriesEdge[]
    fetchScenes: () => void
}

const Dashboard = (props: DashboardProps) => {
    const {
        compositionDataItems,
        isCompositionDataLoaded,
        showroomsItems,
        isLoggedIn,
        hasValidAuthToken,
        isUserLoaded,
        onSceneOpen,
        userFirstName,
        sceneItems,
        showroomFilter,
        hasSeenDashboard,
        setSeenDashboard,
        filterShowrooms,
        openComposition,
        trackGaEvent,
        showroomFilters,
        selectScene,
        filterFurnishingType,
        setShowAppDownloadModal,
        setShowDeleteModal,
        isDeleteModalVisible,
        isAdmin,
        email,
        uiStateLoaded,
        unfurnishedShowroomItems,
        unfilteredShowroomItems,
        fetchScenes,
        posts,
    } = props
    const [isDesignsModalOpen, setDesignsModalOpen] = useState(false)
    const [deleteRestoreFocusTo, setDeleteRestoreFocusTo] = useState<HTMLElement | null>(null)
    const [isExpanded, setIsExpanded] = useState(false)
    const thumbnailRefs = useRef<Map<string, HTMLElement>>(new Map())
    const groupedCompositions = useAppSelector(getSortedCompositionsGroupedByScene)

    const scenesById = useAppSelector(getScenesById)
    const isSceneDataLoaded = useAppSelector(
        (state) => getIsCompositionDataLoadedRaw(state) && getAreScenesDataLoaded(state),
    )
    const { t } = useTranslation('dashboard')
    const dispatch = useAppDispatch()
    const hasUserScenes = !!sceneItems.length
    const hasProcessingScenes = useAppSelector(getHasProcessingScenes)
    const shouldAutoShowRoomBuilderModal = useAppSelector(getShouldAutoShowRoomBuilderModal)
    const contextualState = useAppSelector(getContextFromReferrer)
    const roomTypes = useAppSelector(getRoomTypes)
    const { isRoomPlannerIntegration, roomPlannerSlug } = useSugarcubeContext()

    const myScanAndDesignsRef = useRef<HTMLDivElement | null>(null)

    // Poll scenes endpoint when there are processing scenes
    useScenePolling(fetchScenes, hasProcessingScenes, {
        interval: 10000, // 10 seconds
        enabled: isLoggedIn && isSceneDataLoaded,
        onlyWhenProcessing: true,
    })

    useScrollTracking(
        myScanAndDesignsRef,
        USER_SCROLLED_PAST_MY_SCANS,
        TRACKING_MY_SCANS_SECTION,
        TRACK_LOCATION_DASHBOARD,
    )

    const openRoom = ({
        sceneName,
        sceneId,
        roomSource,
        compositionId,
        furnishingType,
        roomViewType,
        subCatalog,
        roomType,
    }: DashboardRoom) => {
        // name is either the name of the scene or composition
        const trackingInfo = {
            RoomTitle: compositionId ? null : sceneName,
            RoomId: sceneId,
            // VOLTRONTODO add comp id/proper tracking
            RoomSource: roomSource,
            DesignName: compositionId ? sceneName : null,
            DesignId: compositionId || null,
            RoomViewType: roomViewType,
        }

        click('Dashboard.OpenRoom', trackingInfo)

        // GA label for open room event: composition id:scene id
        const gaLabel = `${compositionId || null}:${sceneId}|${roomSource}|${roomViewType}|${furnishingType || null}`
        trackGaEvent({
            category: GA_CATEGORY_DESIGN_LAB,
            action: GA_ACTION_OPEN_ROOM,
            label: gaLabel,
            custom: {
                ReferrerContext: formatReferrerContextForTracking(contextualState),
            },
        })

        if (compositionId) {
            openComposition(
                compositionId,
                { ...trackingInfo, DesignId: compositionId, DesignName: sceneName },
                { sceneId, subCatalog, roomType },
            )
        } else {
            onSceneOpen(sceneId)
        }
    }

    const handleAppDownloadModal = (toggleModal: boolean) => {
        setShowAppDownloadModal(toggleModal)
    }

    const handleDesignsModal = (toggleModal: boolean, sceneId: string, sceneName: string, room: RoomGroup) => {
        selectScene(sceneId)

        if (room.compositions.length) {
            setDesignsModalOpen(toggleModal)
        } else {
            openRoom({ sceneName, sceneId, roomSource: room.roomSource, roomViewType: room.roomViewType })
        }
    }

    const setDeleteType = (room: RoomGroup) => {
        const scene = scenesById[room.sceneId]
        const sceneTypeLabel = getSceneTypeLabel(scene?.sourceType)

        if (!room.compositions.length && room.canDeleteScene) {
            dispatch(setDelete(room.sceneId, DeletedType.SCENE_WITH_NO_COMPOSITIONS, sceneTypeLabel))
        } else if (room.canDeleteScene && room.compositions.length === 1) {
            // Scene with single design - show "Delete this design?" but delete both scene and composition
            const allIds = [room.sceneId, room.compositions[0].id]
            dispatch(setDelete(allIds, DeletedType.SCENE_WITH_SINGLE_COMPOSITION, sceneTypeLabel))
        } else if (room.canDeleteScene) {
            const allIds = [room.sceneId, ...room.compositions.map((comp) => comp.id)]
            dispatch(setDelete(allIds, DeletedType.SCENE_WITH_COMPOSITIONS, sceneTypeLabel))
        } else if (room.compositions.length > 1) {
            const allIds = room.compositions.map((comp) => comp.id)
            dispatch(setDelete(allIds, DeletedType.MULTIPLE_COMPOSITIONS, undefined))
        } else {
            dispatch(setDelete(room.compositions[0].id, DeletedType.SINGLE_COMPOSITION, undefined))
        }
    }

    const onCopyComposition = (
        compositionId: string,
        compositionName: string,
        compositionData: CompositionDataItem,
    ) => {
        const newName = compositionName
            ? t('dashboard.copy composition', { compositionName, ns: 'dashboard' })
            : undefined

        const trackingInfo = {
            SavedFrom: TRACK_LOCATION_DASHBOARD,
            SaveType: TRACK_CLONE_COMPOSITION,
        }

        dispatch(copyComposition(compositionId, newName, trackingInfo, compositionData))
    }

    useEffect(
        () => () => {
            if (!hasSeenDashboard) {
                setSeenDashboard()
            }
        },
        [hasSeenDashboard],
    )

    const scrollToShowroomItems = useCallback(() => {
        let hash = getHash()

        if (hash.startsWith('#')) {
            hash = hash.slice(1)
        }
        if (hash) {
            setTimeout(() => {
                const element = document.getElementById(hash)

                if (element) {
                    element.scrollIntoView({ block: 'start' })
                }
            }, 100)
        }
    }, [])

    useEffect(() => {
        if ((isUserLoaded || isCompositionDataLoaded) && showroomsItems.length) {
            scrollToShowroomItems()
        }
    }, [isUserLoaded, isCompositionDataLoaded, showroomsItems, scrollToShowroomItems])

    const isCompositionAndSceneDataLoaded = isCompositionDataLoaded && isSceneDataLoaded
    const isReturnUserWithManyProjects = isLoggedIn && isSceneDataLoaded && groupedCompositions.length >= 3

    const showMyScansAndDesigns =
        isCompositionAndSceneDataLoaded && (compositionDataItems.length || hasUserScenes) && uiStateLoaded

    const shouldDisplayHero =
        isUserLoaded && (!isLoggedIn || (isCompositionAndSceneDataLoaded && !isReturnUserWithManyProjects))

    const { width } = useWindowSize()
    const columnsPerRow = width >= 1200 ? 3 : width >= 768 ? 2 : 1
    const maxVisibleItems = columnsPerRow * 2
    const visibleCompositions = isExpanded ? groupedCompositions : groupedCompositions.slice(0, maxVisibleItems)
    const remainingCount = groupedCompositions.length - maxVisibleItems
    const showViewMoreButton = !isExpanded && remainingCount > 0

    const scrollToWaysToStart = useCallback(() => {
        const element = document.getElementById('value-prop')
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', inline: 'start' })
        }
    }, [])

    const isUSMarket = process.env.GATSBY_IKEA_MARKET === LOCALE_US_EN

    const onOpenPlanner = ({
        trackingInfo,
        gaLabel,
    }: { trackingInfo?: Record<string, unknown>; gaLabel?: string } = {}) => {
        click('RoomBuilder.OpenModal', {
            ...trackingInfo,
            RoomBuilderMode: ROOM_BUILDER_MODE_CREATE,
        })
        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_ROOM_BUILDER_OPEN_MODAL,
            label: gaLabel || '',
            custom: trackingInfo?.AccessFrom
                ? {
                      AccessFrom: trackingInfo?.AccessFrom as string,
                  }
                : undefined,
        })
    }

    useEffect(() => {
        if (shouldAutoShowRoomBuilderModal) {
            onOpenPlanner()
        }
        dispatch(autoShowRoomBuilderModal(false))
    }, [])

    useEffect(() => {
        // Load referrer from storage on mount, mainly when going back to the dashboard from design
        dispatch(loadReferrerFromStorage())
    }, [])

    // Pre-fetch room types when there's contextual UX state
    useEffect(() => {
        if (contextualState && roomTypes.length === 0) {
            dispatch(requestRoomTypes())
        }
    }, [dispatch, contextualState, roomTypes.length])

    // Auto-filter showrooms when entering from room planner redirect
    useEffect(() => {
        if (isRoomPlannerIntegration && roomPlannerSlug) {
            const roomType = SLUG_TO_ROOM_TYPE[roomPlannerSlug as RoomPlannerSlug]
            if (roomType) {
                filterShowrooms(roomType.toLowerCase())
            }
        }
    }, [isRoomPlannerIntegration, roomPlannerSlug, filterShowrooms])

    return (
        <div className="Dashboard">
            <Link to="/room/" />
            <div className="dashboardContainer">
                {!isUserLoaded ? (
                    <div className="thumbnailLoadingContainer">
                        <BouncingBallLoader />
                    </div>
                ) : (
                    shouldDisplayHero && <HeroV2 />
                )}
            </div>
            {!isLoggedIn && !contextualState && <ContextualCard onOpenPlanner={onOpenPlanner} />}
            <div className="dashboardContainer">
                {hasValidAuthToken && isReturnUserWithManyProjects && (
                    <Greeting userFirstName={userFirstName} onActionButtonClick={scrollToWaysToStart} />
                )}
                {isAdmin && (
                    <div className="adminInfo">
                        <p>{email || `no email`}</p>
                        <p>{process.env.GATSBY_BUILD_TAG}</p>
                    </div>
                )}
            </div>

            {!isLoggedIn && contextualState && <ContextualCard onOpenPlanner={onOpenPlanner} />}
            <div className="dashboardContainer">
                {isUserLoaded &&
                    (!isLoggedIn ? (
                        <AuthMessageContainer />
                    ) : !isSceneDataLoaded ? (
                        <div className="thumbnailLoadingContainer">
                            <BouncingBallLoader />
                        </div>
                    ) : (
                        showMyScansAndDesigns && (
                            <div className="customRoomsContainer">
                                <h2 className="customRoomsTitle">{t('dashboard.my scans and designs')}</h2>
                                <div className="thumbnailContainer">
                                    {visibleCompositions.map((group) => (
                                        <CompositionThumbnail
                                            key={group.id}
                                            ref={(el) => {
                                                if (el) {
                                                    thumbnailRefs.current.set(group.id, el)
                                                } else {
                                                    thumbnailRefs.current.delete(group.id)
                                                }
                                            }}
                                            name={group.name}
                                            thumbnail={group.thumbUrl}
                                            date={group.lastModifiedDate ? new Date(group.lastModifiedDate) : undefined}
                                            count={group.compositions.length}
                                            sceneState={group.sceneState}
                                            onClick={() => {
                                                const { name, sceneId } = group
                                                handleDesignsModal(true, sceneId, name, group)
                                            }}
                                            onCreateNewDesign={() =>
                                                openRoom({
                                                    sceneName: group.name,
                                                    sceneId: group.sceneId,
                                                    roomSource: group.roomSource,
                                                    roomViewType: group.roomViewType,
                                                })
                                            }
                                            onDeleteClick={() => {
                                                // Store reference to the thumbnail element for focus restoration
                                                const thumbnailElement = thumbnailRefs.current.get(group.id)
                                                setDeleteRestoreFocusTo(thumbnailElement || null)
                                                setShowDeleteModal(true)
                                                setDeleteType(group)
                                            }}
                                        />
                                    ))}
                                    {isSceneDataLoaded && !isReturnUserWithManyProjects && (
                                        <ScanMyRoomCTA handleAppDownloadModal={handleAppDownloadModal} />
                                    )}
                                </div>
                                {showViewMoreButton && (
                                    <div className="viewMoreContainer">
                                        <Button
                                            type="secondary"
                                            text={t('dashboard.view more', { quantity: remainingCount })}
                                            onClick={() => setIsExpanded(true)}
                                        />
                                    </div>
                                )}
                                {isExpanded && remainingCount > 0 && (
                                    <div className="viewMoreContainer">
                                        <Button
                                            type="secondary"
                                            text={t('dashboard.view less')}
                                            onClick={() => {
                                                setIsExpanded(false)
                                                const title = document.querySelector('.customRoomsTitle')
                                                if (title) {
                                                    title.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )
                    ))}
            </div>
            {isLoggedIn && <ContextualCard onOpenPlanner={onOpenPlanner} />}

            <div className="dashboardContainer">
                <div id="showrooms" className="roomsContainer" data-testid="dashboard-showrooms">
                    <Showrooms
                        showroomFilter={showroomFilter}
                        showroomsItems={showroomsItems}
                        unfurnishedItems={unfurnishedShowroomItems}
                        openRoom={openRoom}
                        filterShowrooms={filterShowrooms}
                        showroomFilters={showroomFilters}
                        filterFurnishingType={filterFurnishingType}
                        unfilteredShowroomItems={unfilteredShowroomItems}
                    />
                </div>
            </div>

            <div className="dashboardContainer">
                {isUSMarket && <BlogEntries posts={posts} />}
                <DetailsPlan />
            </div>

            <AppDownloadQRModal source={APP_STORE_SOURCE_WEB_DASHBOARD} />
            <UploadImageModal />
            <DesignsModal
                isDesignsModalOpen={isDesignsModalOpen}
                setDesignsModalOpen={setDesignsModalOpen}
                openRoom={openRoom}
                onCopyComposition={onCopyComposition}
            />
            <DeleteConfirmationModal
                isOpen={isDeleteModalVisible}
                setIsOpen={(isOpen) => {
                    setShowDeleteModal(isOpen)
                    // Clear the restore focus reference when modal closes
                    if (!isOpen) {
                        setDeleteRestoreFocusTo(null)
                    }
                }}
                restoreFocusTo={deleteRestoreFocusTo}
                onSuccessfulDelete={() => {
                    // Clear the restore focus since the element will be deleted
                    setDeleteRestoreFocusTo(null)
                    // Focus should go to the beginning of the scans list
                    setTimeout(() => {
                        const scansContainer = document.querySelector('.customRoomsContainer')
                        const firstFocusableInScans = scansContainer?.querySelector(
                            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
                        )
                        if (firstFocusableInScans) {
                            ;(firstFocusableInScans as HTMLElement).focus({ preventScroll: true })
                        } else {
                            // Fallback to the scans container itself
                            const scansTitle = document.querySelector('.customRoomsTitle')
                            if (scansTitle) {
                                ;(scansTitle as HTMLElement).focus({ preventScroll: true })
                            }
                        }
                    }, 50)
                }}
            />
        </div>
    )
}

export default Dashboard
