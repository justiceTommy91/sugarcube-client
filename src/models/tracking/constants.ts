import type { ValueOf } from 'utils/object'

export const TRACKING_ADDED_FROM = {
    SIDEPANEL: 'Panel',
    CATALOG: 'Catalog',
    RECOMMENDED: 'RecommendedProductList',
    CANVAS_ACTION: 'CanvasAction',
    MY_LIST: 'MyList',
    SALES_DRESSING: 'SalesDressing',
    DUPLICATE: 'Duplicate',
    SNAP_ROTATE: 'SnapRotate',
    GOES_WITH: 'GoesWellWithFeed',
    SIDEPANEL_FURNITURE_OPTIONS: 'SidepanelFurnitureOptions',
    SIDEPANEL_PRODUCT_DETAILS: 'SidepanelProductDetails',
    SIDEPANEL_EDIT_TAB: 'SidepanelEditTab',
    SIDEPANEL_FAVORITES_TAB: 'SidepanelFavoritesTab',
    DESIGN_SUMMARY: 'DesignSummary',
    DRAG_DROP: 'DragDrop',
    UPPTACKA_PIP_PANEL: 'UpptackaPipPanel',
    PRODUCT_VARIANT: 'ProductVariant',
    PRODUCT_SWAP: 'ProductSwap',
    COMPLETE_MY_ROOM: 'CompleteMyRoom',
} as const
export type TrackingAddedFrom = ValueOf<typeof TRACKING_ADDED_FROM>

export const TRACK_LOCATION_SIDEPANEL = 'Panel'
export const TRACK_LOCATION_DESIGN_SUMMARY = 'DesignSummary'
export const TRACK_LOCATION_DASHBOARD = 'Dashboard'
export const TRACK_LOCATION_DESIGN_HEADER = 'DesignHeader'
export const TRACK_LOCATION_SHARE_PANEL = 'SharePanel'
export const TRACK_LOCATION_OPTIONS_PANEL = 'OptionsPanel'
export const TRACK_LOCATION_SAVE_MODAL = 'SaveModal'
export const TRACK_LOCATION_NOT_SET = 'NotSet'
export const TRACK_LOCATION_LIVING_ROOM_PAGE = 'Category:living-room'
export const TRACK_LOCATION_LEARNMORE = 'LearnMore'
export const TRACK_LOCATION_MOBILE_DASHBOARD = 'MoblieDashboard'
export const TRACK_LOCATION_CAMPAIGN = 'Campaign'
export const TRACK_LOCATION_EDIT_ROOM_BUTTON = 'EditRoomButton'
export const TRACK_LOCATION_ROOM_BUILDER_BRIDGE = 'RoomBuilderBridge'

export const APP_TYPE_SUGARCUBE = 'Sugarcube'
export const APP_TYPE_MAGICWINDOW = 'MagicWindow'
export const APP_TYPE_DESIGN_HOME = 'DesignYourHome'
export const APP_TYPE_KIOSK = 'Kiosk'
export const APP_TYPE_UPPTACKA = 'Upptacka'
export const APP_TYPE_PIP = 'Pip'
export const APP_TYPE_SEARCH_BROWSE = 'SearchBrowse'
export const APP_TYPE_CATEGORY_LIVING_ROOM = 'Category:Livingroom'

export const APP_MODE_FULL_FEATURED = 'FullFeatured'
export const APP_MODE_SWAP_ONLY = 'SwapOnly'

export const DESIGN_SOURCE_USERDESIGNED = 'UserDesigned'
export const DESIGN_SOURCE_STOCK = 'Stock'

export const ROOM_SOURCE_USERCAPTURED = 'UserCaptured'
export const ROOM_SOURCE_STOCK = 'Stock'
export const ROOM_SOURCE_OTHER = 'Other'
export type RoomSource = typeof ROOM_SOURCE_USERCAPTURED | typeof ROOM_SOURCE_STOCK | typeof ROOM_SOURCE_OTHER

export const ROOM_SOURCE_DETAILS = {
    SINGLEVIEW_CAPTURE: 'SingleviewCapture',
    MULTIVIEW_CAPTURE: 'MultiviewCapture',
    SINGLEVIEW_SHOWROOM: 'SingleviewShowroom',
    MULTIVIEW_SHOWROOM: 'MultiviewShowroom',
    ROOM_BUILDER: 'RoomBuilder',
    UNKNOWN: 'Unknown',
} as const
export type RoomSourceDetail = ValueOf<typeof ROOM_SOURCE_DETAILS>

