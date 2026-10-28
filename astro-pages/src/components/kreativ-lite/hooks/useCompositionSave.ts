import { useState, useCallback, useRef } from 'react'
import fetchWrapper from '@astro-services/index'
import type { SceneItemTracker } from './useSceneItemTracker'

// Desired thumbnail aspect ratio — matches Gatsby's MESH_ROOM_THUMBNAIL_ASPECT_RATIO_W_H.
const THUMBNAIL_ASPECT_RATIO_W_H = 16 / 10
// eslint-disable-next-line i18next/no-literal-string
const THUMBNAIL_MIME_TYPE = 'image/jpeg'
// eslint-disable-next-line i18next/no-literal-string
const COMPOSITIONS_QUERY_PARAMS = '?manifest_mode=manifest,gltf_manifest'

/**
 * Captures a cropped 16:10 JPEG thumbnail from the WebGL canvas.
 * Mirrors MeshBasedRenderEngine.takeRoomScreenshot crop logic.
 * Returns undefined if the canvas is unavailable or produces a blank image.
 */
function captureCanvasThumbnail(canvas: HTMLCanvasElement): string | undefined {
    try {
        const srcW = canvas.width
        const srcH = canvas.height
        const currentAR = srcW / srcH

        const croppedW = currentAR > THUMBNAIL_ASPECT_RATIO_W_H ? srcH * THUMBNAIL_ASPECT_RATIO_W_H : srcW
        const croppedH = currentAR > THUMBNAIL_ASPECT_RATIO_W_H ? srcH : srcW / THUMBNAIL_ASPECT_RATIO_W_H
        const cropX = (srcW - croppedW) / 2
        const cropY = (srcH - croppedH) / 2

        const thumb = document.createElement('canvas')
        thumb.width = Math.round(croppedW)
        thumb.height = Math.round(croppedH)
        const thumbCtx = thumb.getContext('2d')
        if (!thumbCtx) return undefined

        thumbCtx.drawImage(canvas, cropX, cropY, croppedW, croppedH, 0, 0, thumb.width, thumb.height)
        return thumb.toDataURL(THUMBNAIL_MIME_TYPE, 0.92)
    } catch {
        return undefined
    }
}

export interface SavedComposition {
    compositionId: string
    shareUrl: string | null
}

interface APICompositionResponse {
    uuid: string
    compositionId: number
    shareUrl: string | null
}

interface UseCompositionSaveOptions {
    sceneId: string
    tracker: SceneItemTracker
    canvasElement: HTMLCanvasElement | null
    name?: string
    initialCompositionId?: string
}

export const COMPOSITION_SAVE_STATE = {
    IDLE: 'idle',
    SAVING: 'saving',
    SHARING: 'sharing',
    SAVED: 'saved',
    ERROR: 'error',
} as const

export type CompositionSaveState = (typeof COMPOSITION_SAVE_STATE)[keyof typeof COMPOSITION_SAVE_STATE]

/**
 * Handles saving the current kreativ-lite composition via the API.
 *
 * - save(): POST /compositions/ privately (isShared: false) — or PUT on subsequent calls
 * - share(): PUT /compositions/{id}/ with isShared: true + enableRemix: true so the link works
 *
 * Always call save() before share(). share() requires a compositionId from a prior save().
 */
export function useCompositionSave({
    sceneId,
    tracker,
    canvasElement,
    name = 'My IKEA design',
    initialCompositionId,
}: UseCompositionSaveOptions) {
    const [state, setState] = useState<CompositionSaveState>(COMPOSITION_SAVE_STATE.IDLE)
    const [saved, setSaved] = useState<SavedComposition | null>(() =>
        initialCompositionId ? { compositionId: initialCompositionId, shareUrl: null } : null,
    )
    // Mirror in a ref so saveWithFlags can read the latest value without a stale closure.
    const savedRef = useRef<SavedComposition | null>(
        initialCompositionId ? { compositionId: initialCompositionId, shareUrl: null } : null,
    )

    const saveWithFlags = useCallback(
        async (
            isShared: boolean,
            enableRemix: boolean,
            savingState: CompositionSaveState,
        ): Promise<SavedComposition | null> => {
            setState(savingState)
            try {
                const placedFurniture = tracker.getPlacedFurniture()
                const savedProperties = tracker.getSavedProperties()
                const baseImageData = canvasElement ? captureCanvasThumbnail(canvasElement) : undefined

                const payload = {
                    name,
                    sceneId,
                    placedFurniture,
                    savedProperties,
                    isShared,
                    enableRemix,
                    isStock: false,
                    remixParent: undefined,
                    baseImageData,
                    geo_properties: {},
                }

                const queryParams = COMPOSITIONS_QUERY_PARAMS
                let response: APICompositionResponse

                if (savedRef.current?.compositionId) {
                    response = await fetchWrapper<APICompositionResponse>(
                        `/compositions/${savedRef.current.compositionId}/${queryParams}`,
                        {
                            method: 'PUT',
                            body: JSON.stringify({ ...payload, compositionId: savedRef.current.compositionId }),
                        },
                    )
                } else {
                    response = await fetchWrapper<APICompositionResponse>(`/compositions/${queryParams}`, {
                        method: 'POST',
                        body: JSON.stringify(payload),
                    })
                }

                const result: SavedComposition = {
                    compositionId: response.uuid ?? String(response.compositionId),
                    shareUrl: response.shareUrl,
                }
                savedRef.current = result
                setSaved(result)
                tracker.resetDirtyFlag()
                setState(COMPOSITION_SAVE_STATE.SAVED)
                return result
            } catch {
                setState(COMPOSITION_SAVE_STATE.ERROR)
                return null
            }
        },
        [sceneId, tracker, canvasElement, name],
    )

    const save = useCallback(() => saveWithFlags(false, false, COMPOSITION_SAVE_STATE.SAVING), [saveWithFlags])

    const share = useCallback(() => saveWithFlags(true, true, COMPOSITION_SAVE_STATE.SHARING), [saveWithFlags])

    return {
        save,
        share,
        state,
        isSaved: saved !== null,
        shareUrl: saved?.shareUrl ?? null,
        compositionId: saved?.compositionId ?? null,
    }
}
