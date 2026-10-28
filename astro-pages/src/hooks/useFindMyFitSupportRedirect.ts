import { useEffect } from 'react'
import { useSugarcubeContext } from '@providers/SugarcubeContext'
import { track } from '@utils/tracker'
import {
    FMF_UNSUPPORTED_DEVICE_REDIRECT,
    FMF_UNSUPPORTED_DEVICE_REASON_DESKTOP,
    FMF_UNSUPPORTED_DEVICE_REASON_GPU_TIER,
} from '@lib/tracking/constants'

/**
 * Redirects to /home-design when the device does not support Find My Fit:
 * - GPU tier 0 (too low to render)
 * - Desktop devices (Find My Fit is a mobile-only experience)
 */
export const useFindMyFitSupportRedirect = (market: string) => {
    const { gpuStats, isMobile, isTablet, isDeviceDetected } = useSugarcubeContext()
    const isDesktop = !isMobile && !isTablet

    useEffect(() => {
        if (!isDeviceDetected) return
        if (isDesktop) {
            track(FMF_UNSUPPORTED_DEVICE_REDIRECT, { Reason: FMF_UNSUPPORTED_DEVICE_REASON_DESKTOP })
            window.location.href = `/${market}/home-design`
            return
        }
        if (gpuStats !== null && gpuStats.tier === 0) {
            track(FMF_UNSUPPORTED_DEVICE_REDIRECT, { Reason: FMF_UNSUPPORTED_DEVICE_REASON_GPU_TIER })
            window.location.href = `/${market}/home-design`
        }
    }, [gpuStats, isDesktop, isDeviceDetected, market])
}