export const ROOM_VIEW_TYPE_SINGLE = 'SingleviewPano'
export const ROOM_VIEW_TYPE_MULTI = 'MultiviewPano'
export const ROOM_VIEW_TYPE_UNKNOWN = 'Unknown'
export type RoomViewType = typeof ROOM_VIEW_TYPE_MULTI | typeof ROOM_VIEW_TYPE_SINGLE | typeof ROOM_VIEW_TYPE_UNKNOWN

export const PRODUCT_TYPE_WALLART = 'WallArt'
export const PRODUCT_TYPE_FURNITURE = 'Furniture'
export const PRODUCT_TYPE_WALLFURNITURE = 'WallFurniture'
export const PRODUCT_TYPE_SALES_DRESSED_BEDS = 'SalesDressedBeds'
export const PRODUCT_TYPE_DUVET_SET = 'DuvetSet'
export const PRODUCT_TYPE_ACCENT_PILLOW = 'AccentPillowCover'
export const PRODUCT_TYPE_CUSTOMIZABLE_SALES_DRESSING = 'CustomizableSalesDressing'

export type ProductType =
    | typeof PRODUCT_TYPE_WALLART
    | typeof PRODUCT_TYPE_FURNITURE
    | typeof PRODUCT_TYPE_WALLFURNITURE
    | typeof PRODUCT_TYPE_SALES_DRESSED_BEDS
    | typeof PRODUCT_TYPE_DUVET_SET
    | typeof PRODUCT_TYPE_ACCENT_PILLOW
    | typeof PRODUCT_TYPE_CUSTOMIZABLE_SALES_DRESSING

export const APP_ENV_PROD = 'Production'
export const APP_ENV_TESTING = 'Testing'

// Removed from...
export const PRODUCT_SWAP = 'ProductSwap'
export const PRODUCT_VARIANT = 'ProductVariant'
export const TRASH_CAN = 'TrashCan'
export const DELETE_KEY = 'DeleteKey'
export const SALES_DRESSING = 'SalesDressing'
export const STACKABLE_DISCARDED = 'StackableDiscarded'
export const VIEWER_REJECTED = 'ViewerRejected'

export const GET_INFO_CANVAS_PIN = 'CanvasPin'
export const GET_INFO_PIN_CLICK = 'PinClick'
export const GET_INFO_CATALOG_LIST = 'CatalogList'
export const GET_INFO_ROOM_LIST = 'RoomList'
export const GET_INFO_FAVORITES_LIST = 'FavoritesList'
export const GET_INFO_SWAP_LIST = 'SwapList'

export const CATEGORY = 'Category'
export const SUB_CATEGORY = 'Sub-category'
export const FILTER_SOURCE_BREADCRUMB = 'Breadcrumb'
export const FILTER_SOURCE_MENU = 'Menu'
export const FILTER_SOURCE_URL_PARAM = 'UrlParam'

// Dashboard and Learnmore pages
export const ACCESS_FROM_SHOWROOM = 'ShowroomBanner'
export const ACCESS_FROM_OWNROOM = 'OwnroomBanner'
export const ACCESS_FROM_HERO = 'HeroBanner'
export const ACCESS_FROM_HERO_IMAGE = 'HeroBannerImage'
export const ACCESS_FROM_HERO_BUTTON = 'HeroBannerButton'
export const ACCESS_FROM_INSPIRED_DESIGN = 'InspiredDesign'
export const ACCESS_FROM_INTUITIVE_DESIGN = 'IntuitiveDesign'
export const ACCESS_FROM_SAVE_TIME_1 = 'SaveTime1'
export const ACCESS_FROM_SAVE_TIME_2 = 'SaveTime2'
export const ACCESS_FROM_CREATE_CONFIDENCE = 'CreateConfidence'
export const ACCESS_FROM_SHOWCASE = 'showcase'
export const ACCESS_FROM_CAROUSEL_HERO_BANNER = 'CarouselHeroBanner'
export const ACCESS_FROM_DESIGN_NOW_OPTIONS = 'DesignNowOptions'
export const ACCESS_FROM_FIND_PERFECT_ITEM = 'FindPerfectItem'
export const ACCESS_FROM_REFRESH_SPACE = 'RefreshSpace'
export const ACCESS_FROM_FURNISH_ENTIRE_ROOM = 'FurnishEntireRoom'

// Campaign Components

export const ACCESS_FROM_CAMPAIGN_HERO = 'CampaignHeroBanner'

// Choose room page
export const ACCESS_FROM_SCAN_SPACE = 'ScanMySpace'

// Search browse page
export const ACCESS_FROM_SEARCH_BROWSE = 'SearchBrowse'

// Design page
export const ACCESS_FROM_DECORATE_ROOM = 'DecorateRoom'
export const ACCESS_FROM_OWNSPACE_MODULE = 'OwnspaceModule'

