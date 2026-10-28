import type { RootState } from 'store'

export const getSelectedWallColorGroupId = (state: RootState) => state.wallColor.groupId
export const getSelectedWallColorIndex = (state: RootState) => state.wallColor.colorIndex
