import type { RootState } from 'store'

export const getHasOutage = (state: RootState) => state.support.hasOutage
export const getMessagesByLanguage = (state: RootState) => state.support.messagesByLanguage
