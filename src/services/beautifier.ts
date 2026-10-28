import axios from 'axios'
import axiosRetry from 'axios-retry'
import * as Sentry from '@sentry/react'
import fetch from 'services'
import { addJitter } from 'utils/async'
import { getHostname } from 'utils/urlParams'

const BEAUTIFIER_POLL_INITIAL_DELAY = 2000
const BEAUTIFIER_POLL_MAX_DELAY = 5000
const BEAUTIFIER_POLL_MAX_ATTEMPTS = 120

/** i18n key — shown via toast with `t(key, { defaultValue: key })`. */
export const BEAUTIFY_ERROR_I18N_UNAUTHORIZED = 'design.beautify error unauthorized'

/**
 * When set (e.g. CTE), beautifier calls that host directly.
 * When unset, uses the same base as other SugarCube API calls (`getApiPrefix()` in `services/index.ts`).
 * `allowGuest: false` strips the Authorization header for guest sessions —
 * `/beautifier/` and `/uploads/` require a real authenticated user.
 */
function getBeautifierFetchSettings(): { allowGuest: false; baseUrl?: string } {
    const raw = process.env.GATSBY_BEAUTIFIER_API?.trim()
    return {
        allowGuest: false,
        ...(raw ? { baseUrl: raw.replace(/\/+$/, '') } : {}),
    }
}

function getDevAuthHeaders(): Record<string, string> {
    const hostname = getHostname()
    const isLocal =
        hostname === 'localhost' ||
        hostname === process.env.GATSBY_SUGARCUBE_CUSTOM_ORIGIN
    if (process.env.GATSBY_BEAUTIFIER_API?.trim() || isLocal) {
        return { 'X-Geomagical-Dev-Auth': '1' }
    }
    return {}
}

/** User-facing message or i18n key for `beautifyFailure` / error toast. */
export function formatBeautifierApiError(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const status = error.response?.status
        const data = error.response?.data as { detail?: unknown } | undefined
        const detail = data?.detail
        if (typeof detail === 'string' && detail.trim() !== '') {
            return detail
        }
        if (status === 401) {
            return BEAUTIFY_ERROR_I18N_UNAUTHORIZED
        }
        if (status === 403) {
            return 'design.beautify error forbidden'
        }
        if (status === 503) {
            return 'design.beautify error unavailable'
        }
    }
    if (error instanceof Error && error.message.trim() !== '') {
        return error.message
    }
    return 'design.beautify error generic'
}

/** GCS V4 signing expects a concrete type; empty blob.type can 500 the uploads API. */
function uploadContentType(blob: Blob): string {
    return blob.type && blob.type.trim() !== '' ? blob.type : 'image/jpeg'
}

export type BeautifierView = 'FRONT' | 'RIGHT' | 'BACK' | 'LEFT' | 'TOP' | 'DOLLHOUSE'
export type BeautifierResolution = '512' | '1K'

export interface BeautifierJobResponse {
    uuid: string
    state: string
    sceneUuid: string
    compositionUuid: string | null
    isFinished: boolean
    outputUrl: string | null
    errorMessage: string | null
}

interface CreateUploadResponse {
    uuid: string
    urls: Array<{
        path: string
        contentType: string
        contentMd5: string | null
        headers: string | null
        url: string
        completed: boolean
        isUploaded: boolean
    }>
    completed: boolean
}

interface CreateBeautifierJobParams {
    uploadUuid: string
    sceneUuid: string
    roomType: string
    compositionId?: string | null
    view?: BeautifierView
    resolution?: BeautifierResolution
    aspectRatio?: number
}

const uploadAxios = axios.create()
axiosRetry(uploadAxios, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
})

export async function createBeautifierUpload(blob: Blob, filename: string): Promise<CreateUploadResponse> {
    const contentType = uploadContentType(blob)
    const response = await fetch<CreateUploadResponse>(
        // use_custom_domain=true: production signing uses UPLOAD_API_BUCKET_ACCESS_POINT (required for IKEA upload host).
        '/uploads/?use_custom_domain=true',
        {
            method: 'POST',
            headers: getDevAuthHeaders(),
            data: {
                urls: [
                    {
                        path: filename,
                        // Same shape as imageUpload.ts / envmapUpload.ts — FileSerializer expects content_type.
                        content_type: contentType,
                    },
                ],
            },
        },
        getBeautifierFetchSettings(),
    )
    return response.data
}

export async function uploadBlobToGCS(signedUrl: string, blob: Blob): Promise<void> {
    await uploadAxios({
        url: signedUrl,
        method: 'PUT',
        headers: { 'Content-Type': uploadContentType(blob) },
        data: blob,
    })
}

export async function notifyUploadComplete(uploadUuid: string, filePath: string): Promise<void> {
    await fetch(
        `/uploads/${uploadUuid}/uploadNotify/`,
        {
            method: 'POST',
            headers: getDevAuthHeaders(),
            data: {
                urls: [{ path: filePath }],
            },
        },
        getBeautifierFetchSettings(),
    )
}

