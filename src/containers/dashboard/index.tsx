import React, { useEffect } from 'react'
import { connect, ConnectedProps } from 'react-redux'
import { getUserSceneItems } from 'models/scenes/selectors'
import {
    getShowroomRoomTypeFilter,
    getFilteredShowrooms,
    getShowroomRoomTypeFilters,
    getUnfurnishedShowrooms,
    getShowrooms,
} from 'models/showrooms/selectors'

import { getIsCompositionDataLoadedRaw, getUserCompositionsData } from 'models/compositions/selectors'
import {
    openScene as openSceneAction,
    fetchScenes as fetchScenesAction,
    selectScene as selectSceneAction,
} from 'models/scenes/actions'
import {
    fetchShowrooms as fetchShowroomsAction,
    fetchAlternateShowrooms as fetchAlternateShowroomsAction,
    filterFurnishingType as filterFurnishingTypeAction,
    filterShowrooms as filterShowroomsAction,
} from 'models/showrooms/actions'
import {
    openComposition as openCompositionAction,
    fetchCompositions as fetchCompositionsAction,
} from 'models/compositions/actions'

import {
    getIsLoggedIn,
    getFirstName,
    getIsUserDataLoaded,
    getUserEmail,
    getIsAdmin,
    getHasValidAuthToken,
} from 'models/user/selectors'

import { trackGaEvent as trackGaEventAction } from 'models/tracking/actions'
import { GATrackingInfoProps } from 'models/tracking'
import Dashboard from 'components/dashboard'
import { RoomType } from 'models/scenes/constants'

import { RootState } from 'store'
import { getSeenDashboard, getUIStateLoaded, getShowDeleteModal } from 'models/ui/selectors'
import {
    setSeenDashboard as setSeenDashboardAction,
    showAppDownloadModal as showAppDownloadModalAction,
    showDeleteModal as showDeleteModalAction,
} from 'models/ui/actions'
import type { CompositionDataItem } from 'models/compositions'

import type { Scene } from 'models/scenes'
import type { Showroom } from 'models/showrooms'

export type DashboardContainerProps = PropsFromRedux & {
    unfilteredShowroomItems: Showroom[]
    filteredShowroomItems: Showroom[]
    sceneItems: Scene[]
    isLoggedIn: boolean
    hasValidAuthToken: boolean
    isUserLoaded: boolean
    userFirstName: string
    compositionDataItems: CompositionDataItem[]
    isCompositionDataLoaded: boolean
    fetchScenes: () => void
    fetchShowrooms: () => void
    openScene: (id: string) => void
    openComposition: typeof openCompositionAction
    fetchCompositions: () => void
    filterShowrooms: (type: string) => void
    showroomFilter: string
    hasSeenDashboard: boolean
    setSeenDashboard: () => void
    trackGaEvent: (trackingInfo: GATrackingInfoProps) => void
    showroomFilters: RoomType[]
    selectScene: (id: string) => void
    isAdmin: boolean
    email: string
    uiStateLoaded: boolean
    posts?: Queries.BlogEntriesEdge[]
}

const DashboardContainer = (props: DashboardContainerProps) => {
    const {
        isLoggedIn,
        hasValidAuthToken,
        isUserLoaded,
        filteredShowroomItems,
        unfurnishedShowroomItems,
        sceneItems,
        compositionDataItems,
        isCompositionDataLoaded,
        openScene,
        openComposition,
        fetchScenes,
        fetchShowrooms,
        fetchCompositions,
        filterShowrooms,
        userFirstName,
        showroomFilter,
        hasSeenDashboard,
        setSeenDashboard,
        trackGaEvent,
        showroomFilters,
        selectScene,
        filterFurnishingType,
        setShowAppDownloadModal,
        setShowDeleteModal,
        isDeleteModalVisible,
        unfilteredShowroomItems,
        isAdmin,
        email,
        uiStateLoaded,
        posts,
        fetchAlternateShowrooms,
    } = props

    useEffect(() => {
        fetchShowrooms()
        fetchAlternateShowrooms()
    }, [])

    useEffect(() => {
        // Only fetch user data if we have a valid auth token
        if (hasValidAuthToken) {
            fetchScenes()
            fetchCompositions()
        }
    }, [hasValidAuthToken])

    return (
        <Dashboard
            unfilteredShowroomItems={unfilteredShowroomItems}
            showroomsItems={filteredShowroomItems}
            unfurnishedShowroomItems={unfurnishedShowroomItems}
            sceneItems={sceneItems}
            isLoggedIn={isLoggedIn}
            hasValidAuthToken={hasValidAuthToken}
            isUserLoaded={isUserLoaded}
            userFirstName={userFirstName}
            compositionDataItems={compositionDataItems}
            isCompositionDataLoaded={isCompositionDataLoaded}
            onSceneOpen={openScene}
            openComposition={openComposition}
            showroomFilter={showroomFilter}
            hasSeenDashboard={hasSeenDashboard}
            setSeenDashboard={setSeenDashboard}
            filterShowrooms={filterShowrooms}
            trackGaEvent={trackGaEvent}
            showroomFilters={showroomFilters}
            selectScene={selectScene}
            filterFurnishingType={filterFurnishingType}
            setShowAppDownloadModal={setShowAppDownloadModal}
            setShowDeleteModal={setShowDeleteModal}
            isDeleteModalVisible={isDeleteModalVisible}
            isAdmin={isAdmin}
            email={email}
            uiStateLoaded={uiStateLoaded}
            fetchScenes={fetchScenes}
            posts={posts}
        />
    )
}

const mapStateToProps = (state: RootState) => ({
    sceneItems: getUserSceneItems(state),
    unfilteredShowroomItems: getShowrooms(state),
    filteredShowroomItems: getFilteredShowrooms(state),
    unfurnishedShowroomItems: getUnfurnishedShowrooms(state),
    showroomFilters: getShowroomRoomTypeFilters(state),
    compositionDataItems: getUserCompositionsData(state),
    isCompositionDataLoaded: getIsCompositionDataLoadedRaw(state),
    isLoggedIn: getIsLoggedIn(state),
    hasValidAuthToken: getHasValidAuthToken(state),
    isUserLoaded: getIsUserDataLoaded(state),
    userFirstName: getFirstName(state),
    showroomFilter: getShowroomRoomTypeFilter(state),
    hasSeenDashboard: getSeenDashboard(state),
    isDeleteModalVisible: getShowDeleteModal(state),
    isAdmin: getIsAdmin(state),
    email: getUserEmail(state),
    uiStateLoaded: getUIStateLoaded(state),
})

const mapDispatchToProps = {
    openScene: openSceneAction,
    openComposition: openCompositionAction,
    fetchScenes: (isRetry?: boolean, silent?: boolean) => fetchScenesAction(isRetry, silent),
    fetchShowrooms: fetchShowroomsAction,
    fetchAlternateShowrooms: fetchAlternateShowroomsAction,
    fetchCompositions: fetchCompositionsAction,
    filterShowrooms: filterShowroomsAction,
    setSeenDashboard: setSeenDashboardAction,
    trackGaEvent: trackGaEventAction,
    selectScene: selectSceneAction,
    filterFurnishingType: filterFurnishingTypeAction,
    setShowAppDownloadModal: showAppDownloadModalAction,
    setShowDeleteModal: showDeleteModalAction,
}

export const connector = connect(mapStateToProps, mapDispatchToProps)

export type PropsFromRedux = ConnectedProps<typeof connector>

export default connector(DashboardContainer)
