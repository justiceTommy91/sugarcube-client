import React, { useEffect } from 'react'
import { connect, ConnectedProps } from 'react-redux'
import ChooseRoom from 'components/chooseRoom'
import { RootState } from 'store'
import { getChooseRoomProductName, getUrlProductId, getChooseRoomRoomType } from 'models/location/selectors'
import { getFurnitureIsLoadingByLocalItemNos } from 'models/furniture/selectors'
import { showAppDownloadModal as showAppDownloadModalAction } from 'models/ui/actions'
import { openComposition as openCompositionAction } from 'models/compositions/actions'
import { getPlacedProductData } from 'models/compositions/selectors'
import { trackGaEvent as trackGaEventAction } from 'models/tracking/actions'
import type { ProductData } from 'models/furniture'
import { fetchShowrooms } from 'models/showrooms/actions'
import { useAppDispatch } from 'hooks'

export type ChooseRoomContainerProps = PropsFromRedux & {
    openComposition: typeof openCompositionAction
    setShowAppDownloadModal: typeof showAppDownloadModalAction
    trackGaEvent: typeof trackGaEventAction
    placedProductData: ProductData
    isLoading: boolean
}

const ChooseRoomContainer = ({
    openComposition,
    setShowAppDownloadModal,
    placedProductData,
    isLoading,
    trackGaEvent,
}: ChooseRoomContainerProps) => {
    const dispatch = useAppDispatch()

    useEffect(() => {
        dispatch(fetchShowrooms())
    }, [])

    const productName = getChooseRoomProductName()
    const productLocalItemNo = getUrlProductId()
    const roomType = getChooseRoomRoomType()

    return (
        <ChooseRoom
            productName={productName}
            productLocalItemNo={productLocalItemNo}
            openComposition={openComposition}
            setShowAppDownloadModal={setShowAppDownloadModal}
            placedProductData={placedProductData}
            isLoading={isLoading}
            trackGaEvent={trackGaEvent}
            roomType={roomType}
        />
    )
}

const mapStateToProps = (state: RootState) => ({
    placedProductData: getPlacedProductData(state),
    isLoading: getFurnitureIsLoadingByLocalItemNos(state),
})
const mapDispatchToProps = {
    openComposition: openCompositionAction,
    setShowAppDownloadModal: showAppDownloadModalAction,
    trackGaEvent: trackGaEventAction,
}

export const connector = connect(mapStateToProps, mapDispatchToProps)

export type PropsFromRedux = ConnectedProps<typeof connector>

export default connector(ChooseRoomContainer)
