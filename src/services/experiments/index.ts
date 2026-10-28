/**
 * Global service to interact with A/B testing experiments and feature flags for use throughout the application.
 *
 * Although any code should feel free to use this global singleton interface to the experiments service, there are also
 * interfaces to this service provided via redux (see /src/models/experiments) and via react hooks.
 *
 * There are several reasons why we implemented this service as a global module singleton instead of a redux
 * store:
 *
 *  1. The redux stores are tightly coupled to the Renderer, and because experiments are used throughout the
 *     application and we don't want to have to couple our entire application tightly coupled to the Renderer. Even the
 *     act of importing redux stores can cause the Renderer code to be pulled into the JS bundle for that chunk,
 *     causing us to pay the performance cost of the Renderer code even if we don't use that code on a particular page.
 *  2. There are places in the application where we may want to call experiments service methods where we don't have redux
 *     or react available.
 */
import * as Sentry from '@sentry/react'

import { withTimeout } from 'utils/async'

import {
    defaultVariationChoices,
    experimentDefinitions,
    type ChosenVariations,
    type Experiment,
    type Variation,
} from './experiments'
import { defaultFlagDecisions, flags } from './flags'
import { devExperimentsProvider } from './providers/dev'
import { ikeaExperimentsProvider } from './providers/ikea'
import { marketRolloutsProvider } from './providers/marketRollouts'
import type {
    AsyncOptions,
    ExperimentsProvider,
    ExperimentsService,
    ExperimentDecisions,
    TrackOptions,
    ProviderDecisions,
    Synchronizer,
    ExperimentsState,
} from './types'

export type { Flag, DecidedFlags } from './flags'
export type { Experiment, Variation, ChosenVariations } from './experiments'
export type { ExperimentsService, ExperimentDecisions, AsyncOptions, TrackOptions, ExperimentsState } from './types'

// Order of providers matters - last "wins" if there are any conflicts.
const registeredProviders: ExperimentsProvider[] = [
    ikeaExperimentsProvider,
    marketRolloutsProvider,
    devExperimentsProvider,
]

const synchronizers = new Set<Synchronizer>()

let experimentsState: ExperimentsState = {
    status: 'pending',
    decisions: {
        flags: defaultFlagDecisions(),
        variations: defaultVariationChoices(),
    },
}

const currentState = (): ExperimentsState => ({
    ...experimentsState,
    decisions: {
        flags: { ...experimentsState.decisions.flags },
        variations: { ...experimentsState.decisions.variations },
    },
})

const updateState = (updater: (prevState: ExperimentsState) => ExperimentsState): void => {
    const prevState = currentState()
    const nextState = updater(prevState)
    if (prevState.status === nextState.status) {
        return
    }
    synchronizers.forEach((sync) => {
        sync(nextState)
    })
    experimentsState = nextState
}

/**
 * Merge partial variation decisions into the current state and unconditionally notify all
 * synchronizers. Used by `decideExperiment()` to propagate a single
 * delayed-decision experiment result without going through a full pending → success cycle.
 */
const applyDecisions = (partialVariations: Partial<ChosenVariations>): void => {
    const nextState: ExperimentsState = {
        ...experimentsState,
        decisions: {
            ...experimentsState.decisions,
            variations: {
                ...experimentsState.decisions.variations,
                ...partialVariations,
            },
        },
    }
    synchronizers.forEach((sync) => {
        sync(nextState)
    })
    experimentsState = nextState
}

const decide = async (): Promise<ExperimentDecisions> => {
    updateState((prevState) => ({ ...prevState, status: 'pending' }))

    const providerDecisions = await Promise.all(
        registeredProviders.map<Promise<ProviderDecisions>>((provider) =>
            provider.decide().catch((cause) => {
                Sentry.captureException(new Error('failed to make experiment selections', { cause }))
                return {}
            }),
        ),
    )
    const decisions = providerDecisions.reduce<ExperimentDecisions>(
        (desc, res) => ({
            flags: { ...desc.flags, ...res.flags },
            variations: { ...desc.variations, ...res.variations },
        }),
        {
            flags: defaultFlagDecisions(),
            variations: defaultVariationChoices(),
        },
    )

    updateState(() => ({ status: 'success', decisions }))

    return decisions
}

export const experimentsService: ExperimentsService = {
    initialize: async () => {
        await Promise.all(
            registeredProviders.map((provider) =>
                provider.initialize?.().catch((cause) => {
                    const error = new Error(`"${provider.name}" experiments provider failed to initialize`, { cause })
                    Sentry.captureException(error)
                }),
            ),
        )
        return decide()
    },

    synchronize: (sync) => {
        sync(currentState())
        synchronizers.add(sync)
        return () => synchronizers.delete(sync)
    },

    get flags() {
        return flags()
    },

    get experimentDefinitions() {
        return experimentDefinitions
    },

    toggleFlag: async (flag) => {
        const { decisions } = currentState()
        const enabled = decisions.flags[flag]
        devExperimentsProvider.setFlag(flag, !enabled)
        await decide()
    },

    setExperiment: async (experiment, variation) => {
        devExperimentsProvider.setExperiment(experiment, variation)
        await decide()
    },

    resetFlags: async () => {
        devExperimentsProvider.resetFlags()
        await decide()
    },

    resetExperiments: async () => {
        devExperimentsProvider.resetExperiments()
        await decide()
    },

    get defaultFlagDecisions() {
        return defaultFlagDecisions()
    },

    get defaultVariationChoices() {
        return defaultVariationChoices()
    },

    decideExperiment: async <E extends Experiment>(experiment: E): Promise<Variation<E>> => {
        const providerDecisions = await Promise.all(
            registeredProviders.map<Promise<ProviderDecisions>>((provider) => {
                const promise = provider.decideExperiment ? provider.decideExperiment(experiment) : provider.decide()
                return promise.catch((cause) => {
                    Sentry.captureException(
                        new Error(
                            `"${provider.name}" experiments provider failed to decide experiment "${experiment}"`,
                            { cause },
                        ),
                    )
                    return {}
                })
            }),
        )

        // Merge results — last provider wins, consistent with the main decide() ordering
        const mergedVariations = providerDecisions.reduce<Partial<ChosenVariations>>(
            (vars, dec) => ({ ...vars, ...(dec.variations ?? {}) }),
            {},
        )

        const variation = (mergedVariations[experiment] ?? defaultVariationChoices()[experiment]) as Variation<E>

        applyDecisions({ [experiment]: variation } as Partial<ChosenVariations>)

        return variation
    },

    track: async (
        eventName: string,
        { attributes, timeout = 10_000 }: TrackOptions & AsyncOptions = {},
    ): Promise<void> => {
        await Promise.all(
            registeredProviders.map((provider) =>
                withTimeout(provider.track?.(eventName, attributes) ?? Promise.resolve(), timeout).catch((cause) => {
                    const error = new Error(`"${provider.name}" experiments provider failed to track event`, {
                        cause,
                    })
                    Sentry.captureException(error)
                }),
            ),
        )
    },
}
