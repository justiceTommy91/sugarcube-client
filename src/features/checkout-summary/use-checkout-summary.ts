import { useAppSelector } from 'hooks'
import { getOrientation } from 'models/ui/selectors'
import type { RenderItemComplete } from 'models/compositions'
import {
    getIsModified,
    getSelectedComposition,
    getSelectedCompositionRenderedItemsTotalPrice,
    getSelectedCompositionShoppableLocalIds,
    getSelectedCompositionShoppableProductData,
    getSelectedCompositionTrackingRoomInfo,
} from 'models/compositions/selectors'
import { getIsLoggedIn } from 'models/user/selectors'
import { getIsSaving } from 'models/scenes/selectors'
import { getRenderer } from 'models/refStore/selectors'
import { ORIENTATION_LANDSCAPE } from 'models/ui/constants'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * updates the room's screenshot on mount and when the addedToRoomItems change
 * this is because it is possible to remove invalid items from the room, within
 * the design summary modal
 */
export function useRoomScreenshotSync({
    panoImageRef,
    addedToRoomItems,
}: {
    panoImageRef: React.RefObject<HTMLImageElement>
    addedToRoomItems: RenderItemComplete[]
}) {
    useEffect(() => {
        requestAnimationFrame(() => {
            getRenderer()?.takeRoomScreenshot(
                (thumb) => {
                    const imageElement = panoImageRef?.current

                    if (imageElement) {
                        imageElement.src = thumb.thumbDataUrl
                    }
                },
                null,
                'DesignSummaryModal', // eslint-disable-line i18next/no-literal-string
            )
        })
    }, [addedToRoomItems])
}

export function useCheckoutSummary() {
    const panoImageRef = useRef<HTMLImageElement | null>(null)
    const composition = useAppSelector(getSelectedComposition)
    const isModified = useAppSelector(getIsModified)
    const isLoggedIn = useAppSelector(getIsLoggedIn)
    const isSaving = useAppSelector(getIsSaving)
    const roomInfo = useAppSelector(getSelectedCompositionTrackingRoomInfo)
    const addedToRoomItems = useAppSelector(getSelectedCompositionShoppableProductData)
    const localItemNumbers = useAppSelector(getSelectedCompositionShoppableLocalIds)
    const totalPrice = useAppSelector(getSelectedCompositionRenderedItemsTotalPrice)
    const orientation = useAppSelector(getOrientation)
    const { t } = useTranslation()

    useRoomScreenshotSync({ panoImageRef, addedToRoomItems })

    const hasProductsInRoom = addedToRoomItems && addedToRoomItems.length
    const hasItemsToFavorite = localItemNumbers && localItemNumbers.length
    const compositionName = composition && (composition.name || t('design.default composition name'))
    const hasLandscapeOrientation = orientation === ORIENTATION_LANDSCAPE

    return {
        composition,
        isModified,
        isLoggedIn,
        isSaving,
        roomInfo,
        addedToRoomItems,
        localItemNumbers,
        totalPrice,
        hasProductsInRoom,
        hasItemsToFavorite,
        compositionName,
        hasLandscapeOrientation,
        orientation,
        panoImageRef,
    }
}
