declare global {
    interface DocumentEventMap {
        ikeaCookieConsent: CustomEvent<Record<ikea.TrackingConsent, boolean>>
    }

    namespace ikea {
        type NecessaryCookieConsent = 1
        type PerformanceCookieConsent = 2
        type FunctionalCookieConsent = 3
        type MarketingCookieConsent = 4

        type TrackingConsent =
            | NecessaryCookieConsent
            | PerformanceCookieConsent
            | FunctionalCookieConsent
            | MarketingCookieConsent

        interface CookieConsentService {
            hasConsent: (type: TrackingConsent) => boolean
        }
    }
}

export {}
