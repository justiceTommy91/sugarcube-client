import type {
    ExperimentsApi as SDKExperimentsApi,
    ExperimentsClient as SDKExperimentsClient,
    ExperimentOptions as SDKExperimentOptions,
    Decision as SDKDecision,
    Init as SDKInit,
    Track as SDKTrack,
    Close as SDKClose,
    Decide as SDKDecide,
    EventTags as SDKEventTags,
    ContentSquareOptions as SDKContentSquareOptions,
    IkeaAnalyticsOptions as SDKIkeaAnalyticsOptions,
} from './ikea/exptSDK'

declare global {
    namespace ikea {
        interface ZipObject {
            postalCode?: string
        }

        // Re-export SDK types in global namespace
        type ExperimentsApi = SDKExperimentsApi
        type ExperimentsClient = SDKExperimentsClient
        type ExperimentOptions = SDKExperimentOptions
        type Decision = SDKDecision
        type Init = SDKInit
        type Track = SDKTrack
        type Close = SDKClose
        type Decide = SDKDecide
        type EventTags = SDKEventTags
        type ContentSquareOptions = SDKContentSquareOptions
        type IkeaAnalyticsOptions = SDKIkeaAnalyticsOptions

        interface Globals {
            authentication?: AuthenticationService
            experiment?: ExperimentService | ExperimentsApi
            exptSDK?: ExperimentsApi
            cookieConsent?: CookieConsentService
            postalCode?: PostalCodeService
            pubsub?: PubsubService
            store?: StoreService
        }
    }
    var ikea: ikea.Globals | undefined
}

export {}
