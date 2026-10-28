import React from 'react'

import { useFlags } from 'hooks'
import type { DecidedFlags } from 'services/experiments/flags'
import { withTrackingBoundary } from 'apps/TrackingBoundary'
import { AdminFilterProvider } from 'hooks/admin/AdminFilterContext'
import { RoomTypeProvider } from '../../RoomTypes/RoomTypeProvider'
import { useRoomTypeFilters } from '../../RoomTypes/hooks/useRoomTypeFilters'

import { ProductSearch } from './ProductSearch'
import { ProductSearchResults } from './ProductSearchResults'
import { PersonalizedSearchResults } from './PersonalizedSearchResults'

require('./AddProductTab.scss')

type AddProductTabContentProps = {
    hasScrolled: boolean
    handleScroll: (scrollOffset: number) => void
    flags: DecidedFlags
}

const AddProductTabContent = ({ hasScrolled, handleScroll, flags }: AddProductTabContentProps): React.ReactElement => {
    const { isCompleteMyRoomSelected, isDebugSelected } = useRoomTypeFilters()

    // Show personalized results when "Complete my room" is selected, but not in debug mode
    const shouldShowPersonalized = flags.CompleteMyRoom && !isDebugSelected && isCompleteMyRoomSelected

    return (
        <div className="AddProductTab">
            <ProductSearch hasScrolled={hasScrolled} />

            {shouldShowPersonalized && <PersonalizedSearchResults onScroll={handleScroll} />}
            {!shouldShowPersonalized && <ProductSearchResults onScroll={handleScroll} />}
        </div>
    )
}

// NOTE: We use ProductBrowse for the tracking boundary to maintain backwards compatibility with existing tracking dashboards.
export const AddProductTab = withTrackingBoundary('ProductBrowse')(() => {
    const { flags } = useFlags()
    const [hasScrolled, setHasScrolled] = React.useState(false)

    const handleScroll = (scrollOffset: number) => {
        setHasScrolled(scrollOffset > 0)
    }

    return (
        <RoomTypeProvider>
            <AdminFilterProvider>
                <AddProductTabContent hasScrolled={hasScrolled} handleScroll={handleScroll} flags={flags} />
            </AdminFilterProvider>
        </RoomTypeProvider>
    )
})
