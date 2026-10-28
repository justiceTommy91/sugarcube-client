import * as Sentry from '@sentry/react'

import {
    CONTEXT_CATEGORY_LIVING_ROOM,
    CONTEXT_CHOOSE_ROOM,
    CONTEXT_PLANNER,
    CONTEXT_SEARCH_BROWSE,
    SLUG_TO_ROOM_TYPE,
    type RoomPlannerSlug,
} from 'constants/contexts'
import type { APIComposition, CompositionDataItem, RenderItem } from 'models/compositions'
import { APIProduct } from 'models/furniture'
import {
    PARAM_APP_CONTEXT,
    PARAM_BANNER_IMAGE,
    PARAM_ROOM_TYPE,
    PARAM_PLANNER_ROOM,
    PARAM_PRODUCT_ID,
    PARAM_SEARCH_QUERY,
    PARAM_SUBCATALOG,
} from 'models/location/constants'
import { getBannerImageParam, getSearch, getSubCatalog, getUrlContext } from 'models/location/selectors'
import isMobile from 'utils/isMobile'
import { isVectorValid } from 'utils/vector'
import { getRenderer } from 'models/refStore/selectors'

export const makeCompositionFromApiComposition = (
    composition: APIComposition,
    renderItems?: Record<number, RenderItem>,
    furniture?: APIProduct[],
): CompositionDataItem => {
    let placedProducts = composition.placedfurnitureSet
    if (isMobile()) {
        // TODO remove side effect
        placedProducts = placedProducts.filter((product) => {
            const isStackable = !!product?.gfxAttributes?.stackedPlane
            return !isStackable
        })
    }

    const processedRenderItems = placedProducts
        .filter((product) => {
            let valid = true
            if (furniture) {
                const existingFurniture = furniture.some(furn => furn.id === product.furnitureId)
                valid = existingFurniture
            }
            return valid
        })
        .filter((product, index, prefiltered) => {
            let valid = true
            const gfxAttributes = product.gfxAttributes ?? {}
            const combinableParentId = gfxAttributes.combinablePlacement?.parentId
            if (combinableParentId !== undefined) {
                const existingParent = prefiltered.some(itm => itm.uniqueId === String(combinableParentId))
                valid = existingParent
            }
            if (product.parentId && product.parentId !== `SURFACE`) {
                const existingParent = prefiltered.some(itm => itm.uniqueId === String(product.parentId))
                valid = existingParent
            }
            return valid
        })
        .map((item) => {
            const gfxAttributes = item.gfxAttributes ?? {}

            let artData = {}
            if (gfxAttributes.artData) {
                artData = gfxAttributes.artData
            }

            let uniqueId: number
            if (item.uniqueId) {
                uniqueId = parseInt(item.uniqueId, 10)
            } else {
                // Backfill uniqueId to load mobile compositions
                uniqueId = Date.now() - Math.round(Math.random() * 100000)
            }

            let stackedPlane: string | undefined
            if (item.parentId && item.parentId !== 'SURFACE') {
                stackedPlane = `${item.parentId}${item.parentAttachment}`
            } else if (gfxAttributes.stackedPlane) {
                stackedPlane = gfxAttributes.stackedPlane
            }

            const translated: RenderItem = {
                id: item.furnitureId,
                uniqueId,
                x: item.x,
                y: item.y,
                heading: item.heading,
                stackedPlane,
                combinablePlacement: gfxAttributes.combinablePlacement,
                mirrorOptionEnabled: gfxAttributes.mirrorOptionEnabled || false,
                placeables: gfxAttributes.placeables,
                anchorCombinationIndex: gfxAttributes.anchorCombinationIndex,
                placingBehavior: gfxAttributes.placingBehavior,
                metrics: null,
                readyAndRendered: false,
                socket: item.socket,
                socketSet: item.socketSet,

                corners: [
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                ],
                pin: {
                    x: 0,
                    y: 0,
                    hidePin: true,
                    itemIsHidden: false,
                },

                ...artData,

                ...(item.parentId
                    ? {
                          x: item.x,
                          y: item.y,
                          z: item.z,
                          headingI: item.headingI,
                          headingJ: item.headingJ,
                          headingK: item.headingK,
                          heading: item.heading,
                          parentAttachment: item.parentAttachment,
                          parentIdOrSurface: item.parentId,
                          additionalContacts: item.gfxAttributes?.additionalContacts,
                      }
                    : {}),
            }

            const g = gfxAttributes

            if (Number.isFinite(g.parentId) && g.position && isVectorValid(g.position.x, g.position.y, g.position.z)) {
                translated.parentId = g.parentId

                translated.p3 = {
                    x: g.position.x,
                    y: g.position.y,
                    z: g.position.z,
                }
            }

            return {
                [uniqueId]: translated,
            }
        })

    const hasFilteredOutItems = placedProducts.length > processedRenderItems.length
    if (hasFilteredOutItems) {
        Sentry.captureMessage(`Invalid composition items filtered out.`, 'warning')
    }

    const ri: Record<number, RenderItem> = Object.assign({}, ...processedRenderItems)

    const {
        wid,
        uuid,
        isShared,
        isStock = false,
        sceneUuid,
        name,
        createdAt: creationDate,
        lastModifiedTs: lastModifiedDate = '',
        thumbnailUrl: thumbUrl = '',
        geoProperties = {},
        savedProperties = {},
        shareUrl = '',
        enableRemix,
        sendNotifications,
        publicCompositionImageUrl = '',
        adminUrl,
    } = composition

    const compositionData = {
        id: uuid,
        wid,
        uuid, // TODO remove this field
        isShared,
        isStock,
        renderItems: renderItems || ri || {},
        sceneId: sceneUuid,
        name: isStock ? '' : name,
        creationDate,
        lastModifiedDate,
        thumbUrl,
        geoProperties: geoProperties || {},
        savedProperties: savedProperties || {},
        wallPaint: savedProperties?.wallPaint || {},
        wallPaintInpaint: savedProperties?.wallPaintInpaint || {},
        hiddenSurfaces: [],
        shareUrl,
        enableRemix,
        sendNotifications,
        publicCompositionImageUrl,
        adminUrl,
        deletedRenderItems: undefined,
        isGLTF: !!composition.gltf?.nodes,
        placeMultipleRenderLoading: false,
    }

    return {
        originalCompositionData: compositionData,
        ...compositionData,
    }
}

