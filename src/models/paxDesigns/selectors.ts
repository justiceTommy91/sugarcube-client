import type { RootState } from 'store'

export const getPAXDesigns = (state: RootState) => state.paxDesigns.designs
export const getPAXDesignsLoading = (state: RootState) => state.paxDesigns.loading
export const getPAXDesignsError = (state: RootState) => state.paxDesigns.error
export const getPAXImportLoading = (state: RootState) => state.paxDesigns.importLoading
