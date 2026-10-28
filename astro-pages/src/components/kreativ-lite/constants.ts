export const APP_MODE = {
    ERASER: 'eraser',
    DESIGN: 'design',
} as const

export type AppMode = (typeof APP_MODE)[keyof typeof APP_MODE]

/** Maximum number of user-initiated items before the App Promotion Drawer is shown. */
export const KREATIV_LITE_MOBILE_MAX_ITEMS = 5

/** URL query-parameter name for the saved composition ID. */
export const COMPOSITION_ID_PARAM = 'compositionId'

/** URL query-parameter name for the scene ID. */
export const SCENE_ID_PARAM = 'sceneId'
