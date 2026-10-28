import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import * as types from 'models/actionTypes'
import { MAX_GENERATED_IMAGES } from './constants'
import type { BeautifierJobState } from './constants'

export type GeneratedImagesByRoom = Record<string, string[]>

export const buildRoomKey = (sceneId: string | null, compositionId: string | null): string | null => {
    if (!sceneId) return null
    return compositionId ? `${sceneId}:${compositionId}` : sceneId
}

type BeautifierState = {
    dailyUsageCount: number
    lastUsageDate: string
    hasRoomChanged: boolean
    isBeautifying: boolean
    sceneImageData: string | null
    jobUuid: string | null
    jobState: BeautifierJobState | null
    outputUrl: string | null
    errorMessage: string | null
    generatedImagesByRoom: GeneratedImagesByRoom
    activeRoomKey: string | null
    viewerImageIndex: number | null
    hideImageViewerDisclaimerPermanently: boolean
}

const getActiveRoomImages = (state: BeautifierState): string[] =>
    state.activeRoomKey ? (state.generatedImagesByRoom[state.activeRoomKey] ?? []) : []

const setActiveRoomImages = (state: BeautifierState, images: string[]) => {
    if (!state.activeRoomKey) return
    if (images.length === 0) {
        delete state.generatedImagesByRoom[state.activeRoomKey]
    } else {
        state.generatedImagesByRoom[state.activeRoomKey] = images
    }
}

const resetTransientBeautifierState = (state: BeautifierState) => {
    state.isBeautifying = false
    state.sceneImageData = null
    state.jobUuid = null
    state.jobState = null
    state.outputUrl = null
    state.errorMessage = null
}

const trimRoomImagesToLimit = (state: BeautifierState) => {
    const images = getActiveRoomImages(state)
    const overflow = images.length - MAX_GENERATED_IMAGES
    if (overflow <= 0) return

    setActiveRoomImages(state, images.slice(0, MAX_GENERATED_IMAGES))

    if (state.viewerImageIndex !== null && state.viewerImageIndex >= MAX_GENERATED_IMAGES) {
        state.viewerImageIndex = MAX_GENERATED_IMAGES - 1
    }
}

const getTodayDateString = (): string => new Date().toISOString().split('T')[0]

const getUpdatedDailyUsage = (lastUsageDate: string, dailyUsageCount: number): { date: string; count: number } => {
    const today = getTodayDateString()

    if (lastUsageDate !== today) {
        return { date: today, count: 1 }
    }

    return { date: today, count: dailyUsageCount + 1 }
}

export const initialState: BeautifierState = {
    dailyUsageCount: 0,
    lastUsageDate: '',
    hasRoomChanged: false,
    isBeautifying: false,
    sceneImageData: null,
    jobUuid: null,
    jobState: null,
    outputUrl: null,
    errorMessage: null,
    generatedImagesByRoom: {},
    activeRoomKey: null,
    viewerImageIndex: null,
    hideImageViewerDisclaimerPermanently: false,
}

