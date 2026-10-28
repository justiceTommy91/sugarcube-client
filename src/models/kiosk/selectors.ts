import { RootState } from 'store'

export const getKioskSelectedRoomType = (state: RootState) => state.kiosk.kioskSelectedRoomType

export const getIsKioskIntroViewed = (state: RootState) => state.kiosk.isKioskIntroViewed
