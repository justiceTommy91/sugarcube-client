/**
 * Valid variation names for experiments.
 *
 * IMPORTANT: The strings 'on' and 'off' are reserved keywords in Optimizely/Ingka exptSDK:
 * - 'off' means the user is NOT part of the experiment's audience (they are excluded from the experiment entirely)
 * - 'on' is reserved for feature flag states
 *
 * This is different from variations like 'disabled' which means the user IS in the experiment
 * but receiving the control/disabled variation.
 *
 * @example
 * - 'disabled' = User is IN the experiment, receiving the control experience
 * - 'off' = User is NOT in the experiment audience at all (reserved by Optimizely)
 */
type ValidVariationName = Exclude<string, 'on' | 'off'>

export type ExperimentDefinition = {
    description: string
    /**
     * Set of possible variations that this experiment can be in.
     * NOTE: Cannot use 'on' or 'off' as these are reserved by Optimizely/Ingka exptSDK
     */
    variations: readonly ValidVariationName[]
    /** Default variation that should be used when providers do not provide an override. */
    default: string
    /**
     * When true, this experiment will NOT be decided during service initialization. Instead, its
     * default variation is used until `decideExperiment()` is called
     * explicitly by the caller at the appropriate point in time.
     *
     * Use this for experiments that should only be decided at a specific moment (e.g. when the
     * user first encounters the relevant feature), rather than immediately on page load.
     */
    delayedDecision?: boolean
}

/**
 * Definitions of all experiments our application knows about.
 *
 * When new experiments are constructed they must be added to this structure in order to be accessible to the rest of
 * the application. Keys are the human-readable name of the experiment, values are the {@link ExperimentDefinition} for
 * that experiment.
 *
 * @note We currently cannot defend against assigning a default variation that isn't listed in the experiment's
 *  variations. TypeScript v5 introduces "const generic types" which we could leverage to make these definitions
 *  more typesafe, but until we upgrade to TypeScript v5 this is likely the best we can do. So when defining
 *  experiments please be careful to ensure that the default is a valid experiment variation.
 */
export const experimentDefinitions = {
    RoomDimensions: {
        description:
            'An experiment to introduce the ability to see the wall dimensions within the designer (currently limited to Top View only).',
        variations: ['disabled', 'enabled'],
        default: 'disabled',
    },
    ProductDimensions: {
        description: 'An experiment to introduce the ability to see the product dimensions within the designer.',
        variations: ['disabled', 'enabled'],
        default: 'disabled',
    },
    DynamicMeasurements: {
        description: 'An experiment to introduce the ability to see the dynamic measurements within the designer.',
        variations: ['disabled', 'enabled'],
        default: 'disabled',
    },
    HowItWorks: {
        description: 'Experiment to test image vs video header in How It Works section.',
        variations: ['control', 'imageHeader', 'videoHeader'],
        default: 'control',
    },
    StarterSet: {
        description: 'Enables starter set functionality in the design sidepanel.',
        variations: ['disabled', 'enabled'],
        default: 'disabled',
    },
    ShowroomAB: {
        description: 'Experiment to try room builder showroom variations.',
        variations: ['off', 'disabled', 'alternate_showrooms', 'alternate_showrooms_v2'],
        default: 'off',
    },
    KreativLite: {
        description: 'Experiment to try our Kreativ Lite experience.',
        variations: ['disabled', 'enabled'],
        default: 'disabled',
    },
    KreativLiteMobile: {
        description: 'Feature flag to show the MobileDashboardV3 experience. Requires KreativLite to also be enabled.',
        variations: ['disabled', 'enabled'],
        default: 'disabled',
    },
    Beautifier: {
        description: 'Enables the Beautify room button in the design view.',
        variations: ['disabled', 'enabled'],
        default: 'disabled',
    },
    EnableNewWallColors: {
        description: 'Enables wall color customization in the room builder.',
        variations: ['disabled', 'enabled'],
        default: 'disabled',
    },
} as const satisfies Record<string, ExperimentDefinition>

/**
 * Enumeration of all experiments.
 *
 * @public
 */
export type Experiment = keyof typeof experimentDefinitions

/**
 * List all experiment names.
 *
 * @package
 */
export const experiments = (): Experiment[] => Object.keys(experimentDefinitions) as Experiment[]

/**
 * Enumerate all of the possible variations of a particular experiment.
 *
 * @public
 */
export type Variation<E extends Experiment> = (typeof experimentDefinitions)[E]['variations'][number]

/**
 * Set of experiment variations chosen for the current user's session.
 *
 * Keys represent the experiment, while values are the particular variation chosen for that experiment.
 *
 * @public
 */
export type ChosenVariations = { [Exp in Experiment]: Variation<Exp> }

/**
 * Return set of default experiment variations that should be used as a fallback in case one or more providers are not
 * able to provide experiment variation choices.
 *
 * @package
 */
export const defaultVariationChoices = (): ChosenVariations =>
    Object.entries(experimentDefinitions).reduce((choices, [exp, def]) => {
        ;(choices as Record<string, string>)[exp] = def.default
        return choices
    }, {} as ChosenVariations)

/**
 * Check if a particular value is a valid variation of an experiment.
 *
 * @package
 */
export const isVariationOf = <Exp extends Experiment>(
    experiment: Experiment,
    value: unknown,
): value is Variation<Exp> => {
    if (typeof value !== 'string') {
        return false
    }

    const { variations } = experimentDefinitions[experiment]
    return (variations as readonly string[]).includes(value)
}