export const makeByIdStateFromApiComposition = (
    apiComposition: APIComposition | null,
    renderItems?: Record<number, RenderItem>,
    furniture?: APIProduct[],
): Record<string, CompositionDataItem> => {
    if (!apiComposition) {
        return {}
    }
    return {
        [apiComposition.uuid]: makeCompositionFromApiComposition(apiComposition, renderItems, furniture),
    }
}

export const buildRoomUrlWithParamsAndHash = ({
    compositionId,
    sceneId,
    subCatalog,
    productId,
    query,
    roomType,
}: {
    compositionId: string
    sceneId: string
    subCatalog?: string | null
    productId?: string | null
    query?: string | null
    roomType?: string | null
}): string => {
    const {
        isPipIntegration,
        isSearchBrowseIntegration,
        isLivingRoomIntegration,
        isRoomPlannerIntegration,
        roomPlannerSlug,
        isUpptacka,
    } = getUrlContext()
    const nextSearch = new URLSearchParams(getSearch())

    if (getSubCatalog()) {
        nextSearch.delete(PARAM_SUBCATALOG)
    }

    if (isPipIntegration) {
        nextSearch.set(PARAM_APP_CONTEXT, CONTEXT_CHOOSE_ROOM)
    }
    if (isSearchBrowseIntegration) {
        nextSearch.set(PARAM_APP_CONTEXT, CONTEXT_SEARCH_BROWSE)
    }
    if (isLivingRoomIntegration) {
        nextSearch.set(PARAM_APP_CONTEXT, CONTEXT_CATEGORY_LIVING_ROOM)
    }
    if (isRoomPlannerIntegration) {
        nextSearch.set(PARAM_APP_CONTEXT, CONTEXT_PLANNER)
        if (roomPlannerSlug) {
            nextSearch.set(PARAM_PLANNER_ROOM, roomPlannerSlug)
            const mappedRoomType = SLUG_TO_ROOM_TYPE[roomPlannerSlug as RoomPlannerSlug]
            if (mappedRoomType) {
                nextSearch.set(PARAM_ROOM_TYPE, mappedRoomType)
            }
        }
        const bannerImage = getBannerImageParam()
        if (bannerImage) {
            nextSearch.set(PARAM_BANNER_IMAGE, bannerImage)
        }
    }

    if (subCatalog) {
        nextSearch.set(PARAM_SUBCATALOG, subCatalog)
    }
    if (productId) {
        nextSearch.set(PARAM_PRODUCT_ID, productId)
    }
    if (query) {
        nextSearch.set(PARAM_SEARCH_QUERY, query)
    }
    if (roomType) {
        nextSearch.set(PARAM_ROOM_TYPE, roomType)
    }

    if (isUpptacka) {
        // KLUDGE: hack to ensure that the root context value `isUpptacka=true` in case the app remounts during composition loading.
        nextSearch.set('upptacka', '')
        // KLUDGE: hack to ensure that login urls use the correct base URL on Upptacka.
        nextSearch.set('origin', 'showroom')
    }

    return `/room/?${nextSearch.toString()}#${compositionId}/${sceneId}`
}