// Optimizely custom events

// Defined in Optimizely web global project
// Add to cart clicks from the magic window/sugarcube/design lab experience
export const OPTIMIZELY_ADD_TO_CART_MW = 'add_to_cart_mw'
// Add to cart clicks from either magic window or general shopping experience on ikea.com
export const OPTIMIZELY_ADD_TO_CART = 'add_to_cart'

// Defined in Optimizely Geomagical full stack project
export const OPTIMIZELY_ADD_TO_CART_GEO = 'add_to_cart_geo'
export const OPTIMIZELY_ADD_PRODUCT = 'add_product'
export const OPTIMIZELY_REMOVE_PRODUCT = 'remove_product'
export const OPTIMIZELY_OPEN_ROOM = 'open_room'
export const OPTIMIZELY_APP_DOWNLOAD_CLICK = 'app_download_modal_open'
export const OPTIMIZELY_LEARNMORE = 'learn_more'
export const OPTIMIZELY_BEAUTIFY_ROOM = 'beautify_room'

// Google analytics events
// GA Categories
export const GA_CATEGORY_DESIGN_LAB = 'design_lab_actions'
export const GA_CATEGORY_DYH_SUGARCUBE = 'dyh_sugarcube'

// GA Actions
// dyh_sugarcube actions
export const GA_ACTION_REMOVE_PRODUCT = 'remove_product'
export const GA_ACTION_ADD_PRODUCT = 'add_product'
export const GA_ACTION_MOVE_PRODUCT = 'move_product'
export const GA_ACTION_ADD_TO_BAG = 'add_to_bag'
export const GA_ACTION_ADD_ROOM_TO_BAG = 'add_room_to_bag'
export const GA_ACTION_SAVE = 'save'
export const GA_ACTION_GET_DETAILS = 'get_additional_details'
export const GA_ACTION_ADD_FAVORITE = 'add_favorite'
export const GA_ACTION_REMOVE_FAVORITE = 'remove_favorite'
export const GA_ACTION_CHOOSE_ROOM_CAROUSEL_PREV = 'choose_room_carousel_prev_click'
export const GA_ACTION_CHOOSE_ROOM_CAROUSEL_NEXT = 'choose_room_carousel_next_click'
export const GA_ACTION_CHOOSE_ROOM_GET_APP = 'choose_room_get_ikea_app_click'
export const GA_ACTION_CHOOSE_ROOM_OPEN_ROOM = 'choose_room_open_room'
export const GA_ACTION_CHOOSE_ROOM_PAGE_VISIT = 'chooseRoom_page_visit'
export const GA_ACTION_SEARCH_BROWSE_PAGE_VISIT = 'searchBrowse_page_visit'
export const GA_ACTION_CATEGORY_PAGE_VISIT = 'category_page_visit'
export const GA_ACTION_SEARCH_BROWSE_GET_APP = 'search_browse_get_ikea_app_click'
export const GA_ACTION_SEARCH_BROWSE_OPEN_ROOM = 'search_browse_open_room'
export const GA_ACTION_SEARCH_BROWSE_SHOWROOM = 'search_browse_showroom_click'
export const GA_ACTION_DASHBOARD_PAGE_VISIT = 'dashboard_page_visit'
export const GA_ACTION_DASHBOARD_USE_CASE_CLICK = 'dashboard_use_case_click'
export const GA_ACTION_DASHBOARD_USE_CASE_SLIDER_HANDLE = 'dashboard_use_case_slider_handle'
export const GA_ACTION_DASHBOARD_LEARN_MORE_CLICK = 'dashboard_learn_more_click'
export const GA_ACTION_DASHBOARD_GET_IKEA_APP_CLICK = 'dashboard_get_ikea_app_click'
export const GA_ACTION_SHARE_PAGE_VISIT = 'share_page_visit'
export const GA_ACTION_DECORATE_ROOM_PAGE_VISIT = 'decorate_page_visit'
export const GA_ACTION_KIOSK_LANDING_PAGE_VISIT = 'kioskLanding_page_visit'
export const GA_ACTION_ERROR_PAGE_VISIT = 'error_page_visit'
export const GA_ACTION_LEARN_MORE_PAGE_VISIT = 'learnmore_page_visit'
export const GA_ACTION_WORDPRESS_PAGE_VISIT = 'wordpress_page_visit'
export const GA_ACTION_WORDPRESS_CLICK = 'wordpress_button_click'
export const GA_ACTION_BLOG_CLICK = 'dashboard_blog_click'
export const GA_ACTION_LEARN_MORE_TRY_EMPTY_ROOMS_CLICK = 'learnmore_try_empty_rooms_click'
export const GA_ACTION_LEARN_MORE_GO_TO_FURNISHED_ROOMS_CLICK = 'learnmore_go_to_furnished_rooms_click'
export const GA_ACTION_LEARN_MORE_GO_TO_IKEA_APP_CLICK = 'learnmore_go_to_ikea_app_click'
export const GA_ACTION_LEARN_MORE_GO_TO_BEDROOM = 'learnmore_go_to_bedroom'
export const GA_ACTION_LEARN_MORE_GO_TO_ROOMS = 'learnmore_go_to_rooms'
export const GA_ACTION_LEARN_MORE_SHOW_CASE_CLICK = 'learnmore_show_case_click'
export const GA_ACTION_LEFT_PANEL_SCROLL_START = 'left_panel_scroll_start'
export const GA_ACTION_LEFT_PANEL_SCROLL_END = 'left_panel_scroll_to_end'
export const GA_ACTION_TOGGLE_PINS_VISIBILITY = 'toggle_pins'
export const GA_ACTION_USER_SCROLL_PAST = 'user_scroll_past'
export const GA_ACTION_CAMPAIGN_PAGE_VISIT = 'campaign_page_visit'
export const GA_ACTION_ROOM_BUILDER_PAGE_VISIT = 'room_builder_page_visit'
export const GA_ACTION_ROOM_EDITOR_PAGE_VISIT = 'room_editor_page_visit'

