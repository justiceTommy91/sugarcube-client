import { useState, useEffect, useRef } from 'react'
import * as RenderItemTypes from 'constants/renderItemTypes'
import { RenderItemComplete } from 'models/compositions'
import { generateImageData } from 'utils/imageData'

type ImageCache = {
    [id: number]: { artImageData: ImageData; msFileDownloadTime: number } | undefined
}

type Composition = {
    renderItems: RenderItemComplete[]
} | null | undefined

export function useImageCache(composition: Composition) {
    const [imageCache, setImageCache] = useState<ImageCache>({})
    const prevRenderItemsRef = useRef<RenderItemComplete[] | null>(null)

    useEffect(() => {
        if (!composition) {
            return
        }

        const prevRenderItems = prevRenderItemsRef.current
        const currentRenderItems = composition.renderItems

        if (prevRenderItems !== currentRenderItems) {
            const cache = (renderItem: RenderItemComplete) => {
                const { id } = renderItem
                if (renderItem.renderType === RenderItemTypes.ART_ITEM && !imageCache[id]) {
                    const imageUrl =
                        Array.isArray(renderItem.artAssetUrls) &&
                        renderItem.artAssetUrls.length > 0 &&
                        renderItem.artAssetUrls[0]
                    if (imageUrl) {
                        generateImageData(imageUrl).then((artImageTuple) => {
                            const { artImageData, msFileDownloadTime } = artImageTuple
                            setImageCache((prev) => ({ ...prev, [id]: { artImageData, msFileDownloadTime } }))
                        })
                    }
                }
            }

            currentRenderItems.forEach(cache)
        }

        prevRenderItemsRef.current = currentRenderItems
    }, [composition, imageCache])

    return imageCache
}