let browserSupportsPreloadCached: boolean | null = null

// Checks if browser suppors 'preload' resource hints.
export const browserSupportsPreload = (): boolean => {
    if (browserSupportsPreloadCached === null) {
        browserSupportsPreloadCached = !!document?.createElement('link').relList?.supports('preload')
    }

    return browserSupportsPreloadCached
}

// Creates a link with 'preload' resource hint and adds it to the document,
// letting the browser start a preload fetch with high priority.
// Returns a promise that resolves either on load or error.
export const preloadAsset = (url: string) =>
    new Promise<void>((resolve) => {
        const existingLink = document.querySelector(`link[rel="preload"][href="${url}"]`)
        if (existingLink) {
            resolve()
            return
        }

        const preloadLink = document.createElement('link')
        preloadLink.href = url
        preloadLink.rel = 'preload'
        preloadLink.as = 'fetch'
        preloadLink.onload = () => resolve()
        preloadLink.onerror = () => resolve()
        document.head.appendChild(preloadLink)
    })

/**
 * Async wrapper around renderer screenshot function.
 * Converts from callbacks to Promise
 */
export const createThumbnail = (issuer: string) =>
    new Promise<{ thumbDataUrl: string }>((resolve, reject) => {
        const renderer = getRenderer()
        if (renderer) {
            renderer.takeRoomScreenshot(resolve, reject, issuer)
        } else {
            reject(new Error('No renderer to take screenshot'))
        }
    })

/**
 * Generic sort function for arrays of objects by a date property.
 * Handles invalid/missing dates by treating them as oldest (sorted last).
 */
export const sortByDateProperty = <T>(arr: T[], property: keyof T): T[] =>
    [...arr].sort((a, b) => {
        const dateA = new Date(String(a[property]))
        const dateB = new Date(String(b[property]))
        if (Number.isNaN(dateA.getTime()) && Number.isNaN(dateB.getTime())) return 0
        if (Number.isNaN(dateA.getTime())) return 1
        if (Number.isNaN(dateB.getTime())) return -1
        return dateB.getTime() - dateA.getTime()
    })

export const sortCompositionsByLastModified = (unsortedComps: CompositionDataItem[]) =>
    sortByDateProperty<CompositionDataItem>(unsortedComps, 'lastModifiedDate')