// dyh_sugarcube labels
export const GA_LABEL_PIP_CONTEXT = 'PipV3D'
export const GA_LABEL_SEARCH_BROWSE_CONTEXT = 'SearchBrowse'
export const GA_LABEL_RETURN_USER = 'ReturnUser'
export const GA_LABEL_NEW_USER = 'NewUser'
export const GA_LABEL_SELECTING_SPACE = 'get_started_by_selecting_a_space'
export const GA_LABEL_SCAN_YOUR_SPACE = 'scan_your_space'
export const GA_LABEL_DESIGN_NOW_OPTIONS = 'DesignNowOptions'

// design_lab actions

export const GA_ACTION_HERO = 'hero_banner_click'
export const GA_ACTION_GET_IKEA_APP = 'ikea_app_banner_click'
export const GA_ACTION_OPEN_ROOM = 'open-room'
export const GA_ACTION_ROOM_BUILDER_OPEN_MODAL = 'roombuilder_openModal'
export const GA_ACTION_ROOM_BUILDER_DESIGN_THIS_ROOM = 'roombuilder_designThisRoom'

// design_lab labels
export const GA_LABEL_INSPIRED_DESIGN = 'inspired_design_section'
export const GA_LABEL_INTUITIVE_DESIGN = 'intuitive_design_section'
export const GA_LABEL_SAVE_TIME_1 = 'save_time_effort_section_1'
export const GA_LABEL_SAVE_TIME_2 = 'save_time_effort_section_2'
export const GA_LABEL_CREATE_CONFIDENCE = 'create_with_confidence_section'
export const GA_LEARN_MORE_BEDROOM_LABEL = 'bedroom'
export const GA_LEARN_MORE_MAIN_LABEL = 'main'
export const GA_LEARN_MORE_HEADER_LABEL = 'header'
export const GA_SHOWCASE_LABEL = 'showcase'
export const GA_LABEL_PLAY_STORE = 'go_to_googleplaystore'
export const GA_LABEL_APP_STORE = 'go_to_applestore'

// Error actions
export const GA_ACTION_CRITICAL_ERROR = 'support/onCriticalError'

// Error labels
export const GA_LABEL_CRITICAL_ERROR = 'critical_error'

// Actions
export const ACTION_SWAP_PRODUCT = 'DecorateRoom.SwapProduct'
export const ACTION_ADD_PRODUCT = 'DecorateRoom.AddProduct'
export const ACTION_REMOVE_PRODUCT = 'DecorateRoom.RemoveProduct'

// Starter set sidepanel
export const ACTION_STARTER_SET_SIDEPANEL_SKIP = 'DecorateRoom.StarterSet.Skip'
export const ACTION_STARTER_SET_CHANGE_ROOM_TYPE = 'DecorateRoom.StarterSet.RoomType'
export const ACTION_STARTER_SET_CUSTOMIZE = 'DecorateRoom.StarterSet.Customize'
export const ACTION_STARTER_SET_SELECT = 'DecorateRoom.StarterSet.Select'
export const GA_ACTION_STARTER_SET_CLOSE_STARTER_SET_SIDEPANEL = 'starter_set_close_sidepanel'
export const GA_ACTION_STARTER_SET_CHANGE_ROOM_TYPE = 'starter_set_change_room_type'
export const GA_ACTION_STARTER_SET_SELECT = 'starter_set_select'
export const GA_ACTION_STARTER_SET_CUSTOMIZE = 'starter_set_customize'

