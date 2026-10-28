import type { RootState } from 'store'
import type { DebugMessage, DebugSettings } from './index'

export function getDebugSettings(state: RootState): DebugSettings
export function getDebugConsoleMessages(state: RootState): DebugMessage[]

export function getCanEditArtSize(state: RootState): boolean
