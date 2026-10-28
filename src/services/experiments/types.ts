import type { ChosenVariations, Experiment, experimentDefinitions, Variation } from './experiments'
import { type DecidedFlags, Flag } from './flags'

export type AsyncOptions = {
    /**
     * Number of ms to wait until aborting the asynchronous operation.
     */
    timeout?: number
}

export type TrackOptions = {
    /** Misc metadata to associate with the tracking event. */
    attributes?: Record<string, string | number | boolean>
}

export type ExperimentDecisions = {
    flags: DecidedFlags
    variations: ChosenVariations
}

export type ProviderDecisions = {
    flags?: Partial<DecidedFlags>
    variations?: Partial<ChosenVariations>
}

export type ExperimentsProvider = {
    name: string
    decide: () => Promise<ProviderDecisions>
    initialize?: () => Promise<void>
    track?: (eventName: string, options?: TrackOptions) => Promise<void>
    /**
     * Decide a single experiment. Implement this to make a targeted decision for one experiment
     * without re-running all experiments. If not implemented, the service will fall back to
     * calling {@link ExperimentsProvider.decide}.
     */
    decideExperiment?: (experiment: Experiment) => Promise<ProviderDecisions>
}

export type ExperimentsState = {
    status: 'pending' | 'success'
    decisions: ExperimentDecisions
}

export type Synchronizer = (state: ExperimentsState) => void

export type Unsubscribe = () => void

export type ExperimentsService = {
    /**
     * Initialize all experiment providers and return the decided experiments/flags.
     */
    initialize: () => Promise<ExperimentDecisions>

    synchronize: (sync: Synchronizer) => Unsubscribe

    flags: Flag[]

    experimentDefinitions: typeof experimentDefinitions

    toggleFlag: (flag: Flag) => Promise<void>

    setExperiment: (experiment: Experiment, variation: Variation<Experiment>) => Promise<void>

    resetFlags: () => Promise<void>

    resetExperiments: () => Promise<void>

    /** Default set of flag decisions that are made in the event that initialization is pending or fails. */
    defaultFlagDecisions: DecidedFlags

    /**
     * Set of default experiment variations that should be used as a fallback in case one or more providers are not
     * able to provide experiment variation choices.
     */
    defaultVariationChoices: ChosenVariations

    /**
     * Decide a single {@link ExperimentDefinition.delayedDecision} experiment on demand.
     *
     * Call this at the moment the caller first needs the experiment's value — e.g. when the
     * user first encounters the relevant feature. The Optimizely provider will call
     * `optimizely.decide()` for only this experiment rather than re-deciding everything.
     *
     * Dev overrides (URL params / localStorage) still apply.
     *
     * Once decided, the service state is updated and all synchronizers are notified so React
     * hooks and Redux subscribers receive the new variation immediately.
     *
     * @returns The decided variation for the experiment.
     */
    decideExperiment: <E extends Experiment>(experiment: E) => Promise<Variation<E>>

    /**
     * Track a user action or event that should be associated with one or more experiments for the purposes of determining
     * which variation resulted in better conversions.
     *
     * @param eventName Label for the event.
     *
     * @throws never. If an error occurs the error will be properly logged and the returned Promise will resolve to false.
     *
     * @returns Promise that resolves to true if the event was successfully tracked and otherwise resolves to false.
     */
    track: (eventName: string, options?: AsyncOptions & TrackOptions) => Promise<void>
}
