import * as Sentry from '@sentry/react'

const STORED_UISTATE_LABEL = 'GeoUI'
const BEAUTIFIER_GENERATED_IMAGES_ORDER_VERSION = 2

export type OnboardingState = {
    skipTime: number
    completeTime: number
    hasSeenOnboarding: boolean
}

export type FeedbackFormState = {
    skipTime: number
    completeTime: number
    hasSeenFeedbackForm: boolean
    hasSeenFeedbackFormOnce: boolean
    hasSeenBeautifyFeedback: boolean
}

export type MagicEraserOnboarding = {
    skipTime: number
    completeTime: number
    hasSeenMagicEraserOnboarding: boolean
}

export type MeasurementsPopoverState = {
    productDimensionsEnabled: boolean
    roomDimensionsEnabled: boolean
    dynamicMeasurementsEnabled: boolean
}

export type RoomBuilderEditorState = {
    wallColor: null
    floorMaterial: null
    roomTemplate: null
    sceneId: undefined
    compositionId: undefined
}

export type UiState = {
    feedbackForm: FeedbackFormState
    magicEraserOnboarding: MagicEraserOnboarding
    onboarding: OnboardingState
    seenDashboard: boolean
    seenExpertCheck: boolean
    shownExpertCheckCalloutFromTimeout: boolean
    dismissedExpertCheckCalloutFromTimeout: boolean
    measurementsPopover: MeasurementsPopoverState
    roomBuilderEditor: RoomBuilderEditorState
    hideImageViewerDisclaimerPermanently: boolean
    generatedImagesByRoom: Record<string, string[]>
    /** @deprecated Kept for backward-compatible hydration from older localStorage entries. */
    generatedImages?: string[]
}

type StoredUiState = UiState & {
    beautifierGeneratedImagesOrderVersion?: number
}

const defaultUiState: UiState = {
    feedbackForm: {
        skipTime: 0,
        completeTime: 0,
        hasSeenFeedbackForm: false,
        hasSeenFeedbackFormOnce: false,
        hasSeenBeautifyFeedback: false,
    },
    magicEraserOnboarding: {
        skipTime: 0,
        completeTime: 0,
        hasSeenMagicEraserOnboarding: false,
    },
    onboarding: {
        skipTime: 0,
        completeTime: 0,
        hasSeenOnboarding: false,
    },
    seenDashboard: false,
    seenExpertCheck: false,
    shownExpertCheckCalloutFromTimeout: false,
    dismissedExpertCheckCalloutFromTimeout: false,
    measurementsPopover: {
        productDimensionsEnabled: false,
        roomDimensionsEnabled: false,
        dynamicMeasurementsEnabled: false,
    },
    roomBuilderEditor: {
        wallColor: null,
        floorMaterial: null,
        roomTemplate: null,
        sceneId: undefined,
        compositionId: undefined
    },
    hideImageViewerDisclaimerPermanently: false,
    generatedImagesByRoom: {},
}

export type UnsubscribeFn = () => void

export type UiStateChangeCallback = (uiState: UiState) => void

const callbacks: UiStateChangeCallback[] = []

const triggerChange = (uiState: UiState): void => {
    callbacks.forEach((cb) => cb(uiState))
}

const deepClone = <T extends object>(value: T): T => JSON.parse(JSON.stringify(value))

let memoryStoreFallback: UiState = deepClone(defaultUiState)

const toStoredUiState = (uiState: UiState): StoredUiState => ({
    ...uiState,
    beautifierGeneratedImagesOrderVersion: BEAUTIFIER_GENERATED_IMAGES_ORDER_VERSION,
})

const stripStoredUiStateMetadata = (uiState: StoredUiState): UiState => {
    const { beautifierGeneratedImagesOrderVersion, ...persistedUiState } = uiState
    return persistedUiState
}

const reverseGeneratedImagesByRoom = (generatedImagesByRoom: UiState['generatedImagesByRoom'] | undefined) => {
    if (!generatedImagesByRoom || typeof generatedImagesByRoom !== 'object') {
        return generatedImagesByRoom
    }

    return Object.fromEntries(
        Object.entries(generatedImagesByRoom).map(([roomKey, images]) => [
            roomKey,
            Array.isArray(images) ? [...images].reverse() : images,
        ]),
    )
}

const migrateStoredUiState = (uiState: StoredUiState): StoredUiState => {
    if (uiState.beautifierGeneratedImagesOrderVersion === BEAUTIFIER_GENERATED_IMAGES_ORDER_VERSION) {
        return uiState
    }

    const hasGeneratedImagesByRoom = !!uiState.generatedImagesByRoom
        && Object.values(uiState.generatedImagesByRoom).some((images) => Array.isArray(images) && images.length > 0)
    const hasLegacyGeneratedImages = Array.isArray(uiState.generatedImages) && uiState.generatedImages.length > 0
    if (!hasGeneratedImagesByRoom && !hasLegacyGeneratedImages) {
        return uiState
    }

    return {
        ...uiState,
        generatedImagesByRoom: reverseGeneratedImagesByRoom(uiState.generatedImagesByRoom) ?? uiState.generatedImagesByRoom,
        generatedImages: Array.isArray(uiState.generatedImages) ? [...uiState.generatedImages].reverse() : uiState.generatedImages,
        beautifierGeneratedImagesOrderVersion: BEAUTIFIER_GENERATED_IMAGES_ORDER_VERSION,
    }
}

const persistStoredUiState = (uiState: StoredUiState): void => {
    try {
        window.localStorage.setItem(STORED_UISTATE_LABEL, JSON.stringify(uiState))
    } catch (error) {
        memoryStoreFallback = deepClone(stripStoredUiStateMetadata(uiState))
    }
}

const retrieveUiState = (): UiState => {
    let rawUiState
    try {
        rawUiState = window.localStorage.getItem(STORED_UISTATE_LABEL)
    } catch (error) {
        return deepClone(memoryStoreFallback)
    }

    let uiState: StoredUiState
    try {
        uiState = JSON.parse(rawUiState || '{}')
    } catch (error) {
        const message = `UI State: invalid UI state in local storage ${rawUiState}`
        Sentry.captureMessage(message, 'error')
        try {
            window.localStorage.removeItem(STORED_UISTATE_LABEL)
        } catch (err) {
            Sentry.captureException(err)
        }
        return defaultUiState
    }

    const migratedUiState = migrateStoredUiState(uiState)
    if (migratedUiState !== uiState) {
        persistStoredUiState(migratedUiState)
    }

    return stripStoredUiStateMetadata(migratedUiState)
}

export default {
    onChange: (callback: UiStateChangeCallback): UnsubscribeFn => {
        if (typeof window === 'undefined') {
            return () => { }
        }

        callbacks.push(callback)

        return () => {
            const index = callbacks.indexOf(callback)
            if (index >= 0) {
                callbacks.splice(index, 1)
            }
        }
    },
    update: (uiState: UiState) => {
        if (typeof window === 'undefined') {
            return
        }

        persistStoredUiState(toStoredUiState(uiState))
        triggerChange(uiState)
    },
    retrieve: (): UiState => {
        if (typeof window === 'undefined') {
            return defaultUiState
        }

        return retrieveUiState()
    },
}
