import { RootState } from 'store'

export const getLastSavedUpptackaComposition = (state: RootState) => state.upptacka.lastSavedUpptackaComposition
export const getShowUpptackaDetailsView = (state: RootState) => state.upptacka.showUpptackaDetailsView
export const getUpptackaDetailsFurnitureId = (state: RootState) => state.upptacka.upptackaDetailsFurnitureId
export const getShowUpptackaSummary = (state: RootState) => state.upptacka.showUpptackaSummary
export const getShowUpptackaSaveModal = (state: RootState) => state.upptacka.showUpptackaSaveModal
export const getShowUpptackaExitModal = (state: RootState) => state.upptacka.showUpptackaExitModal
export const getShowUpptackaDesignTips = (state: RootState) => state.upptacka.showUpptackaDesignTips
export const getSceneHasBeenInteractedWith = (state: RootState) => state.upptacka.sceneHasBeenInteractedWith