export const beautifierSlice = createSlice({
    name: 'beautifier',
    initialState,
    reducers: {
        requestBeautify: (state) => {
            resetTransientBeautifierState(state)
            state.isBeautifying = true
        },
        cancelBeautify: (state) => {
            resetTransientBeautifierState(state)
        },
        captureSceneImageSuccess: (state, action: PayloadAction<string>) => {
            state.sceneImageData = action.payload
        },
        beautifierJobCreated: (state, action: PayloadAction<{ uuid: string; state: BeautifierJobState }>) => {
            state.jobUuid = action.payload.uuid
            state.jobState = action.payload.state
        },
        beautifierJobProgress: (state, action: PayloadAction<{ state: BeautifierJobState }>) => {
            state.jobState = action.payload.state
        },
        setActiveRoomKey: (state, action: PayloadAction<string | null>) => {
            state.activeRoomKey = action.payload
            state.viewerImageIndex = null
        },
        beautifyImageReceived: (state, action: PayloadAction<string>) => {
            if (!state.activeRoomKey) return
            const images = getActiveRoomImages(state)
            images.unshift(action.payload)
            if (state.viewerImageIndex !== null) {
                state.viewerImageIndex += 1
            }
            setActiveRoomImages(state, images)
            trimRoomImagesToLimit(state)
        },
        beautifySuccess: (state) => {
            state.isBeautifying = false
            state.hasRoomChanged = false
            state.outputUrl = null
            state.jobState = 'COMPLETED'
            const updated = getUpdatedDailyUsage(state.lastUsageDate, state.dailyUsageCount)
            state.dailyUsageCount = updated.count
            state.lastUsageDate = updated.date
        },
        beautifyFailure: (state, action: PayloadAction<string | undefined>) => {
            state.isBeautifying = false
            state.sceneImageData = null
            state.jobState = 'FAILED'
            state.errorMessage = action.payload ?? null
        },
        beautifyReset: (state) => {
            resetTransientBeautifierState(state)
        },
        roomChanged: (state) => {
            state.hasRoomChanged = true
        },
        openImageViewer: (state, action: PayloadAction<number>) => {
            state.viewerImageIndex = action.payload
        },
        closeImageViewer: (state) => {
            state.viewerImageIndex = null
        },
        deleteGeneratedImage: (state, action: PayloadAction<number>) => {
            const images = getActiveRoomImages(state)
            images.splice(action.payload, 1)
            setActiveRoomImages(state, images)
            if (images.length === 0) {
                state.viewerImageIndex = null
            } else if (state.viewerImageIndex !== null && state.viewerImageIndex >= images.length) {
                state.viewerImageIndex = images.length - 1
            }
        },
        hydrateBeautifierUsage: (state, action: PayloadAction<number>) => {
            state.dailyUsageCount = action.payload
            state.lastUsageDate = getTodayDateString()
        },
        permanentlyDismissImageViewerDisclaimer: (state) => {
            state.hideImageViewerDisclaimerPermanently = true
        },
    },
    extraReducers: (builder) => {
        builder.addCase(types.LOAD_UI_STATE_FROM_LOCAL_STORAGE, (state, action) => {
            const hideDisclaimer = (action as { payload?: { data?: { hideImageViewerDisclaimerPermanently?: boolean } } })
                .payload?.data?.hideImageViewerDisclaimerPermanently
            if (hideDisclaimer === true) {
                state.hideImageViewerDisclaimerPermanently = true
            }

            type HydrationPayload = {
                payload?: {
                    data?: {
                        generatedImagesByRoom?: GeneratedImagesByRoom
                        generatedImages?: string[]
                    }
                }
            }
            const payload = (action as HydrationPayload).payload?.data
            const savedByRoom = payload?.generatedImagesByRoom
            if (savedByRoom && typeof savedByRoom === 'object') {
                const trimmed: GeneratedImagesByRoom = {}
                Object.entries(savedByRoom).forEach(([key, imgs]) => {
                    if (Array.isArray(imgs) && imgs.length > 0) {
                        trimmed[key] = imgs.slice(0, MAX_GENERATED_IMAGES)
                    }
                })
                state.generatedImagesByRoom = trimmed
            } else {
                const legacyImages = payload?.generatedImages
                if (Array.isArray(legacyImages) && legacyImages.length > 0) {
                    state.generatedImagesByRoom = { _legacy: legacyImages.slice(0, MAX_GENERATED_IMAGES) }
                }
            }
        })
    },
})

export const {
    requestBeautify,
    cancelBeautify,
    captureSceneImageSuccess,
    beautifierJobCreated,
    beautifierJobProgress,
    setActiveRoomKey,
    beautifyImageReceived,
    beautifySuccess,
    beautifyFailure,
    beautifyReset,
    roomChanged,
    hydrateBeautifierUsage,
    openImageViewer,
    closeImageViewer,
    deleteGeneratedImage,
    permanentlyDismissImageViewerDisclaimer,
} = beautifierSlice.actions
