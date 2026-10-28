import React from 'react'
import { withTrackingBoundary } from 'apps/TrackingBoundary'
import { AdminFilterProvider } from 'hooks/admin/AdminFilterContext'
import { RoomTypeProvider } from 'components/DesignSidepanel/RoomTypes/RoomTypeProvider'
import { ProductSearch } from 'components/DesignSidepanel/tabs/AddProductTab/ProductSearch'
import { ProductSearchResults } from 'components/DesignSidepanel/tabs/AddProductTab/ProductSearchResults'

require('./UpptackaSidePanel.scss')

export const UpptackaSidePanel = withTrackingBoundary('UpptackaSidePanel')(() => (
    <RoomTypeProvider>
        <AdminFilterProvider>
            <div className="UpptackaSidePanel">
                <ProductSearch />
                <ProductSearchResults />
            </div>
        </AdminFilterProvider>
    </RoomTypeProvider>
))
