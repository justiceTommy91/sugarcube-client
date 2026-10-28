import { getIsMorpheusMarket } from 'models/location/selectors'
import { isProd } from 'utils/environment'

type FlagDefinition = {
    /** Human-readable description of what this flag does in our applicaiton. */
    description: string
    /** Default decision make for this flag. */
    default: boolean
}

/**
 * Definitions of all optimizely flags that our application knows about.
 */
const flagDefinitions = {
    WallColorAntialias: {
        description: 'Enables the AA (anti-aliasing) for segmentation and background images in image based scenes.',
        default: false,
    },
    OwnRoomColor: {
        description: 'Allows users to switch the color of the wall in OwnRoom scenes.',
        default: false,
    },
    HelaWallColor: {
        description: 'Allows users to switch the color of the wall in Hela scenes.',
        default: false,
    },
    CameraOrbitMode: {
        description: 'Enables camera orbit mode in Hela rooms.',
        default: false,
    },
    ExpertCheck: {
        description: 'Adds entrypoints into the Kreativ Boka expert check flow.',
        default: false,
    },
    Morpheus: {
        description: 'Enabled customizable bed dressings.',
        default: !isProd || getIsMorpheusMarket(),
    },
    CompleteMyRoom: {
        description: 'Enables personalized recommendations based on composition contents.',
        default: false,
    },
    OpenSaveAsInNewTab: {
        description:
            'When saving a copy of a composition, opens it in a new tab instead of navigating to it in the current tab.',
        default: false,
    },
    AutoShowProductDimensions: {
        description: 'When on, if a user hovers over an item, they will automatically see product dimensions.',
        default: false,
    },
    ProductItemDragAndDrop: {
        description: 'Enables drag and drop functionality for product items in the design sidepanel.',
        default: false,
    },
    RoomBuilderNodeEditing: {
        description: 'Enables node based editing feaures in the room builder.',
        default: false,
    },
    RoomBuilderEnvmapUploading: {
        description: 'Enables generation and uploading of envmap rendered in the room builder.',
        default: false,
    },
    LowEndLightCustomizations: {
        description: 'Enables light customizations for lower than tier 4 devices.',
        default: false,
    },
    DuvetV2: {
        description: 'Enables new duvet material system.',
        default: false,
    },
    ConfigurableProductBanner: {
        description: 'Shows the PAX (and future configurable product families) banner in search results.',
        default: false,
    },
    RoomBuilderEditor: {
        description: 'Manually enables access to the new room builder editor.',
        default: false,
    },
} as const satisfies Record<string, FlagDefinition>

/**
 * Enumeration of all flags.
 *
 * @public
 */
export type Flag = keyof typeof flagDefinitions

/**
 * List all valid flag names.
 *
 * @package
 */
export const flags = (): Flag[] => Object.keys(flagDefinitions) as Flag[]

/**
 * Set of flag decisions made for the current user's session.
 *
 * Flags can be in only one of two states, 'off' or 'on', and the decision of which state a flag should be in is
 * represented as a boolean where true means "on" and false means "off".
 *
 * @public
 */
export type DecidedFlags = { [F in Flag]: boolean }

/**
 * Return set of flag decisions that should be used as a fallback in case one or more providers are not able to provide
 * provide flag decisions.
 *
 * @package
 */
export const defaultFlagDecisions = (): DecidedFlags =>
    Object.entries(flagDefinitions).reduce((decisions, [flag, def]) => {
        decisions[flag as Flag] = def.default
        return decisions
    }, {} as DecidedFlags)
