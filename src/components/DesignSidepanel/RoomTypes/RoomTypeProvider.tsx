import React, { createContext, useContext, useEffect, useRef, useMemo, ReactNode } from 'react'
import { useAppDispatch, useAppSelector } from 'hooks'

import { requestRoomTypes } from 'models/roomTypes/actions'
import { selectRoomTypeInFilter, filterBySubCategory } from 'models/furniture/actions'
import { DEBUG_CATEGORY } from 'models/furniture/constants'
import { getRoomTypes, getRoomTypeForDesign, getRoomTypeByCategoryId } from 'models/roomTypes/selectors'
import { getCategoryNameById, findDefaultRoomType } from 'models/roomTypes/utils'
import { getSelectedSceneRoomType, getSelectedScene } from 'models/compositions/selectors'
import { getFilter, getSelectedRoomTypeId } from 'models/furniture/selectors'
import { getFilterRoomType } from 'models/location/selectors'
import { setSearchContext } from 'models/tracking/actions'
import { SEARCH_TYPES } from 'models/tracking/constants'
import { getContextFromReferrer, getCategoryForContextual } from 'models/referrer/selector'

interface RoomTypeProviderContextType {
    isInitialized: boolean
    isInitializing: boolean
}

const RoomTypeProviderContext = createContext<RoomTypeProviderContextType | null>(null)

interface RoomTypeProviderProps {
    children: ReactNode
}

export const RoomTypeProvider = ({ children }: RoomTypeProviderProps): React.ReactElement => {
    const dispatch = useAppDispatch()
    const hasInitialized = useRef(false)

    const roomTypes = useAppSelector(getRoomTypes)
    const sceneRoomType = useAppSelector(getSelectedSceneRoomType)
    const selectedScene = useAppSelector(getSelectedScene)
    const filterRoomType = useAppSelector(getFilterRoomType)
    const furnitureFilter = useAppSelector(getFilter)
    const selectedRoomTypeId = useAppSelector(getSelectedRoomTypeId)
    const referrerContext = useAppSelector(getContextFromReferrer)
    const categoryByContext = useAppSelector(getCategoryForContextual)

    // Extract the actual category ID to use - prefer subcategory if available
    // because subcategories are more specific and more likely to be in room type data
    const contextCategoryId = categoryByContext?.subCategory || categoryByContext?.category || ''

    // Check if we have a matching room type for contextual category
    const matchingRoomType = useAppSelector((state) => getRoomTypeByCategoryId(state, contextCategoryId))

    // Load room types on mount
    useEffect(() => {
        if (roomTypes.length === 0) {
            dispatch(requestRoomTypes())
        }
    }, [dispatch, roomTypes.length])

    // Initialize furniture search when room types are loaded
    useEffect(() => {
        const hasSubCatalog = furnitureFilter?.subCatalog && furnitureFilter.subCatalog !== '*'
        const shouldInitialize =
            roomTypes.length > 0 &&
            !hasInitialized.current &&
            !selectedRoomTypeId && // Don't re-initialize if a room type is already selected
            !furnitureFilter?.subCategoryIds &&
            !furnitureFilter?.query && // Don't re-initialize during search 'mode'
            !hasSubCatalog && // SubCatalog deep links manage their own product fetching
            furnitureFilter?.category !== DEBUG_CATEGORY // Admin debug mode manages its own fetching

        if (shouldInitialize) {
            // Check if we have contextual category context
            if (referrerContext?.type === 'category' && contextCategoryId && matchingRoomType) {
                if (matchingRoomType.categoryIds && matchingRoomType.categoryNames) {
                    hasInitialized.current = true

                    const roomTypeId = matchingRoomType.humanId.replace(/^rooms--/, '')
                    dispatch(setSearchContext(`roomType:${roomTypeId}`, SEARCH_TYPES.INITIAL_LOAD))

                    // Apply filter with single subcategory selected (the contextual category)
                    const categoryName = getCategoryNameById(matchingRoomType, contextCategoryId)

                    dispatch(filterBySubCategory(contextCategoryId, categoryName, matchingRoomType.humanId))

                    return
                }
            }

            // If a scene exists but hasn't loaded yet and there's no URL param to go on,
            // wait to avoid defaulting to bedroom before the scene room type is known.
            // Prefer URL param, then scene room type, then bedroom as final fallback.
            if (!selectedScene && !filterRoomType) {
                return
            }

            const effectiveRoomType = filterRoomType || sceneRoomType
            const matchedRoomType = effectiveRoomType ? getRoomTypeForDesign(roomTypes, effectiveRoomType) : null
            const roomTypeToSelect = matchedRoomType || findDefaultRoomType(roomTypes)

            if (roomTypeToSelect) {
                const roomTypeId = roomTypeToSelect.humanId.replace(/^rooms--/, '')
                dispatch(setSearchContext(`roomType:${roomTypeId}`, SEARCH_TYPES.INITIAL_LOAD))
                dispatch(
                    selectRoomTypeInFilter(
                        roomTypeToSelect.humanId,
                        roomTypeToSelect.categoryIds,
                        roomTypeToSelect.categoryNames,
                        roomTypeToSelect.name,
                    ),
                )
                hasInitialized.current = true
            }
        }
    }, [
        dispatch,
        roomTypes,
        sceneRoomType,
        selectedScene,
        filterRoomType,
        selectedRoomTypeId,
        furnitureFilter?.subCategoryIds,
        furnitureFilter?.query,
        furnitureFilter?.subCatalog,
        furnitureFilter?.category,
        referrerContext,
        categoryByContext,
        matchingRoomType,
        contextCategoryId,
    ])

    const isInitialized = hasInitialized.current
    const isInitializing = !isInitialized && (roomTypes.length === 0 || !furnitureFilter?.subCategoryIds)

    const contextValue: RoomTypeProviderContextType = useMemo(
        () => ({
            isInitialized,
            isInitializing,
        }),
        [isInitialized, isInitializing],
    )

    return <RoomTypeProviderContext.Provider value={contextValue}>{children}</RoomTypeProviderContext.Provider>
}

export const useRoomTypeProviderContext = (): RoomTypeProviderContextType => {
    const context = useContext(RoomTypeProviderContext)
    if (!context) {
        throw new Error('useRoomTypeProviderContext must be used within a RoomTypeProvider')
    }
    return context
}
