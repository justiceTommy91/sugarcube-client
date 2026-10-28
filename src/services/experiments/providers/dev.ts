import * as Sentry from '@sentry/react'

import { getRegion } from 'models/location/selectors'

import { type ChosenVariations, isVariationOf, experiments, Experiment, Variation } from '../experiments'
import { type DecidedFlags, type Flag, flags } from '../flags'
import type { ExperimentsProvider, ProviderDecisions } from '../types'

const flagsFromUrl = (): Partial<DecidedFlags> => {
    const search = new URLSearchParams(globalThis.location.search)
    const decisions = flags().reduce<Partial<DecidedFlags>>((decs, flag) => {
        const value = search.get(`_flags[${flag}]`)
        if (value === 'true' || value === 'on') {
            decs[flag] = true
        } else if (value === 'false' || value === 'off') {
            decs[flag] = false
        }
        return decs
    }, {})
    return decisions
}

const readDecidedFlags = (): Partial<DecidedFlags> => {
    let rawDecisions
    try {
        rawDecisions = localStorage.getItem(`decidedFlags_${getRegion()}`)
    } catch (cause) {
        Sentry.captureException(new Error('failed to read decided flags from localStorage', { cause }))
        return {}
    }
    let decisions
    try {
        // FIXME: we should validate the response from localStorage since this is user-controlled.
        decisions = JSON.parse(rawDecisions || '{}') as Partial<DecidedFlags>
    } catch (cause) {
        Sentry.captureException(new Error('malformed decided flags in localStorage', { cause }))
        return {}
    }
    return decisions
}

const updateDecidedFlags = (updater: (decisions: Partial<DecidedFlags>) => Partial<DecidedFlags>): void => {
    const decisions = readDecidedFlags()
    const updatedDecisions = updater(decisions)
    try {
        localStorage.setItem(`decidedFlags_${getRegion()}`, JSON.stringify(updatedDecisions))
    } catch (cause) {
        Sentry.captureException(new Error('failed to save decided flags to localStorage', { cause }))
    }
}

const variationsFromUrl = (): Partial<ChosenVariations> => {
    const search = new URLSearchParams(globalThis.location.search)
    const variations = experiments().reduce<Partial<ChosenVariations>>((vars, exp) => {
        const variation = search.get(`_experiments[${exp}]`)
        if (isVariationOf(exp, variation)) {
            ;(vars as Record<string, string>)[exp] = variation
        }
        return vars
    }, {})
    return variations
}

const readChosenVariations = (): Partial<ChosenVariations> => {
    let rawVariations
    try {
        rawVariations = localStorage.getItem(`chosenVariations_${getRegion()}`)
    } catch (cause) {
        Sentry.captureException(new Error('failed to read chosen variations from localStorage', { cause }))
        return {}
    }
    let variations
    try {
        // FIXME: we should validate the response from localStorage since this is user-controlled.
        variations = JSON.parse(rawVariations || '{}') as Partial<ChosenVariations>
    } catch (cause) {
        Sentry.captureException(new Error('malformed variations in localStorage', { cause }))
        return {}
    }
    return variations
}

const updateChosenVariations = (
    updater: (currentVariations: Partial<ChosenVariations>) => Partial<ChosenVariations>,
): void => {
    const variations = readChosenVariations()
    const updatedVariations = updater(variations)
    try {
        localStorage.setItem(`chosenVariations_${getRegion()}`, JSON.stringify(updatedVariations))
    } catch (cause) {
        Sentry.captureException(new Error('failed to save chosen variations to localStorage', { cause }))
    }
}

/**
 * Developer {@link ExperimentsProvider} which allows users to override chosen experiments and decided flags via URL
 * search params.
 *
 * To override a particular flag decision users can add a `_flags[{flagName}]={true|on|false|off}` search param to the URL.
 * For example, the URL `https://ikea.com/en/us/home-design/?_flags[Smarta]=true&_flags[OwnRoomColor]=false` would
 * override the Smarta flag decision to true and the OwnRoomColor flag decision to false, and leave other flags
 * unchanged.
 *
 * To force a particular experiment variation users can add a `_experiments[{experimentName}]={variation}` search param
 * to the URL. For example, the URL
 * `https://ikea.com/en/us/home-design/?_experiments[Smarta]=short%20timeout&_experiments[HeroVideo]=no%20change` would
 * override the Smarta experiment to variation "short timeout" and the HeroVideo experiment to variation "no change"
 *
 */
export type DevExperimentsProvider = ExperimentsProvider & {
    setFlag: (flag: Flag, enabled: boolean) => void
    resetFlags: () => void
    setExperiment: (experiment: Experiment, variation: Variation<Experiment>) => void
    resetExperiments: () => void
}

export const devExperimentsProvider: DevExperimentsProvider = {
    name: 'dev',

    initialize: async () => {
        const flagOverrides = flagsFromUrl()
        updateDecidedFlags((flgs) => ({ ...flgs, ...flagOverrides }))
        const variationOverrides = variationsFromUrl()
        updateChosenVariations((variations) => ({ ...variations, ...variationOverrides }))
    },

    decide: async (): Promise<ProviderDecisions> => ({
        flags: readDecidedFlags(),
        variations: readChosenVariations(),
    }),

    setFlag: (flag, enabled) => {
        updateDecidedFlags((flgs) => ({ ...flgs, [flag]: enabled }))
    },

    resetFlags: () => {
        updateDecidedFlags(() => ({}))
    },

    setExperiment: (experiment, variation) => {
        if (isVariationOf(experiment, variation)) {
            updateChosenVariations((variations) => ({ ...variations, [experiment]: variation }))
        }
    },

    resetExperiments: () => {
        updateChosenVariations(() => ({}))
    },
}