// Starter set modal
export const ACTION_STARTER_SET_MODAL_DISPLAY = 'DecorateRoom.StarterSet.Display'
export const ACTION_STARTER_SET_MODAL_OPEN = 'DecorateRoom.StarterSet.Explore.Open'
export const ACTION_STARTER_SET_MODAL_CLOSE = 'DecorateRoom.StarterSet.Explore.Close'
export const GA_ACTION_STARTER_SET_MODAL_DISPLAY = 'starter_set_display'
export const GA_ACTION_STARTER_SET_MODAL_OPEN = 'starter_set_explore_open'
export const GA_ACTION_STARTER_SET_MODAL_CLOSE = 'starter_set_explore_close'

// Expert check labels
export const TRACK_LOCATION_EXPERT_CHECK = 'ExpertCheck'
export const ACTION_OPEN_EXPERT_CHECK_PANEL = 'DecorateRoom.OpenExpertCheckPanel'
export const ACTION_CLOSE_EXPERT_CHECK_PANEL = 'DecorateRoom.CloseExpertCheckPanel'
export const ACTION_ACCEPT_EXPERT_CHECK_TERMS = 'DecorateRoom.AcceptExpertCheckTerms'
export const ACTION_UNACCEPT_EXPERT_CHECK_TERMS = 'DecorateRoom.UnacceptExpertCheckTerms'
export const ACTION_SCHEDULE_EXPERT_CHECK = 'DecorateRoom.ScheduleExpertCheck'
export const ACTION_LOGIN_SIGNUP_EXPERT_CHECK = 'DecorateRoom.LoginSignupExpertCheck'
export const ACTION_DASHBOARD_EXPERT_CHECK_BANNER = 'Dashboard.ExpertCheckBannerClick'
export const ACTION_CLICK_EXPERT_CHECK_CALLOUT = 'DecorateRoom.ExpertCheckCalloutClick'
export const ACTION_CLOSE_EXPERT_CHECK_CALLOUT = 'DecorateRoom.CloseExpertCheckCallout'
export const GA_ACTION_OPEN_EXPERT_CHECK_PANEL = 'expert_check_button_click'
export const GA_ACTION_CLOSE_EXPERT_CHECK_PANEL = 'expert_check_close_panel'
export const GA_ACTION_ACCEPT_EXPERT_CHECK_TERMS = 'expert_check_accept_terms'
export const GA_ACTION_UNACCEPT_EXPERT_CHECK_TERMS = 'expert_check_unaccept_terms'
export const GA_ACTION_SCHEDULE_EXPERT_CHECK = 'expert_check_cta_click'
export const GA_ACTION_LOGIN_SIGNUP_EXPERT_CHECK = 'expert_check_login_signup_click'
export const GA_ACTION_CLICK_EXPERT_CHECK_CALLOUT = 'expert_check_callout_click'
export const GA_ACTION_CLOSE_EXPERT_CHECK_CALLOUT = 'expert_check_callout_close'
export const GA_ACTION_SHOW_EXPERT_CHECK_CALLOUT = 'expert_check_callout_show'
export const GA_LABEL_EXPERT_CHECK_HEADER_BUTTON = 'preview_header_button'
export const GA_LABEL_EXPERT_CHECK_CALLOUT = 'expert_check_callout'
export const GA_LABEL_EXPERT_CHECK_CALLOUT_CLOSE_BUTTON = 'expert_check_callout_close_button'
export const GA_LABEL_EXPERT_CHECK_CALLOUT_CLOSE_BUTTON_TIMEOUT = 'expert_check_callout_close_button_timer_trigger'
export const GA_LABEL_EXPERT_CHECK_SUMMARY_BUTTON = 'summary_button'
export const GA_LABEL_EXPERT_CHECK_CALLOUT_TIMEOUT = 'expert_check_callout_timer_trigger'
export const GA_ACTION_EXPOSE_EXPERT_CHECK = 'expert_check_button_exposed'
export const GA_ACTION_DASHBOARD_EXPERT_CHECK_BANNER_CLICK = 'dashboard_expert_check_banner_click'
export const GA_ACTION_DASHBOARD_CHOOSE_ROOM = 'dashboard_choose_room'

