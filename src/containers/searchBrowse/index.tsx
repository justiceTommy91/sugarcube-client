import React, { useEffect, useState } from 'react'
import { connect, ConnectedProps } from 'react-redux'

import { useAppDispatch, useAppSelector } from 'hooks'
import { fetchShowrooms } from 'models/showrooms/actions'
import { getShowrooms } from 'models/showrooms/selectors'
import { showAppDownloadModal as showAppDownloadModalAction } from 'models/ui/actions'
import SearchBrowse from 'components/searchBrowse'
import MobileSearchBrowse from 'components/searchBrowse/MobileSearchBrowse'
import { openComposition as openCompositionAction } from 'models/compositions/actions'
import { openScene as openSceneAction } from 'models/scenes/actions'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { getUrlProductId, getIkeaHomeUrl, getSearchCategory } from 'models/location/selectors'
import { NewSearchBrowseItem, SEARCH_BROWSE_ITEMS } from 'components/searchBrowse/constants'
import { trackGaEvent as trackGaEventAction } from 'models/tracking/actions'
import { getPlacedProductData } from 'models/compositions/selectors'
import { UNFURNISHED } from 'models/scenes/constants'
import { RootState } from 'store'
import { ProductData } from 'models/furniture'
import { SearchBrowseItem } from './types'

const NUM_SHOWROOMS = 8

export type SearchBrowseContainerProps = PropsFromRedux & {
    setShowAppDownloadModal: typeof showAppDownloadModalAction
    trackGaEvent: typeof trackGaEventAction
    openComposition: typeof openCompositionAction
    openScene: (id: string) => void
    homeUrl?: string
    placedProductData: ProductData
}

const SearchBrowseContainer = ({
    openComposition,
    homeUrl,
    placedProductData,
    setShowAppDownloadModal,
    openScene,
    trackGaEvent,
}: SearchBrowseContainerProps) => {
    const dispatch = useAppDispatch()
    const { isMobile } = useSugarcubeContext()

    useEffect(() => {
        dispatch(fetchShowrooms())
    }, [])

    const showrooms = useAppSelector(getShowrooms)

    const productLocalItemNo = getUrlProductId()
    const category = getSearchCategory()

    const [searchBrowseItem, setSearchBrowseItem] = useState<{
        data?: NewSearchBrowseItem | SearchBrowseItem
        loading: boolean
    }>({
        data: undefined,
        loading: true,
    })

    useEffect(() => {
        const item = SEARCH_BROWSE_ITEMS.find((data) => data.category === category)
        // if we are on showroom app context, we want to add the 4 diffs compositions to selectedShowRooms

        const selectedShowrooms = showrooms
            .filter((showroom) => item && showroom.tags.includes(item?.tag))
            .slice(0, NUM_SHOWROOMS) // Cut the length if we have too many

        if (selectedShowrooms.length < NUM_SHOWROOMS) {
            // If we don't have enough showrooms, pad the array with some unfurnished ones
            const additionalShowrooms = showrooms
                .filter((s) => s.furnishingType === UNFURNISHED) // Grab all unfurnished
                // Filter out duplicates
                .filter((addShow) => !selectedShowrooms.some((selShow) => selShow.id === addShow.id))
                .slice(0, NUM_SHOWROOMS - selectedShowrooms.length) // Only keep what we need

            selectedShowrooms.push(...additionalShowrooms)
        }

        if (selectedShowrooms.length) {
            setSearchBrowseItem({
                loading: false,
                data: {
                    ...item,
                    showrooms: selectedShowrooms,
                },
            })
        }
    }, [showrooms])

    if (isMobile) {
        return (
            <MobileSearchBrowse
                placedProductData={placedProductData}
                productLocalItemNo={productLocalItemNo}
                item={searchBrowseItem.data as SearchBrowseItem}
                trackGaEvent={trackGaEvent}
                loading={searchBrowseItem.loading}
            />
        )
    }

    return (
        <SearchBrowse
            item={searchBrowseItem.data as NewSearchBrowseItem}
            homeUrl={homeUrl}
            openComposition={openComposition}
            placedProductData={placedProductData}
            productLocalItemNo={productLocalItemNo}
            setShowAppDownloadModal={setShowAppDownloadModal}
            trackGaEvent={trackGaEvent}
            onSceneOpen={openScene}
            loading={searchBrowseItem.loading}
        />
    )
}

const mapDispatchToProps = {
    setShowAppDownloadModal: showAppDownloadModalAction,
    openComposition: openCompositionAction,
    openScene: openSceneAction,
    trackGaEvent: trackGaEventAction,
}

const mapStateToProps = (state: RootState) => ({
    placedProductData: getPlacedProductData(state),
    homeUrl: getIkeaHomeUrl(),
})

export const connector = connect(mapStateToProps, mapDispatchToProps)

export type PropsFromRedux = ConnectedProps<typeof connector>

export default connector(SearchBrowseContainer)
