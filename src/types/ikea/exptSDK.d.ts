// This file is from https://github.com/ingka-group-digital/window-ikea-typings/blob/main/src/experimentum/exptSDK.d.ts
// TODO: We should look to getting the types directly from @ingka-group-digital/window-ikea-typings
// when we set up a github access token to the @ingka-group-digital registry
/**
 * The {@link ExperimentsApi} can be reached via the window.ikea.exptSDK object on IKEA.com/cc/ll/.
 * It provides a method, init, which initializes the {@link ExperimentsClient} and returns it.
 */
export interface ExperimentsApi {
    init: Init
}

/**
 * Initializes the Optimizely SDK
 * @param sdkKey - The Optimizely SDK key
 * @param experimentOptions - Configuration for experiments, including Episod and Content Square options.
 * @returns A promise that resolves to an object containing the {@link ExperimentsClient} or an error.
 *
 * @example
 * ```typescript
 * const { client, error } = await window.ikea.exptSDK.init('sdk_key', {
 *   ikeaAnalytics: {
 *     enabled: true,
 *     team: 'team_name',
 *     category: 'team_category',
 *   },
 *   contentSquare: {
 *    enabled: true,
 *    category: 'my_category',
 *  },
 * });
 *
 * if (error) {
 *   console.error('Failed to initialize Experiments SDK:', error);
 *   return;
 * }
 *
 * // use `client`...
 * ```
 */
export type Init = (
    sdkKey: string,
    experimentOptions?: ExperimentOptions,
) => Promise<
    | {
          client: ExperimentsClient
          error?: undefined
      }
    | { error: Error; client?: undefined }
>

/**
 * The options for configuring the Experiments API.
 * This includes options for Content Square and Ikea Analytics (Episod).
 * These options can be used to enable or disable tracking and specify categories for events.
 *
 * @example
 * ```typescript
 * const options: ExperimentOptions = {
 *   contentSquare: {
 *     enabled: true,
 *     category: 'my_category',
 *   },
 *   ikeaAnalytics: {
 *     enabled: true,
 *     team: 'my_team',
 *     category: 'my_category',
 *   }
 * };
 * ```
 */
export type ExperimentOptions = {
    /**
     * If enabled, all decide and track events will be sent to Content Square.
     */
    contentSquare?: ContentSquareOptions
    /**
     * If enabled all decide and track events will be sent to IKEA analytics (Episod).
     */
    ikeaAnalytics?: IkeaAnalyticsOptions
    /**
     * Determines whether the SDK should wait for cookie consent before initializing.
     * - If `true`, the SDK will wait indefinitely for consent.
     * - If `false`, the SDK will skip waiting for consent and initialize immediately.
     * @default true
     */
    waitForConsent?: boolean
}

export type ContentSquareOptions =
    | {
          enabled: true
          /**
           * Category name used for Content Square tracking variable keys.
           * This value is combined with prefix 'AB_Opti_' when sending tracking events to Content Square.
           * @default "optimizely"
           */
          category?: string
      }
    | {
          enabled?: false
          category?: string
      }

export type IkeaAnalyticsOptions =
    | {
          enabled?: false
          category?: string
          team?: string
      }
    | {
          enabled: true
          /**
           * Category name used as event_category in Ikea Analytics events.
           * Used for both decide and track events.
           * @default "optimizely"
           */
          category?: string
          /**
           * Team identifier included in the custom properties of all analytics events.
           * Required when analytics is enabled.
           */
          team: string
      }

/**
 * The client returned from {@link ExperimentsApi.init}
 * @example
 * ```typescript
 * const { client } = await window.ikea.exptSDK.init('sdk_key');
 * ```
 */
export type ExperimentsClient = {
    decide: Decide
    track: Track
    close: Close
}

/**
 * Closes the Optimizely SDK client.
 * This method should be called when the client is no longer needed to free up resources.
 *
 * @returns A promise that resolves to an object indicating success or failure, and an optional reason for failure.
 *
 * @example
 * ```typescript
 * const { success, reason } = await client.close();
 * if (!success) {
 *   console.error('Failed to close Optimizely client:', reason);
 * }
 * ```
 */
export type Close = () => Promise<{
    success: boolean
    reason?: string
}>

/**
 * Determines which variation to use for a given feature flag.
 *
 * @param key - The feature flag key.
 * @param options - Optional parameters including user attributes and decision options.
 * @returns An object indicating success or failure, and the decision if successful.
 *
 * @example
 * ```typescript
 * const { success, error, decision } = client.decide('feature_flag_key');
 * if (!success) {
 *   handleError(error);
 * }
 * // use `decision`...
 * ```
 */
export type Decide = (
    key: string,
    options?: {
        /**
         * User attributes for decision-making.
         */
        attributes?: { [key: string]: string | number | null }
        /**
         * Options for customizing the decision process.
         */
        decideOptions?: {
            /** If true, the decision event will not be sent. */
            disableDecisionEvent?: boolean
            /** If true, only enabled flags will be considered. */
            enabledFlagsOnly?: boolean
            /** If true, the user profile service will be ignored. */
            ignoreUserProfileService?: boolean
            /** If true, the reasons for the decision will be included. */
            includeReasons?: boolean
            /** If true, the variables will be excluded. */
            excludeVariables?: boolean
        }
    },
) =>
    | { success: false; error: Error; decision?: undefined }
    | {
          success: true
          decision: Decision
          error?: undefined
      }
/**
 * Use this method to track events across multiple flag rules for a user.
 * @param key - The event key to track.
 * @param options - Optional parameters for tracking the event, including event tags, properties, and attributes.
 * @returns An object indicating success or failure, and an error if unsuccessful.
 *
 * @example
 * ```typescript
 * const result = client.track('event_key', {
 *   eventTags: {
 *     revenue: 1000, // Represents $10.00
 *     value: 50.5, // Represents $50.50
 *     customTag: 'customValue',
 *   },
 *   eventProperties: {
 *     property1: 'value1',
 *     property2: 42,
 *   },
 *   eventAttributes: {
 *     attribute1: 'value1',
 *     attribute2: 100,
 *   }
 * });
 *
 * if (result.success) {
 *   console.log('Event tracked successfully');
 * } else {
 *   console.error('Failed to track event:', result.error);
 * }
 * ```
 */
export type Track = (
    key: string,
    options?: {
        eventTags?: EventTags
        eventProperties?: Record<string, string | number | null>
        eventAttributes?: Record<string, string | number | null>
    },
) => { success: true; error?: undefined } | { success: false; error: Error }

/**
 * Tags that can be added to events to provide additional context or metadata.
 *
 * @example
 * ```typescript
 * const eventTags: EventTags = {
 *   revenue: 6432, // Represents $64.32
 *   value: 72.81, // Represents $72.81
 *   customTag: 'customValue',
 * };
 * ```
 */
export type EventTags = {
    /**
     * Represents revenue in cents. For example, to record a revenue of $64.32, use `6432`.
     */
    revenue?: number
    /** The value is a floating-point number. For example, $72.81 would have a value of `72.81`. */
    value?: number
} & Record<string, string | number | null>

export interface Decision {
    variationKey: string | null
    enabled: boolean
    variables: Record<string, unknown>
    ruleKey: string | null
    flagKey: string
    reasons: string[]
}
