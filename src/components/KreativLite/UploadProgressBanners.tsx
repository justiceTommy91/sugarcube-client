import React from 'react'
import { UploadProgressBanner } from './UploadProgressBanner'
import UploadProgressBannerMobile from './UploadProgressBannerMobile'
import { useSceneProcessing } from './useSceneProcessing'
import type { ProcessingTracking } from './utils/analyticsTracking'

interface UploadProgressBannersProps {
    sceneId: string | null
    processingTracking?: ProcessingTracking
    onComplete: (sceneUuid: string) => void
    allowGuest?: boolean
    isFromFmf?: boolean
}

/**
 * Renders both the desktop and mobile upload progress banners from a single
 * `useSceneProcessing` hook call, ensuring analytics and navigation fire only once.
 */
const UploadProgressBanners: React.FC<UploadProgressBannersProps> = ({
    sceneId,
    processingTracking,
    onComplete,
    isFromFmf,
    allowGuest,
}) => {
    const sceneState = useSceneProcessing(sceneId, onComplete, processingTracking, allowGuest)
    return (
        <>
            <UploadProgressBanner sceneId={sceneId} sceneState={sceneState} />
            <UploadProgressBannerMobile sceneId={sceneId} sceneState={sceneState} isFromFmf={isFromFmf} />
        </>
    )
}

export default UploadProgressBanners