// Upptacka labels
export const TRACK_LOCATION_UPPTACKA_PIP_PANEL = 'UpptackaPipPanel'
export const GA_ACTION_UPPTACKA_LANDING_PAGE_VISIT = 'upptacka_landing_page_visit'
export const ACTION_UPPTACKA_TOGGLE_PIN_VISIBILITY = 'Upptacka.TogglePins'
export const GA_ACTION_UPPTACKA_OPEN_EXIT_PANEL = 'upptacka_exit_panel_open_click'
export const ACTION_UPPTACKA_OPEN_EXIT_PANEL = 'Upptacka.OpenExitPanelClick'
export const GA_ACTION_UPPTACKA_OPEN_SAVE_PANEL = 'upptacka_save_design_panel_open_click'
export const ACTION_UPPTACKA_OPEN_SAVE_PANEL = 'Upptacka.OpenSaveDesignPanelClick'
export const GA_ACTION_UPPTACKA_OPEN_SUMMARY_PANEL = 'upptacka_summary_panel_open_click'
export const ACTION_UPPTACKA_OPEN_SUMMARY_PANEL = 'Upptacka.OpenSummaryPanelClick'
export const GA_ACTION_UPPTACKA_CLOSE_PANEL = 'upptacka_close_panel'
export const LABEL_UPPTACKA_CLOSE_EXIT_PANEL = 'exit'
export const LABEL_UPPTACKA_CLOSE_SAVE_PANEL = 'save'
export const LABEL_UPPTACKA_CLOSE_SUMMARY_PANEL = 'summary'
export const ACTION_UPPTACKA_CLOSE_PANEL = 'Upptacka.ClosePanelClick'
export const GA_ACTION_UPPTACKA_EXIT = 'upptacka_exit_confirm_click'
export const ACTION_UPPTACKA_EXIT = 'Upptacka.ConfirmExitClick'
export const GA_ACTION_UPPTACKA_ADD_TO_SHOPPING_LIST = 'upptacka_summary_add_to_shopping_list_button_click'
export const ACTION_UPPTACKA_ADD_TO_SHOPPING_LIST = 'Upptacka.SummaryAddToShoppingListClick'
export const GA_ACTION_UPPTACKA_TOGGLE_ALL_ITEMS = 'upptacka_summary_toggle_all_items'
export const LABEL_UPPTACKA_SELECT_ALL_ITEMS = 'select_all'
export const LABEL_UPPTACKA_DESELECT_ALL_ITEMS = 'deselect_all'
export const ACTION_UPPTACKA_TOGGLE_ALL_ITEMS = 'Upptacka.SummaryToggleAllItems'
export const GA_ACTION_OPEN_UPPTACKA_PRODUCT_DETAILS = 'upptacka_side_panel_pip_info_click'
export const ACTION_OPEN_UPPTACKA_PRODUCT_DETAILS = 'Upptacka.SidePanelPipInfoClick'
export const GA_ACTION_OPEN_DESIGN_TIPS = 'upptacka_open_tips_button_click'
export const ACTION_OPEN_DESIGN_TIPS = 'Upptacka.OpenDesignTipsClick'
export const GA_ACTION_CLOSE_DESIGN_TIPS = 'upptacka_exit_tips_button_click'
export const ACTION_CLOSE_DESIGN_TIPS = 'Upptacka.ExitDesignTipsClick'
export const GA_ACTION_ADVANCE_DESIGN_TIPS = 'upptacka_advance_tips_slide'
export const ACTION_ADVANCE_DESIGN_TIPS = 'Upptacka.AdvanceDesignTipsSlide'
export const GA_ACTION_ADVANCE_UPPTACKA_SHOWROOM_SLIDE = 'upptacka_room_advance_click'
export const ACTION_ADVANCE_UPPTACKA_SHOWROOM_SLIDE = 'Upptacka.ShowroomAdvanceClick'
export const GA_ACTION_UPPTACKA_OPEN_SHOWROOM_CLICK = 'upptacka_landing_page_open_room_click'
export const ACTION_UPPTACKA_OPEN_SHOWROOM_CLICK = 'Upptacka.OpenShowroomClick'

