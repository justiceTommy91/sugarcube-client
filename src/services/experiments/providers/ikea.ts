import { getHref, getTestCycleId, getUrlContext, getIsOptimizelyDebug } from 'models/location/selectors'

import { getTestingEnv, isProd } from 'utils/environment'
import { isTouchOnlyDevice } from 'utils/isMobile'
import * as tracker from 'utils/tracker'

import * as fetchApi from 'services'
import * as userApi from 'services/user'

import {
    type ChosenVariations,
    type Experiment,
    type Variation,
    type ExperimentDefinition,
    experiments,
    isVariationOf,
    experimentDefinitions,
} from '../experiments'
import { type DecidedFlags, type Flag, flags } from '../flags'
import { recordExperimentDecision, recordFlagDecision, displayDebugSummary } from '../optimizely-debug'
import type { ExperimentsProvider } from '../types'

// ====================================================================================================================
// Configuration
// -------------
// Developers are expected to modify the mapping structures whenever there is a change in IKEA Optimizely's
// configuration.
// ====================================================================================================================

/**
 * Mapping of experiment {@link Variation} to IKEA Optimizely variation keys.
 *
 * Keys are the {@link Variation} names in our application for a particular {@link Experiment}, while values are the
 * IKEA Optimizely variation keys used to identify that variation in Optimizely.
 */
type VariationMapper<Exp extends Experiment> = { [Var in Variation<Exp>]: string }

/**
 * Mapping of {@link Experiment} to IKEA Optimizely experiment keys.
 *
 * Keys are the names of {@link Experiment} in our application, while values define how to map that experiment to
 * experiment and variation keys in IKEA Optimizely.
 */
type ExperimentMapper = {
    [Exp in Experiment]?: {
        /**
         * Key used in IKEA Optimizely to identify this experiment.
         */
        key: string
        variations: VariationMapper<Exp>
    }
}

/**
 * Mappings of experiment/variation names to IKEA Optimizely experiment/variation keys.
 *
 * Whenever we add a new experiment that we wish Optimizely to control a new entry in this structure must be made to
 * map the {@link Experiment} name and {@link Variation} names known in our application to the experiment/variation
 * keys that Optimizely knows about.
 *
 * @see ExperimentMapper
 */
const experimentMapper: ExperimentMapper = {
    RoomDimensions: {
        key: 'room_dimensions',
        variations: {
            disabled: 'disabled',
            enabled: 'enabled',
        },
    },
    ProductDimensions: {
        key: 'product_dimensions',
        variations: {
            disabled: 'disabled',
            enabled: 'enabled',
        },
    },
    DynamicMeasurements: {
        key: 'dynamic_measurements',
        variations: {
            disabled: 'disabled',
            enabled: 'enabled',
        },
    },
    HowItWorks: {
        key: 'how_it_works',
        variations: {
            control: 'control',
            imageHeader: 'imageHeader',
            videoHeader: 'videoHeader',
        },
    },
    StarterSet: {
        key: 'starter_set',
        variations: {
            disabled: 'disabled',
            enabled: 'enabled',
        },
    },
    ShowroomAB: {
        key: 'showroom_ab',
        variations: {
            off: 'off',
            disabled: 'disabled',
            alternate_showrooms: 'alternate_showrooms',
            alternate_showrooms_v2: 'alternate_showrooms_v2',
        },
    },
    KreativLite: {
        key: 'kreativ_lite',
        variations: {
            disabled: 'disabled',
            enabled: 'enabled',
        },
    },
    Beautifier: {
        key: 'beautifier',
        variations: {
            disabled: 'disabled',
            enabled: 'enabled',
        },
    },
    EnableNewWallColors: {
        key: 'enable_new_wall_colors',
        variations: {
            disabled: 'disabled',
            enabled: 'enabled',
        },
    },
}

/**
 * Mapping of {@link Flag} names to IKEA Optimizely flag keys.
 *
 * Keys are our application's {@link Flag} names while values are the corresponding flag keys used to identify the flag
 * in IKEA Optimizely.
 */
