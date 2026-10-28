import { PAX_DESIGNS_ACTION_TYPES, PAX_IMPORT_ACTION_TYPES } from './constants'
import type { PAXDesign } from './types'

export const requestPAXDesigns = () => ({
    type: PAX_DESIGNS_ACTION_TYPES.REQUEST_PAX_DESIGNS,
})

export const receivedPAXDesigns = (designs: PAXDesign[]) => ({
    type: PAX_DESIGNS_ACTION_TYPES.RECEIVED_PAX_DESIGNS,
    payload: designs,
})

export const failedPAXDesigns = (error: string) => ({
    type: PAX_DESIGNS_ACTION_TYPES.FAILED_PAX_DESIGNS,
    payload: error,
})

export const requestPAXImport = (vpcCode: string) => ({
    type: PAX_IMPORT_ACTION_TYPES.REQUEST_PAX_IMPORT,
    payload: vpcCode,
})

export const finishPAXImport = () => ({
    type: PAX_IMPORT_ACTION_TYPES.FINISH_PAX_IMPORT,
})

export const failPAXImport = (error: string) => ({
    type: PAX_IMPORT_ACTION_TYPES.FAIL_PAX_IMPORT,
    payload: error,
})