// App store links source values used for tracking
export const APP_STORE_SOURCE_MOBILE_DASHBOARD = 'WebMobileDashboard'
export const APP_STORE_SOURCE_MOBILE_DESIGN = 'WebMobileDesign'
export const APP_STORE_SOURCE_MOBILE_LEARNMORE_V1 = 'WebMobileLearnmoreV1'
export const APP_STORE_SOURCE_MOBILE_LEARNMORE_V2 = 'WebMobileLearnMoreV2'
export const APP_STORE_SOURCE_MOBILE_SEARCH_BROWSE = 'WebMobileSearchBrowse'
export const APP_STORE_SOURCE_WEB_DESIGN = 'WebDesign'
export const APP_STORE_SOURCE_WEB_DASHBOARD = 'WebDashboard'
export const APP_STORE_SOURCE_WEB_LEARNMORE_V1 = 'WebLearnmoreV1'
export const APP_STORE_SOURCE_WEB_LEARNMORE_V2 = 'WebLearnmoreV2'
export const APP_STORE_SOURCE_WEB_SEARCH_BROWSE = 'WebSearchBrowse'
export const APP_STORE_SOURCE_WEB_CHOOSE_ROOM = 'WebChooseroom'
export const APP_STORE_SOURCE_WEB_LIVING_ROOM = 'WebLivingRoom'
export const APP_STORE_SOURCE_WEB_DESIGN_NOW = 'WebDesignNow'
export const APP_STORE_SOURCE_WEB_CAMPAIGN = 'WebCampaign'
export const APP_STORE_SOURCE_KREATIV_LITE_PROMO = 'KreativLiteAppPromo'

export type WebSourceType =
    | typeof APP_STORE_SOURCE_WEB_DESIGN
    | typeof APP_STORE_SOURCE_WEB_DASHBOARD
    | typeof APP_STORE_SOURCE_WEB_LEARNMORE_V1
    | typeof APP_STORE_SOURCE_WEB_LEARNMORE_V2
    | typeof APP_STORE_SOURCE_WEB_SEARCH_BROWSE
    | typeof APP_STORE_SOURCE_WEB_CHOOSE_ROOM
    | typeof APP_STORE_SOURCE_WEB_LIVING_ROOM
    | typeof APP_STORE_SOURCE_WEB_DESIGN_NOW
    | typeof APP_STORE_SOURCE_WEB_CAMPAIGN

// Category pages GA actions
export const GA_ACTION_CATEGORY_GOTO_ROOMBUILDER = 'category_goto_roombuilder'
export const GA_ACTION_CATEGORY_GET_IKEA_APP = 'category_get_ikea_app_click'
export const GA_ACTION_CATEGORY_GOTO_DASHBOARD = 'category_goto_dashboard'

// Dimensions
export const ACTION_DIMENSIONS = 'DecorateRoom.Dimensions'
export const ACTION_TOGGLE_ROOM = 'DecorateRoom.Dimensions.ToggleRoom'
export const ACTION_TOGGLE_ITEM = 'DecorateRoom.Dimensions.ToggleItem'
export const ACTION_TOGGLE_DYNAMIC_MEASUREMENTS = 'DecorateRoom.Dimensions.ToggleDynamicMeasurements'
export const ACTION_TOGGLE_UNIT = 'DecorateRoom.Dimensions.Unit'
export const ACTION_ROOM_BUILDER_BRIDGE = 'DecorateRoom.RoomBuilderBridge'

// Edit Room
export const ACTION_EDIT_ROOM = 'DecorateRoom.EditRoom'

// Beautifier
export const ACTION_BEAUTIFY_OPEN = 'DecorateRoom.Beautify'
export const ACTION_BEAUTIFY_ROOM = 'DecorateRoom.BeautifyRoom'
export const ACTION_BEAUTIFY_CANCEL = 'DecorateRoom.BeautifyRoom.Cancel'
export const ACTION_BEAUTIFY_COMPLETE = 'DecorateRoom.BeautifyRoom.Complete'
export const ACTION_BEAUTIFY_ERROR = 'DecorateRoom.BeautifyRoom.Error'
export const ACTION_BEAUTIFY_RETRY = 'DecorateRoom.BeautifyRoom.Retry'
export const ACTION_BEAUTIFY_DISMISS = 'DecorateRoom.BeautifyRoom.Dismiss'
export const ACTION_BEAUTIFY_VIEWER_DOWNLOAD = 'DecorateRoom.BeautifyRoom.ViewerDownload'

// Search and Filters tracking
export const ACTION_SEARCH_RESULT = 'DecorateRoom.Search.Result'

// Enhanced SearchType values per requirements
export const SEARCH_TYPES = {
    TEXT_BOX: 'textBox', // Search query changes
    QUICK_FILTER: 'quickFilter', // Pill dropdown filters/sort
    FILTER: 'filter', // AllFiltersModal changes
    ROOM_TYPE: 'roomType', // Room type selection
    SUB_CATEGORY: 'subCategory', // Subcategory selection
    INITIAL_LOAD: 'initialLoad', // Initial room type load
    CLEAR_SEARCH: 'clearSearch', // Search cleared, room type restored
} as const

export type SearchType = ValueOf<typeof SEARCH_TYPES>