type FlagMapper = { [F in Flag]?: string }

/**
 * Mapping of {@link Flag} names to IKEA Optimizely flag keys.
 *
 * Whenever we add a new flag that we wish IKEA Optimizely to control, we must add an entry to this mapping structure.
 */
const flagMapper: FlagMapper = {
    WallColorAntialias: 'webWallColorAntialias',
    OwnRoomColor: 'webOwnroomColor',
    HelaWallColor: 'helaWallColor',
    CameraOrbitMode: 'cameraOrbitMode',
    ExpertCheck: 'ExpertCheck',
    Morpheus: 'webmorpheus',
    AutoShowProductDimensions: 'autoShowProductDimensions',
    RoomBuilderNodeEditing: 'roomBuilderNodeEditing',
    RoomBuilderEnvmapUploading: 'room_builder_envmap_upload',
    LowEndLightCustomizations: 'gfx_gtao_sunlight_tier3',
    DuvetV2: 'duvetv2',
}

// ====================================================================================================================
// Implementation
// --------------
// Developers are not expected to modify this code unless new experiment service features or bugs need to be addressed.
// ====================================================================================================================

/**
 * Check if we're running on an IKEA domain where the exptSDK is expected to work.
 * The exptSDK will fail due to CORS if not on IKEA production or CTE/PPE.
 * However, when optimizely_debug is enabled, we override this check to allow testing on any domain.
 */
const isIkeaDomain = (): boolean => {
    if (typeof window === 'undefined') {
        return false
    }

    // Override domain check when debug mode is active
    if (getIsOptimizelyDebug()) {
        return true
    }

    const hostname = window.location.hostname
    return hostname.includes('ikea.com') || hostname.includes('ikeadt.com')
}

/**
 * Given a variation key from IKEA Optimizely, lookup the corresponding {@link Variation} for an experiment if one
 * exists and is correctly mapped.
 */
const lookupVariationFromKey = <Exp extends Experiment>(
    experiment: Exp,
    variationKey: string,
): Variation<Exp> | undefined => {
    const variations = experimentMapper[experiment]?.variations
    if (!variations) {
        return undefined
    }

    const [variation] = Object.entries(variations).find(([, key]) => key === variationKey) ?? []
    return variation as Variation<Exp> | undefined
}

/**
 * Synchronously check if the IKEA experiments API is available.
 * Returns the API instance if available, or null if not yet loaded.
 */
const ikeaExperimentsApiSync = (): ikea.ExperimentsApi | null => globalThis.ikea?.exptSDK ?? null

/**
 * Get additional session attributes not covered by exptSDK's automatic globalAttributes
 * These are the legacy attributes we want to preserve for specific experiments that need them
 */
const fetchSessionAttributes = async (): Promise<Record<string, string | number | null>> => {
    const testCycleId = getTestCycleId()
    const isTesting = getTestingEnv()
    const url = getHref()
    const { sceneId } = getUrlContext()

    let user = null
    // FIXME: currently authentication is implemented in redux, so we can't easily access user info.
    if (fetchApi.isAuthenticated()) {
        const response = await userApi.getUser()
        user = response.data
    }
    return {
        // Legacy attributes not covered by exptSDK globalAttributes
        userType: user?.userType ?? 'anonymous',
        isStaff: user?.isStaff ? 'true' : 'false',
        sceneId: sceneId || null,
        isTouchOnlyDevice: isTouchOnlyDevice() ? 'true' : 'false',
        isTesting: isTesting ? 'true' : 'false',
        testCycleId: testCycleId || null,
        url: url || null,
    }
}

