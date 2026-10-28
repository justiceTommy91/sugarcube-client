import type { RootState } from 'store'

export const getDecidedFlags = (state: RootState) => state.experiments.decisions.flags

export const getChosenVariations = (state: RootState) => state.experiments.decisions.variations
