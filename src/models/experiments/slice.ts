import { type PayloadAction, createSlice } from '@reduxjs/toolkit'

import { type ExperimentsState, experimentsService } from 'services/experiments'

const initialState: ExperimentsState = {
    status: 'pending',
    decisions: {
        flags: experimentsService.defaultFlagDecisions,
        variations: experimentsService.defaultVariationChoices,
    },
}

/**
 * This Redux slice is simply an interface to the existing {@link experimentsService}, and isn't the authoritative
 * source of truth for experiments.
 */
export const slice = createSlice({
    name: 'experiments',
    initialState,
    reducers: {
        resolve: (_state, action: PayloadAction<ExperimentsState>) => action.payload,
    },
})