const trackExperiments = async (optimizely: ikea.ExperimentsClient) => {
    const variationKeys: string[] = []

    // Get additional session attributes for context
    const additionalAttributes = await fetchSessionAttributes()

    // Only track experiments that are not marked as delayedDecision.
    // Delayed-decision experiments are skipped here and are tracked in decideExperiment().
    const eagerExperiments = experiments().filter(
        (exp) => !(experimentDefinitions[exp] as ExperimentDefinition).delayedDecision,
    )

    eagerExperiments.forEach((exp) => {
        const experimentKey = experimentMapper[exp]?.key
        if (!experimentKey) {
            return
        }
        const result = optimizely.decide(experimentKey, {
            attributes: additionalAttributes,
            decideOptions: { disableDecisionEvent: true },
        })

        if (!result.success || !result.decision || !result.decision.variationKey) {
            return
        }

        const variationKey = result.decision.variationKey
        // Only track variations that are not "off" (users not in the experiment should not be tracked)
        if (variationKey !== 'off') {
            variationKeys.push(`${experimentKey}:${variationKey}`)
        }
    })

    const flagVariants: string[] = []
    flags().forEach((flag) => {
        const flagKey = flagMapper[flag]
        if (!flagKey) {
            return
        }

        const result = optimizely.decide(flagKey, {
            attributes: additionalAttributes,
            decideOptions: { disableDecisionEvent: true },
        })

        if (!result.success || !result.decision || !result.decision.enabled) {
            return
        }

        flagVariants.push(`${flagKey}:on`)
    })

    if (variationKeys.length === 0 && flagVariants.length === 0) {
        return
    }

    tracker.track('OptimizelyExperiment', {
        ExperimentVariationNames: variationKeys,
        Flags: flagVariants,
    })
}

const OPTIMIZELY_KEY_DEV = 'ExQ1LrMbqzKPKq9DXXgH5'
const OPTIMIZELY_KEY_PROD = 'QCe1mjSmjUYMjK6T4SDFo'
const sdkKey = isProd ? OPTIMIZELY_KEY_PROD : OPTIMIZELY_KEY_DEV

const TRACKING_CONSENT: ikea.PerformanceCookieConsent = 2

/**
 * Synchronously check if tracking consent has been given.
 * Unlike hasTrackingConsent(), this does not wait for the consent event.
 * Returns:
 * - true: user has explicitly given consent
 * - false: user has explicitly denied consent OR consent SDK says no
 * - null: consent status unknown (SDK not ready yet)
 */
const hasTrackingConsentSync = (): boolean | null => {
    if (typeof document === 'undefined') {
        return false
    }

    if (ikea?.cookieConsent) {
        return ikea.cookieConsent.hasConsent(TRACKING_CONSENT)
    }

    // Consent SDK not ready - status unknown
    return null
}

/**
 * Perform the actual Optimizely initialization once we have both SDK and consent.
 * This is extracted to be reusable by both immediate and deferred initialization paths.
 */
const doOptimizelyInit = async (experiment: ikea.ExperimentsApi): Promise<ikea.ExperimentsClient | undefined> => {
    const result = await experiment
        .init(sdkKey, {
            ikeaAnalytics: {
                enabled: true,
                team: 'kreativ',
            },
        })
        .catch((cause: unknown) => {
            throw new Error('ikea.exptSDK failed to initialize', { cause })
        })

    if (result.error) {
        throw new Error('ikea.exptSDK initialization failed', { cause: result.error })
    }

    const optimizely = result.client
    if (!optimizely) {
        return undefined
    }

    await trackExperiments(optimizely)

    return optimizely
}

/**
 * Initialize Optimizely without blocking on consent.
 *
 * This function checks synchronously if both the SDK and consent are available:
 * - If both are ready, proceeds with initialization immediately
 * - If either is not ready, returns undefined immediately (does not block)
 *
 * This allows the experiments service to complete initialization and call decide(),
 * enabling URL param overrides from devExperimentsProvider to take effect even
 * in opt-in cookie consent markets where the user hasn't consented yet.
 */
