import * as Sentry from '@sentry/react'
import { takeEvery, takeLatest, call, put, select, cancelled, race, take } from 'redux-saga/effects'
import {
    PLACE_RENDER_ITEM,
    CLICK_PLACE_RENDER_ITEM,
    CLICK_PLACE_MULTIPLE_RENDER_ITEMS,
    REMOVE_RENDER_ITEMS,
    STOP_DRAG_RENDER_ITEM,
    SWAP_RENDER_ITEM,
    DUPLICATE_RENDER_ITEM,
} from 'models/actionTypes'
import { GeomViewer } from 'Renderer/geomviewer/geom_init'
import { getActiveSceneId, getSelectedCompositionId, getSelectedSceneRoomType, getSelectedView } from 'models/compositions/selectors'
import { OPTIMIZELY_BEAUTIFY_ROOM } from 'models/tracking/constants'
import { experimentsService } from 'services/experiments'
import {
    createBeautifierUpload,
    uploadBlobToGCS,
    notifyUploadComplete,
    createBeautifierJob,
    pollBeautifierJob,
    formatBeautifierApiError,
    type BeautifierJobResponse,
    type BeautifierView,
} from 'services/beautifier'
import {
    roomChanged,
    requestBeautify,
    cancelBeautify,
    captureSceneImageSuccess,
    beautifierJobCreated,
    beautifyImageReceived,
    beautifySuccess,
    beautifyFailure,
    setActiveRoomKey,
    buildRoomKey,
    closeImageViewer,
} from './slice'
import { getIsViewerOpen } from './selectors'
import type { BeautifierJobState } from './constants'

export const ROOM_CHANGE_ACTIONS = [
    PLACE_RENDER_ITEM,
    CLICK_PLACE_RENDER_ITEM,
    CLICK_PLACE_MULTIPLE_RENDER_ITEMS,
    REMOVE_RENDER_ITEMS,
    STOP_DRAG_RENDER_ITEM,
    SWAP_RENDER_ITEM,
    DUPLICATE_RENDER_ITEM,
]

export function* handleRoomChange() {
    const isViewerOpen: boolean = yield select(getIsViewerOpen)
    if (isViewerOpen) {
        yield put(closeImageViewer())
    }
    yield put(roomChanged())
}

export function dataUrlToBlob(dataUrl: string): Blob {
    const [header, base64] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i)
    }
    return new Blob([bytes], { type: mime })
}

/** Semantic names (e.g. tracking) — kept for compatibility. */
const SEMANTIC_VIEW_MAP: Record<string, BeautifierView> = {
    front: 'FRONT',
    right: 'RIGHT',
    back: 'BACK',
    left: 'LEFT',
    top: 'TOP',
    dollhouse: 'DOLLHOUSE',
}

/**
 * Maps the current GeomViewer view label to the beautifier API enum.
 * Redux stores `viewId` from `viewSelected`, which matches labels from
 * `ViewManager` / `queryViewerInfo().views`: `mainView`, then `view-1`, `view-2`, …
 * (see `ViewManager.initialize` — index 0 is canonical “front” room view).
 */
export function mapViewToBeautifierView(view: string | null | undefined): BeautifierView {
    if (!view || view.trim() === '') return 'DOLLHOUSE'

    const key = view.trim().toLowerCase()

    const semantic = SEMANTIC_VIEW_MAP[key]
    if (semantic) return semantic

    if (key === 'mainview') return 'FRONT'

    const indexed = /^view-(\d+)$/.exec(key)
    if (indexed) {
        const n = Number.parseInt(indexed[1], 10)
        switch (n) {
            case 1:
                return 'RIGHT'
            case 2:
                return 'BACK'
            case 3:
                return 'LEFT'
            case 4:
                return 'TOP'
            case 5:
            case 6:
                return 'DOLLHOUSE'
            default:
                return 'DOLLHOUSE'
        }
    }

    return 'DOLLHOUSE'
}

const BEAUTIFY_TARGET_PIXELS = 1920 * 1080

/**
 * Compute capture dimensions that preserve the given aspect ratio while
 * targeting roughly the same total pixel count as 1920×1080 (~2 MP).
 */
export function computeCaptureDimensions(
    viewportWidth: number,
    viewportHeight: number,
): { width: number; height: number } {
    const aspect = viewportWidth / viewportHeight
    const height = Math.round(Math.sqrt(BEAUTIFY_TARGET_PIXELS / aspect))
    const width = Math.round(height * aspect)
    return { width, height }
}

