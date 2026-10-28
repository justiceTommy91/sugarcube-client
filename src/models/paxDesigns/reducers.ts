import { PAX_DESIGNS_ACTION_TYPES, PAX_IMPORT_ACTION_TYPES } from './constants'
import type { PAXDesignsState } from './types'

const initialState: PAXDesignsState = {
    designs: [],
    loading: false,
    error: null,
    importLoading: false,
}

type Action =
    | { type: typeof PAX_DESIGNS_ACTION_TYPES.REQUEST_PAX_DESIGNS }
    | { type: typeof PAX_DESIGNS_ACTION_TYPES.RECEIVED_PAX_DESIGNS; payload: PAXDesignsState['designs'] }
    | { type: typeof PAX_DESIGNS_ACTION_TYPES.FAILED_PAX_DESIGNS; payload: string }
    | { type: typeof PAX_IMPORT_ACTION_TYPES.REQUEST_PAX_IMPORT; payload: string }
    | { type: typeof PAX_IMPORT_ACTION_TYPES.FINISH_PAX_IMPORT }
    | { type: typeof PAX_IMPORT_ACTION_TYPES.FAIL_PAX_IMPORT; payload: string }

export const paxDesignsReducer = (state: PAXDesignsState = initialState, action: Action): PAXDesignsState => {
    switch (action.type) {
        case PAX_DESIGNS_ACTION_TYPES.REQUEST_PAX_DESIGNS:
            return { ...state, loading: true, error: null }
        case PAX_DESIGNS_ACTION_TYPES.RECEIVED_PAX_DESIGNS:
            return { ...state, loading: false, designs: action.payload }
        case PAX_DESIGNS_ACTION_TYPES.FAILED_PAX_DESIGNS:
            return { ...state, loading: false, error: action.payload }
        case PAX_IMPORT_ACTION_TYPES.REQUEST_PAX_IMPORT:
            return { ...state, importLoading: true }
        case PAX_IMPORT_ACTION_TYPES.FINISH_PAX_IMPORT:
        case PAX_IMPORT_ACTION_TYPES.FAIL_PAX_IMPORT:
            return { ...state, importLoading: false }
        default:
            return state
    }
}