const initializeOptimizely = async (): Promise<ikea.ExperimentsClient | undefined> => {
    // In non-browser environments (e.g. SSG/SSR) simply resolve to undefined
    if (typeof document === 'undefined') {
        return undefined
    }

    // Check synchronously if SDK is available
    const experiment = ikeaExperimentsApiSync()
    if (!experiment) {
        // SDK not ready yet - don't block, return undefined
        return undefined
    }

    // Check synchronously if consent is available
    const consentStatus = hasTrackingConsentSync()
    if (consentStatus !== true) {
        // Consent not given or unknown - don't block, return undefined
        return undefined
    }

    // Both SDK and consent are ready, proceed with initialization
    return doOptimizelyInit(experiment)
}

const optimizelyResolver = Promise.withResolvers<ikea.ExperimentsClient | undefined>()

/**
 * Acquire a reference to the Optimizely singleton once it is available.
 * Uses synchronous consent check to avoid blocking the decide() flow when
 * consent status is unknown - this allows URL param overrides to take effect
 * even before the user interacts with the consent banner.
 */
const optimizelyClient = async (): Promise<ikea.ExperimentsClient | undefined> => {
    // Use synchronous check to avoid blocking on consent events
    const consentStatus = hasTrackingConsentSync()

    // Only proceed if consent is explicitly true
    // Return undefined for false (denied) or null (unknown)
    if (consentStatus !== true) {
        return undefined
    }

    return optimizelyResolver.promise
}

let isInitialized = false
let isDeferredInitSetup = false

/**
 * Set up deferred initialization to complete Optimizely setup when both
 * the SDK is ready and consent is given. This ensures analytics tracking
 * works correctly once the user consents in opt-in markets.
 */
const setupDeferredInit = (): void => {
    if (isDeferredInitSetup) {
        return
    }
    isDeferredInitSetup = true

    // Track whether we've already completed deferred init
    let deferredInitComplete = false

    const tryDeferredInit = async () => {
        if (deferredInitComplete) {
            return
        }

        // Check if both SDK and consent are now available
        const experiment = ikeaExperimentsApiSync()
        const consentStatus = hasTrackingConsentSync()

        if (experiment && consentStatus === true) {
            deferredInitComplete = true
            try {
                const optimizely = await doOptimizelyInit(experiment)
                optimizelyResolver.resolve(optimizely)
            } catch (cause) {
                optimizelyResolver.reject(cause)
            }
        }
    }

    // Listen for SDK ready event
    document.addEventListener('ikeaExperimentReady', () => {
        tryDeferredInit()
    })

    // Listen for consent event
    document.addEventListener('ikeaCookieConsent', (event) => {
        if (event.detail[TRACKING_CONSENT]) {
            tryDeferredInit()
        }
    })
}

const decideFlags = async (optimizely: ikea.ExperimentsClient): Promise<Partial<DecidedFlags>> => {
    const additionalAttributes = await fetchSessionAttributes()

    const decisions = flags().reduce<Partial<DecidedFlags>>((decs, flag) => {
        const flagKey = flagMapper[flag]
        if (!flagKey) {
            return decs
        }

        const result = optimizely.decide(flagKey, { attributes: additionalAttributes })
        if (result.success && result.decision) {
            const enabled = result.decision.enabled
            decs[flag] = enabled

            // Record decision for debug mode
            recordFlagDecision(flagKey, enabled, additionalAttributes)
        } else {
            // Default to false if decision fails
            decs[flag] = false

            // Record failed decision for debug mode
            recordFlagDecision(flagKey, false, additionalAttributes)
        }
        return decs
    }, {})
    return decisions
}

const chooseSingleVariation = async (
    optimizely: ikea.ExperimentsClient,
    experiment: Experiment,
    additionalAttributes: Record<string, string | number | null>,
): Promise<Partial<ChosenVariations>> => {
    const experimentKey = experimentMapper[experiment]?.key
    if (!experimentKey) {
        return {}
    }

    const result = optimizely.decide(experimentKey, { attributes: additionalAttributes })
    if (result.success && result.decision) {
        const variationKey = result.decision.variationKey
        // Record decision for debug mode
        recordExperimentDecision(experimentKey, variationKey, additionalAttributes)
        // Only set variation if it's not "off" (users not in experiment should not have a variation)
        if (variationKey && variationKey !== 'off') {
            const variation = lookupVariationFromKey(experiment, variationKey)
            if (variation && isVariationOf(experiment, variation)) {
                if ((experimentDefinitions[experiment] as ExperimentDefinition).delayedDecision) {
                    tracker.track('OptimizelyExperiment', {
                        ExperimentVariationNames: [`${experimentKey}:${variationKey}`],
                        Flags: [],
                    })
                }
                return { [experiment]: variation } as Partial<ChosenVariations>
            }
        }
    } else {
        recordExperimentDecision(experimentKey, null, additionalAttributes)
    }
    return {}
}