export async function createBeautifierJob(params: CreateBeautifierJobParams): Promise<BeautifierJobResponse> {
    const response = await fetch<BeautifierJobResponse>(
        '/beautifier/',
        {
            method: 'POST',
            headers: getDevAuthHeaders(),
            data: {
                uploadUuid: params.uploadUuid,
                sceneUuid: params.sceneUuid,
                roomType: params.roomType,
                compositionId: params.compositionId ?? undefined,
                view: params.view ?? 'DOLLHOUSE',
                resolution: params.resolution ?? '1K',
                aspectRatio: params.aspectRatio ?? undefined,
            },
        },
        getBeautifierFetchSettings(),
    )
    return response.data
}

export async function getBeautifierJobStatus(jobUuid: string): Promise<BeautifierJobResponse> {
    const response = await fetch<BeautifierJobResponse>(
        `/beautifier/${jobUuid}/`,
        { headers: getDevAuthHeaders() },
        getBeautifierFetchSettings(),
    )
    return response.data
}

function extensionFromUrl(url: string): string {
    try {
        const pathname = new URL(url).pathname
        const match = pathname.match(/\.(webp|png|jpe?g|gif)$/i)
        if (!match) return '.jpg'
        const ext = match[1].toLowerCase()
        return ext === 'jpeg' ? '.jpg' : `.${ext}`
    } catch {
        return '.jpg'
    }
}

function parseFilenameFromContentDisposition(header: string | null): string | undefined {
    if (!header) return undefined
    const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(header)
    const raw = match?.[1]?.trim()
    if (!raw) return undefined
    try {
        return decodeURIComponent(raw)
    } catch {
        return raw
    }
}

/** Fetches the beautifier result and triggers a browser file download (avoids opening the image in a tab). */
export async function downloadBeautifierOutputFile(url: string): Promise<void> {
    const httpResponse = await globalThis.fetch(url, { mode: 'cors', credentials: 'omit', cache: 'no-store' })
    if (!httpResponse.ok) {
        throw new Error(`Failed to download beautified image (${httpResponse.status})`)
    }
    const blob = await httpResponse.blob()
    const fromHeader = parseFilenameFromContentDisposition(httpResponse.headers.get('content-disposition'))
    const filename = fromHeader || `beautify-${Date.now()}${extensionFromUrl(url)}`

    const objectUrl = URL.createObjectURL(blob)
    try {
        const anchor = document.createElement('a')
        anchor.href = objectUrl
        anchor.download = filename
        anchor.style.display = 'none'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
    } finally {
        URL.revokeObjectURL(objectUrl)
    }
}

export async function pollBeautifierJob(
    jobUuid: string,
    onProgress?: (job: BeautifierJobResponse) => void,
    signal?: AbortSignal,
): Promise<BeautifierJobResponse> {
    const poll = async (attempt: number, delay: number): Promise<BeautifierJobResponse> => {
        if (signal?.aborted) {
            throw new Error('Beautifier polling cancelled')
        }

        if (attempt >= BEAUTIFIER_POLL_MAX_ATTEMPTS) {
            throw new Error('Beautifier job timed out')
        }

        const jitteredDelay = addJitter(delay)
        await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(resolve, jitteredDelay)
            signal?.addEventListener('abort', () => {
                clearTimeout(timeoutId)
                reject(new Error('Beautifier polling cancelled'))
            })
        })

        if (signal?.aborted) {
            throw new Error('Beautifier polling cancelled')
        }

        const job = await getBeautifierJobStatus(jobUuid)
        onProgress?.(job)

        if (job.isFinished && job.outputUrl) {
            return job
        }

        if (job.isFinished && job.errorMessage) {
            throw new Error(job.errorMessage)
        }

        if (job.state === 'FAILED') {
            throw new Error(job.errorMessage || 'Beautifier job failed')
        }

        const nextDelay = Math.min(delay * 1.5, BEAUTIFIER_POLL_MAX_DELAY)
        return poll(attempt + 1, nextDelay)
    }

    return poll(0, BEAUTIFIER_POLL_INITIAL_DELAY)
}

export async function uploadAndBeautify(
    blob: Blob,
    filename: string,
    params: Omit<CreateBeautifierJobParams, 'uploadUuid'>,
    onProgress?: (job: BeautifierJobResponse) => void,
    signal?: AbortSignal,
): Promise<BeautifierJobResponse> {
    try {
        const upload = await createBeautifierUpload(blob, filename)
        const signedUrl = upload.urls[0]?.url

        if (!signedUrl) {
            throw new Error('No signed URL returned from backend')
        }

        await uploadBlobToGCS(signedUrl, blob)
        await notifyUploadComplete(upload.uuid, filename)

        const job = await createBeautifierJob({
            uploadUuid: upload.uuid,
            ...params,
        })

        return await pollBeautifierJob(job.uuid, onProgress, signal)
    } catch (error) {
        Sentry.captureException(error, {
            contexts: {
                beautifier: {
                    sceneUuid: params.sceneUuid,
                    roomType: params.roomType,
                },
            },
        })
        throw error
    }
}
