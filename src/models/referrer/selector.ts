import { createSelector } from 'reselect'
import type { RootState } from 'store'
import type { ContextualCategory, ReferrerContext } from 'models/referrer/types'
import { getCategories } from 'models/furniture/selectors'
import { getUrlParams } from 'utils/urlParams'
import { SLUG_TO_ROOM_TYPE } from 'constants/contexts'
import { getPlannerRoom, getIsRoomPlannerContext } from 'models/location/selectors'

import CATEGORIES_LIST from './categories.json'
import { enrichCategories, determineReferrerContext } from './utils'

type Furniture = {
    id: number
    localItemNumber: string
    categoryIds: string[]
}

export const getReferrerState = (state: RootState) => state.referrer
export const getReferrerProductId = (state: RootState) => state.referrer.productId

export const getContextFromReferrer = createSelector([getReferrerState], (referrer): ReferrerContext => {
    // Use stored productId from referrer state, or get from URL if not stored
    const urlProductId = getUrlParams().productId?.toString() || ''
    const productId = referrer?.productId || urlProductId
    const { categoryId, queryTerm, queryTermCategoryId } = referrer || {}

    return determineReferrerContext(productId, categoryId, queryTerm, queryTermCategoryId)
})

export const getIsProductContext = createSelector([getContextFromReferrer], (context) => context?.type === 'product')
export const getIsCategoryContext = createSelector([getContextFromReferrer], (context) => context?.type === 'category')
export const getIsQueryContext = createSelector([getContextFromReferrer], (context) => context?.type === 'queryTerm')

export const getContextualRoomType = createSelector(
    [getContextFromReferrer, (state: RootState) => state.furniture.byId, getReferrerState],
    (context, furnitures, referrerState) => {
        // Check for room planner context from appContext=planner + room param
        if (getIsRoomPlannerContext()) {
            const plannerRoom = getPlannerRoom()
            if (plannerRoom) {
                return SLUG_TO_ROOM_TYPE[plannerRoom] || null
            }
        }

        if (!context) return null

        const categories: Record<string, ContextualCategory> = CATEGORIES_LIST

        if (context.type === 'category') {
            return categories[context.value]?.roomType?.toUpperCase() || null
        }

        if (context.type === 'product') {
            let furniture: Furniture | undefined

            // first tries with id
            if (furnitures[context.value]) {
                furniture = furnitures[context.value] as Furniture
            } else {
                // if not try by localItemNo
                furniture = (Object.values(furnitures) as Furniture[]).find((f) => f.localItemNumber === context.value)
            }

            if (!furniture) return null

            if (furniture.categoryIds) {
                const categoryIdWithRoomType = furniture.categoryIds.find(
                    (categoryId) => categories[categoryId]?.roomType,
                )
                if (categoryIdWithRoomType) {
                    return categories[categoryIdWithRoomType]?.roomType?.toUpperCase() || null
                }
            }
            return null
        }

        if (context.type === 'queryTerm') {
            if (referrerState.queryTermCategoryId) {
                return categories[referrerState.queryTermCategoryId]?.roomType?.toUpperCase() || null
            }
        }

        return null
    },
)

export const getCategoryForContextual = createSelector(
    [getContextFromReferrer, getCategories, getReferrerState],
    (context, stateCategories, referrerState) => {
        if (context?.type === 'queryTerm') {
            return { category: referrerState.queryTermCategoryId }
        }

        if (context?.type !== 'category') {
            return { category: null, subCategory: null }
        }

        const categories: Record<string, ContextualCategory> = enrichCategories(stateCategories, CATEGORIES_LIST)
        const id = String(context.value)
        const cat = categories[id]

        if (!cat) {
            return { category: null, subCategory: null }
        }

        if (cat.isSubcategory) {
            return { category: cat.categoryId, subCategory: id }
        }

        return { category: id, subCategory: null }
    },
)

export const getContextualQuery = createSelector([getContextFromReferrer], (context) => {
    if (context?.type === 'queryTerm') {
        return context.value
    }
    return null
})