const chooseVariations = async (optimizely: ikea.ExperimentsClient): Promise<Partial<ChosenVariations>> => {
    const additionalAttributes = await fetchSessionAttributes()

    // Only decide experiments that are not marked as delayedDecision.
    // Delayed-decision experiments are skipped here and must be decided explicitly via decideExperiment().
    const eagerExperiments = experiments().filter(
        (exp) => !(experimentDefinitions[exp] as ExperimentDefinition).delayedDecision,
    )

    const variations = await Promise.all(
        eagerExperiments.map((experiment) => chooseSingleVariation(optimizely, experiment, additionalAttributes)),
    )
    return Object.assign({} as Partial<ChosenVariations>, ...variations)
}

/**
 * Implementation of an {@link ExperimentsProvider} that pulls experiment variations and flag decisions from IKEA's
 * global experiments API and IKEA's optimizely implementation.
 */
export const ikeaExperimentsProvider: ExperimentsProvider = {
    name: 'ikea',

    initialize: async () => {
        // Skip initialization if not on IKEA domain
        if (!isIkeaDomain()) {
            return
        }

        if (isInitialized) {
            return
        }
        isInitialized = true

        const optimizely = await initializeOptimizely().catch((cause) => {
            optimizelyResolver.reject(cause)
            return undefined
        })

        if (optimizely) {
            // Immediate initialization succeeded (SDK ready and consent given)
            optimizelyResolver.resolve(optimizely)
        } else {
            // Immediate initialization didn't succeed (SDK not ready or no consent yet)
            // Set up deferred initialization to complete when conditions are met
            setupDeferredInit()
        }
    },

    decide: async () => {
        // Return empty immediately if not on IKEA domain
        if (!isIkeaDomain()) {
            return {}
        }

        const optimizely = await optimizelyClient()
        if (!optimizely) {
            return {}
        }
        const [flgs, variations] = await Promise.all([decideFlags(optimizely), chooseVariations(optimizely)])

        // Display debug summary if debug mode is active
        if (getIsOptimizelyDebug()) {
            // Delay to ensure all tracking calls have completed
            setTimeout(() => displayDebugSummary(), 100)
        }

        return { flags: flgs, variations }
    },

    decideExperiment: async (experiment) => {
        if (!isIkeaDomain()) {
            return {}
        }

        const optimizely = await optimizelyClient()
        if (!optimizely) {
            return {}
        }

        const additionalAttributes = await fetchSessionAttributes()
        const variations = await chooseSingleVariation(optimizely, experiment, additionalAttributes)

        if (getIsOptimizelyDebug()) {
            setTimeout(() => displayDebugSummary(), 100)
        }

        return { variations }
    },

    track: async (eventName, { attributes = {} } = {}) => {
        // Skip tracking if not on IKEA domain
        if (!isIkeaDomain()) {
            return
        }

        const optimizely = await optimizelyClient()
        if (!optimizely) {
            return
        }

        if (!isProd) {
            // not Prod, log all optimizely events for debugging
            /* eslint-disable no-console */
            console.log('Tracking optimizely event name: ', eventName, ' event attributes: ', attributes)
            return
        }

        const result = optimizely.track(eventName, {
            eventAttributes: attributes as Record<string, string | number | null>,
        })

        if (!result.success) {
            console.error('Failed to track event:', result.error)
        }
    },
}
