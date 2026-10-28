import { useMemo, useReducer } from 'react'
import type { ViewerMode } from '../types'

export type ViewerAction =
    | { type: 'CONFIRM_DRAWING' }       // drawing -> adjusting
    | { type: 'BACK_TO_DRAWING' }       // adjusting -> drawing
    | { type: 'CONFIRM_ADJUSTING' }     // adjusting -> viewing (user clicks "View N products")
    | { type: 'START_EDITING'; tool: 'resize' | 'erase' }
    | { type: 'SWITCH_TOOL'; tool: 'resize' | 'erase' }
    | { type: 'DONE_EDITING' }          // editing -> viewing
    | { type: 'RESET' }                 // any -> drawing

function viewerModeReducer(state: ViewerMode, action: ViewerAction): ViewerMode {
    switch (action.type) {
        case 'CONFIRM_DRAWING':
            if (state.phase === `drawing`) return { phase: `adjusting` }
            return state

        case 'BACK_TO_DRAWING':
            if (state.phase === `adjusting`) return { phase: `drawing` }
            return state

        case 'CONFIRM_ADJUSTING':
            if (state.phase === `adjusting`) return { phase: `viewing` }
            return state

        case 'START_EDITING':
            if (state.phase === `viewing`) return { phase: `editing`, tool: action.tool }
            return state

        case 'SWITCH_TOOL':
            if (state.phase === `editing`) return { phase: `editing`, tool: action.tool }
            return state

        case 'DONE_EDITING':
            if (state.phase === `editing`) return { phase: `viewing` }
            return state

        case 'RESET':
            return { phase: `drawing` }

        default:
            return state
    }
}

export function useViewerMode() {
    const [mode, dispatch] = useReducer(viewerModeReducer, { phase: `drawing` })

    const derived = useMemo(
        () => ({
            isDrawing: mode.phase === `drawing`,
            isAdjusting: mode.phase === `adjusting`,
            isViewing: mode.phase === `viewing`,
            isEditing: mode.phase === `editing`,
            isResizing:
                mode.phase === `adjusting` ||
                (mode.phase === `editing` && mode.tool === `resize`),
            isErasing: mode.phase === `editing` && mode.tool === `erase`,
        }),
        [mode],
    )

    return { mode, dispatch, ...derived }
}
