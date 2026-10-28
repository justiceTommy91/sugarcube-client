export { MIN_DIMENSION_M } from '@gatsby/Renderer/geomviewer/geom_constants'

// Used for drawing brush, active resize handles, and highlight gradients.
export const IKEA_YELLOW = 'rgba(255, 204, 0, 0.8)'
export const IKEA_YELLOW_SOLID = '#ffcc00'

export const MAX_DIMENSION_M = 2.5 // 250 cm

/** Minimum distance (px) from container edge where handles remain reachable. */
export const HANDLE_EDGE_MARGIN_PX = 2

// Stepper increment for targeted-edit mode (meters).
export const STEP_SIZE_M = 0.10

// Continuous search: show a toast when results are below this threshold.
export const MIN_RESULTS_FOR_TOAST = 3
// Debounce delay (ms) before triggering a search after a resize drag ends.
export const SEARCH_DEBOUNCE_MS = 300

// DimensionsToolbar top offset. Editing mode needs extra room for the tool bar.
export const DIMENSIONS_TOOLBAR_TOP = '1rem'
export const DIMENSIONS_TOOLBAR_TOP_EDITING = '4rem'