export function* runBeautifyFlow(abortController: AbortController) {
    try {
        const viewportSize = GeomViewer.bindings?.getViewportSize()
        const { width: captureW, height: captureH } = viewportSize
            ? computeCaptureDimensions(viewportSize.width, viewportSize.height)
            : { width: 1920, height: 1080 }

        const canvas: HTMLCanvasElement | undefined = GeomViewer.bindings?.renderFlat(captureW, captureH)
        if (!canvas) {
            yield put(beautifyFailure('Failed to render flat image'))
            return null
        }
        const thumbDataUrl = canvas.toDataURL('image/jpeg', 0.92)
        yield put(captureSceneImageSuccess(thumbDataUrl))

        const blob: Blob = yield call(dataUrlToBlob, thumbDataUrl)
        const filename = `beautify-${Date.now()}.jpg`

        const sceneUuid: string | null = yield select(getActiveSceneId)
        const compositionId: string | null = yield select(getSelectedCompositionId)
        const roomType: string | null = yield select(getSelectedSceneRoomType)
        const selectedView: string | null = yield select(getSelectedView)

        if (!sceneUuid) {
            yield put(beautifyFailure('No scene selected'))
            return null
        }

        const view = mapViewToBeautifierView(selectedView)
        const aspectRatio = captureW / captureH

        const upload: Awaited<ReturnType<typeof createBeautifierUpload>> = yield call(
            createBeautifierUpload,
            blob,
            filename,
        )
        const signedUrl = upload.urls[0]?.url
        if (!signedUrl) {
            throw new Error('No signed URL returned from backend')
        }

        yield call(uploadBlobToGCS, signedUrl, blob)
        yield call(notifyUploadComplete, upload.uuid, filename)

        const job: BeautifierJobResponse = yield call(createBeautifierJob, {
            uploadUuid: upload.uuid,
            sceneUuid,
            roomType: roomType || 'living_room',
            compositionId: compositionId && compositionId !== '-1' ? compositionId : undefined,
            view,
            resolution: '1K',
            aspectRatio,
        })

        yield put(beautifierJobCreated({ uuid: job.uuid, state: job.state as BeautifierJobState }))

        const result: BeautifierJobResponse = yield call(
            pollBeautifierJob,
            job.uuid,
            () => {
                // Progress is tracked via polling; the saga dispatches final state below
            },
            abortController.signal,
        )

        if (!result.outputUrl) {
            throw new Error('Beautifier job completed without an output URL')
        }

        return result
    } finally {
        const wasCancelled: boolean = yield cancelled()
        if (wasCancelled) {
            abortController.abort()
        }
    }
}

export function* handleCaptureSceneImage() {
    const abortController = new AbortController()

    try {
        const { result, cancelRequested }: {
            result?: BeautifierJobResponse | null
            cancelRequested?: { type: string }
        } = yield race({
            result: call(runBeautifyFlow, abortController),
            cancelRequested: take(cancelBeautify.type),
        })

        if (cancelRequested || !result) {
            return
        }

        const outputUrl = result.outputUrl
        if (!outputUrl) {
            return
        }

        const sceneId: string | null = yield select(getActiveSceneId)
        const compId: string | null = yield select(getSelectedCompositionId)
        yield put(setActiveRoomKey(buildRoomKey(sceneId, compId)))
        yield put(beautifyImageReceived(outputUrl))
        yield put(beautifySuccess())
        yield call(experimentsService.track, OPTIMIZELY_BEAUTIFY_ROOM)
    } catch (error) {
        if ((error as Error).message === 'Beautifier polling cancelled') {
            return
        }
        yield call(Sentry.captureException, error)
        yield put(beautifyFailure(formatBeautifierApiError(error)))
    } finally {
        const wasCancelled: boolean = yield cancelled()
        if (wasCancelled) {
            abortController.abort()
        }
    }
}

export function* watchRoomChanges() {
    yield takeEvery(ROOM_CHANGE_ACTIONS, handleRoomChange)
}

export function* watchRequestBeautify() {
    yield takeLatest(requestBeautify.type, handleCaptureSceneImage)
}

export const beautifierSagas = [watchRoomChanges(), watchRequestBeautify()]
