/* eslint-disable no-await-in-loop */

import fetch from 'services'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import * as Sentry from '@sentry/react'
import * as tracker from 'utils/tracker'
import { isProd } from 'utils/environment'

interface UploadResponse {
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
    clientIdentifier: string | null
    properties: string | null
    resumable: boolean | null
    createdAt: string
    lastUpdatedTs: string
    user: number
}

const createUpload = async (): Promise<UploadResponse> => {
    const response = await fetch<UploadResponse>('/uploads/', {
        method: 'POST',
        data: {
            urls: [{
                content_type: 'image/hdr',
                path: 'environment.hdr',
            }]
        },
        ...isProd ? {
            params: { use_custom_domain: true }
        } : {},
    })
    return response.data
}

const checkUpload = async (uuid: string): Promise<UploadResponse> => {
    const response = await fetch<UploadResponse>(`/uploads/${uuid}/uploadNotify/`, {
        method: 'POST',
        data: {
            urls: [{ path: 'environment.hdr' }]
        }
    })
    return response.data
}

export const uploadEnvmap = async (blob: Blob | null | undefined) => {
    if (!blob) {
        return null
    }

    const startTime = Date.now()

    let uploadRetries = 0

    const axiosInstance = axios.create()
    
    axiosRetry(axiosInstance, {
        retries: 3,
        retryDelay: axiosRetry.exponentialDelay,
        onRetry: (retryNumber) => { uploadRetries = retryNumber },
    })

    try {
        const createUploadResponse = await createUpload()
        const uploadUuid = createUploadResponse.uuid
        const signedUrl = createUploadResponse.urls[0]?.url

        if (!signedUrl) {
            throw new Error('No signed URL returned from backend.')
        }

        await axiosInstance.put(signedUrl, blob, {
            headers: { 'Content-Type': 'image/hdr' }
        })

        const uploadTime = Date.now()

        tracker.workflow('RoomBuilder.EnvmapUploaded', {
            duration: uploadTime - startTime,
            size: blob.size,
            uploadRetries,
            uploadUuid,
        })

        await checkUpload(uploadUuid)

        const processTime = Date.now()

        tracker.workflow('RoomBuilder.EnvmapProcessed', {
            duration: processTime - uploadTime,
            uploadUuid,
        })
    
        return uploadUuid

    } catch (error) {
        Sentry.captureException(error)        
        return null
    }
}

