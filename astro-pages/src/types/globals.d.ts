// Global type declarations for the Astro app
/// <reference types="vitest/globals" />
// Note: ikea namespace types are imported from ../src/types/ikea.d.ts
// Note: DocumentEventMap (ikeaExperimentReady, ikeaCookieConsent) are in ../src/types/ikea/

declare global {
    interface Window {
        mixpanel?: {
            track: (event: string, properties?: Record<string, any>) => void
            identify: (id: string) => void
            get_distinct_id: () => string
            init: (token: string, config?: Record<string, any>) => void
        }
        gtag?: (command: string, action: string, params?: Record<string, any>) => void
        ikea?: {
            authentication?: {
                getTokens(callback: (error: unknown, tokens: {
                    auth?: { expirationTime: number; value: string }
                    guest?: { expirationTime: number; value: string }
                }) => void): void
            }
        }
    }
}

export {}
