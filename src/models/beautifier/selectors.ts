import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from 'store'
import { getSelectedCompositionShoppableProductData } from 'models/compositions/selectors'
import { MIN_PRODUCTS_FOR_BEAUTIFY, DAILY_USAGE_LIMIT } from './constants'

const getBeautifierState = (state: RootState) => state.beautifier

export const getActiveRoomKey = createSelector(
    [getBeautifierState],
    (beautifier) => beautifier.activeRoomKey,
)

const EMPTY_IMAGES: string[] = []

export const getGeneratedImages = createSelector(
    [getBeautifierState],
    (beautifier) => {
        if (!beautifier.activeRoomKey) return EMPTY_IMAGES
        return beautifier.generatedImagesByRoom[beautifier.activeRoomKey] ?? EMPTY_IMAGES
    },
)

export const getIsBeautifying = createSelector(
    [getBeautifierState],
    (beautifier) => beautifier.isBeautifying,
)

export const getDailyUsageCount = createSelector(
    [getBeautifierState],
    (beautifier) => beautifier.dailyUsageCount,
)

export const getHasRoomChanged = createSelector(
    [getBeautifierState],
    (beautifier) => beautifier.hasRoomChanged,
)

export const getHasReachedDailyLimit = createSelector(
    [getDailyUsageCount],
    (count) => count >= DAILY_USAGE_LIMIT,
)

export const getRemainingCredits = createSelector(
    [getDailyUsageCount],
    (count) => DAILY_USAGE_LIMIT - count,
)

export const getShoppableProductCount = createSelector(
    [getSelectedCompositionShoppableProductData],
    (products) => products.length,
)

export const getHasAnyProducts = createSelector(
    [getShoppableProductCount],
    (count) => count > 0,
)

export const getHasGeneratedImages = createSelector(
    [getGeneratedImages],
    (generatedImages) => generatedImages.length > 0,
)

export const getHasEnoughProducts = createSelector(
    [getShoppableProductCount],
    (count) => count >= MIN_PRODUCTS_FOR_BEAUTIFY,
)

export const getCanGenerateBeautify = createSelector(
    [getHasAnyProducts, getHasReachedDailyLimit, getIsBeautifying],
    (hasAnyProducts, hasReachedDailyLimit, isBeautifying) => {
        if (isBeautifying) return false
        if (!hasAnyProducts) return false
        if (hasReachedDailyLimit) return false
        return true
    },
)

export const getIsBeautifyButtonClickable = createSelector(
    [getHasAnyProducts, getHasGeneratedImages, getIsBeautifying],
    (hasAnyProducts, hasGeneratedImages, isBeautifying) => {
        if (isBeautifying) return false
        return hasAnyProducts || hasGeneratedImages
    },
)

export const getIsBeautifyButtonHighlighted = createSelector(
    [getHasEnoughProducts, getHasReachedDailyLimit, getIsBeautifying],
    (hasEnoughProducts, hasReachedDailyLimit, isBeautifying) =>
        hasEnoughProducts && !hasReachedDailyLimit && !isBeautifying,
)

export const getSceneImageData = createSelector(
    [getBeautifierState],
    (beautifier) => beautifier.sceneImageData,
)

export const getBeautifierJobUuid = createSelector(
    [getBeautifierState],
    (beautifier) => beautifier.jobUuid,
)

export const getBeautifierJobState = createSelector(
    [getBeautifierState],
    (beautifier) => beautifier.jobState,
)

export const getBeautifierOutputUrl = createSelector(
    [getBeautifierState],
    (beautifier) => beautifier.outputUrl,
)

export const getBeautifierErrorMessage = createSelector(
    [getBeautifierState],
    (beautifier) => beautifier.errorMessage,
)


export const getViewerImageIndex = createSelector(
    [getBeautifierState],
    (beautifier) => beautifier.viewerImageIndex,
)

export const getIsViewerOpen = createSelector(
    [getViewerImageIndex],
    (index) => index !== null,
)

export const getHideImageViewerDisclaimerPermanently = createSelector(
    [getBeautifierState],
    (beautifier) => beautifier.hideImageViewerDisclaimerPermanently,
)
