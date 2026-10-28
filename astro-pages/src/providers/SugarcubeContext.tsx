import React, { createContext, useContext, useMemo } from 'react'
import { detectDevice } from '@utils/isMobile'
import type { GPUStats } from 'Renderer/gpuDetect/GPUDetector'

// Simplified context matching the main app's SugarcubeContext
interface SugarcubeContextType {
    isMobile: boolean
    isTablet: boolean
    isDeviceDetected: boolean
    locale: string
    market: string
    gpuStats: GPUStats | null
}

const SugarcubeContext = createContext<SugarcubeContextType>({
    isMobile: false,
    isTablet: false,
    isDeviceDetected: false,
    // eslint-disable-next-line i18next/no-literal-string
    locale: 'en-US',
    // eslint-disable-next-line i18next/no-literal-string
    market: 'us/en',
    gpuStats: null,
})

export const SugarcubeProvider = ({
    children,
    locale,
    market,
}: {
    children: React.ReactNode
    locale: string
    market: string
}) => {
    // Always start with false to match SSR, then update after mount
    const [deviceType, setDeviceType] = React.useState({
        isMobile: false,
        isTablet: false,
        isDeviceDetected: false,
    })

    const [gpuStats, setGpuStats] = React.useState<GPUStats | null>(null)

    // Detect device on client-side AFTER hydration completes
    React.useEffect(() => {
        const device = detectDevice()
        setDeviceType({
            isMobile: device.category === 'mobile',
            isTablet: device.category === 'tablet',
            isDeviceDetected: true,
        })
    }, [])

    // Fetch GPU stats on client-side
    React.useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined') return

        const fetchGPUInfo = async () => {
            try {
                // Dynamically import CachedGPUDetector to avoid SSR issues
                // eslint-disable-next-line import/no-extraneous-dependencies
                const { CachedGPUDetector } = await import('Renderer/gpuDetect/CachedGPUDetector')
                const gpuDetector = new CachedGPUDetector()
                const stats = await gpuDetector.fetchGPUStats()
                setGpuStats(stats)
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Failed to fetch GPU stats:', error)
                // Set a fallback value so consumers know detection failed
                setGpuStats({
                    tier: 0,
                    isMobile: undefined,
                    // eslint-disable-next-line i18next/no-literal-string
                    gpu: 'unknown',
                    elapsedTime: 0,
                    cached: false,
                    type: 'FALLBACK',
                    fps: undefined,
                })
            }
        }

        fetchGPUInfo()
    }, [])

    const contextValue = useMemo(
        () => ({ isMobile: deviceType.isMobile, isTablet: deviceType.isTablet, isDeviceDetected: deviceType.isDeviceDetected, locale, market, gpuStats }),
        [deviceType.isMobile, deviceType.isTablet, deviceType.isDeviceDetected, locale, market, gpuStats],
    )

    return <SugarcubeContext.Provider value={contextValue}>{children}</SugarcubeContext.Provider>
}

export const useSugarcubeContext = () => useContext(SugarcubeContext)