// Search result status
export const SEARCH_RESULT_SUCCESS = 'Success'
export const SEARCH_RESULT_FAILED = 'Failed'

export const ROOM_BUILDER_MODE_CREATE = 'Create'
export const ROOM_BUILDER_MODE_EDIT = 'Edit'

// KreativLite tracking event names
export const KREATIVLITE_DASHBOARD_OPEN = 'Dashboard.KreativLite.Open'
export const KREATIVLITE_FILE_SELECT = 'KreativLite.FileSelect'
export const KREATIVLITE_AUTHENTICATION_CLICK = 'KreativLite.AuthenticationClick'
export const KREATIVLITE_CLOSE = 'KreativLite.Close'
export const KREATIVLITE_IMAGE_UPLOAD = 'KreativLite.ImageUpload'
export const KREATIVLITE_PROCESSING_VISIT = 'KreativLite.Processing.Visit'
export const KREATIVLITE_PROCESSING_EXTENDED = 'KreativLite.Processing.Extended'
export const KREATIVLITE_PROCESSING_END = 'KreativLite.Processing.End'
export const KREATIVLITE_PROCESSING_NO_SCENE_ID = 'KreativLite.Processing.NoSceneId'

// KreativLite selection methods
export const KREATIVLITE_SELECTION_CLICK_BUTTON = 'click_button'
export const KREATIVLITE_SELECTION_DRAG_DROP = 'drag_drop'

// KreativLite authentication actions
export const KREATIVLITE_AUTH_CREATE_ACCOUNT = 'create_account'
export const KREATIVLITE_AUTH_LOGIN = 'login'

// KreativLite image orientations
export const KREATIVLITE_ORIENTATION_PORTRAIT = 'portrait'
export const KREATIVLITE_ORIENTATION_LANDSCAPE = 'landscape'
export const KREATIVLITE_ORIENTATION_SQUARE = 'square'
export const KREATIVLITE_ORIENTATION_UNKNOWN = 'unknown'

// KreativLite results
export const KREATIVLITE_RESULT_SUCCESS = 'success'
export const KREATIVLITE_RESULT_FAIL = 'fail'
export const KREATIVLITE_RESULT_TOO_LARGE = 'too_large'
export const KREATIVLITE_RESULT_UNSUPPORTED_TYPE = 'unsupported_type'
export const KREATIVLITE_RESULT_PROCESSING_ERROR = 'processing_error'

// KreativLite error fallback
export const KREATIVLITE_ERROR_UNKNOWN = 'unknown_error'

// Navigator share
export const ACTION_NAVIGATOR_SHARE_FAILED = 'NavigatorShare.Failed'
export const TRACK_SOURCE_FULL_EXPERIENCE_CAROUSEL = 'KLiteFullExperienceCarousel'

// KreativLite Google Analytics actions
export const GA_ACTION_KREATIVLITE_OPEN = 'kreativlite_modal_open_click'
export const GA_ACTION_KREATIVLITE_FILE_SELECT = 'kreativlite_file_select'
export const GA_ACTION_KREATIVLITE_AUTH_CLICK = 'kreativlite_auth_click'
export const GA_ACTION_KREATIVLITE_CLOSE = 'kreativlite_modal_close_click'
export const GA_ACTION_KREATIVLITE_IMAGE_UPLOAD = 'kreativlite_image_upload'
export const GA_ACTION_KREATIVLITE_PROCESSING_VISIT = 'kreativlite_processing_page_visit'
export const GA_ACTION_KREATIVLITE_PROCESSING_EXTENDED = 'kreativlite_processing_extended'
export const GA_ACTION_KREATIVLITE_PROCESSING_END = 'kreativlite_processing_complete'
export const GA_ACTION_KREATIVLITE_PROCESSING_ERROR = 'kreativlite_processing_no_scene_id'

// Scene's source type labels
export const SOURCE_TYPE_LABEL_CAPTURED = 'CAPTURED'
export const SOURCE_TYPE_LABEL_SYNTHETIC = 'SYNTHETIC'
export const SOURCE_TYPE_LABEL_ROOM_BUILDER = 'ROOM_BUILDER'
export const SOURCE_TYPE_LABEL_VIRTUAL_STAGING = 'VIRTUAL_STAGING'
export const SOURCE_TYPE_LABEL_LITE_SCAN = 'KREATIV_LITE_SCAN'
export const SOURCE_TYPE_LABEL_FMF_LITE = 'FMF_LITE'
export const SOURCE_TYPE_LABEL_UNKNOWN = 'UNKNOWN'

// Decorate my room
export const ACTION_COMPLETE_MY_ROOM_ERROR = 'DecorateRoom.CompleteMyRoom.Error'
