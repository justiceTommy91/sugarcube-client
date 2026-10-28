export const Page = {
    DASHBOARD: 'Dashboard',
    CHOOSE_ROOM: 'ChooseRoom',
    SEARCH_BROWSE: 'SearchBrowse',
    SHARE: 'Share',
    LEARN_MORE: 'LearnMore',
    DECORATE_ROOM: 'DecorateRoom',
    KIOSK_LANDING: 'KioskLanding',
    WORD_PRESS_POST: 'WordPressPost',
    LOGIN: 'Login',
    IFRAME_TEST: 'IFrameTest',
    UPPTACKA_IFRAME_TEST: 'UpptackaIframeTest',
    UPPTACKA_SHOWROOM: 'UpptackaShowroom',
    CATEGORY: 'Category',
    CAMPAIGN: 'Campaign',
    ROOM_BUILDER: 'RoomBuilder',
    ROOM_EDITOR: 'RoomEditor',
    KREATIV_LITE_UPLOAD: 'KreativLiteUpload',
} as const
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Page = (typeof Page)[keyof typeof Page]
