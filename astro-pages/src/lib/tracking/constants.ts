/**
 * Tracking constants for Astro pages
 */

// ─── FMF Landing ─────────────────────────────────────────────────────────────

// Mixpanel
export const MP_FIND_MY_FIT_LANDING_PHOTO_ACTION_CLICK = 'FMFLanding.PhotoActionClick'
export const MP_FIND_MY_FIT_LANDING_TRY_SAMPLE_SPACE_CLICK = 'FMFLanding.TrySampleSpaceClick'
export const MP_FIND_MY_FIT_LANDING_SAMPLE_SPACE_OPEN = 'FMFLanding.SampleSpaceOpen'
export const MP_FIND_MY_FIT_LANDING_APP_STORE_CLICK = 'FMFLanding.AppStoreClick'
export const MP_FIND_MY_FIT_LANDING_PLAY_STORE_CLICK = 'FMFLanding.PlayStoreClick'
export const MP_FIND_MY_FIT_LANDING_DESKTOP_LINK_COPY = 'FMFLanding.DesktopLinkCopy'
export const MP_FIND_MY_FIT_LANDING_SECTION_VIEWED = 'FMFLanding.SectionViewed'

// GA
export const GA_ACTION_FMFLANDING_PAGE_VISIT = 'fmfLanding_page_visit'
export const GA_ACTION_FMFLANDING_PHOTO_ACTION_CLICK = 'fmfLanding_photo_action_click'
export const GA_ACTION_FIND_MY_FIT_LANDING_APP_STORE_CLICK = 'fmfLanding_app_store_click'
export const GA_ACTION_FIND_MY_FIT_LANDING_PLAY_STORE_CLICK = 'fmfLanding_play_store_click'
export const GA_ACTION_FIND_MY_FIT_LANDING_DESKTOP_LINK_COPY = 'fmfLanding_desktop_link_copy'

// ─── FMF Upload (index page + processing) ────────────────────────────────────

// Mixpanel
export const FMF_FILE_SELECT = 'FMF.FileSelect'
export const FMF_IMAGE_UPLOAD = 'FMF.ImageUpload'
export const FMF_PROCESSING_VISIT = 'FMF.Processing.Visit'
export const FMF_PROCESSING_EXTENDED = 'FMF.Processing.Extended'
export const FMF_PROCESSING_END = 'FMF.Processing.End'
export const FMF_LOGIN_PROMPT_CLICK = 'FMF.LoginPrompt.Click'

// GA
export const GA_ACTION_FMF_FILE_SELECT = 'fmf_file_select'
export const GA_ACTION_FMF_IMAGE_UPLOAD = 'fmf_image_upload'
export const GA_ACTION_FMF_PROCESSING_VISIT = 'fmf_processing_page_visit'
export const GA_ACTION_FMF_PROCESSING_EXTENDED = 'fmf_processing_extended'
export const GA_ACTION_FMF_PROCESSING_END = 'fmf_processing_complete'

// Payload values
export const FMF_LOGIN_PROMPT_ACTION_LOGIN = 'Login'
export const FMF_LOGIN_PROMPT_ACTION_SIGNUP = 'Signup'

// ─── FMF Browser (viewer) ─────────────────────────────────────────────────────

// Mixpanel
export const FMFBROWSER_PAGE_VISIT = 'FMFBrowser'
export const FMFBROWSER_FOCUS_AREA_DRAWN = 'FMFBrowser.FocusAreaDrawn'
export const FMFBROWSER_FOCUS_AREA_CONTINUE = 'FMFBrowser.FocusAreaContinue'
export const FMFBROWSER_EDIT_BOUNDING_BOX = 'FMFBrowser.EditBoundingBox'
export const FMFBROWSER_FOCUS_AREA_CLEARED = 'FMFBrowser.FocusAreaCleared'
export const FMFBROWSER_VIEW_RESULTS_CLICK = 'FMFBrowser.ViewResultsClick'
export const FMFBROWSER_EDIT_FOCUS_AREA_CLICK = 'FMFBrowser.EditFocusAreaClick'
export const FMFBROWSER_ERASE_ITEMS_TAB_CLICK = 'FMFBrowser.EraseItemsTabClick'
export const FMFBROWSER_EDIT_AREA_TAB_CLICK = 'FMFBrowser.EditAreaTabClick'
export const FMFBROWSER_PRODUCT_VIEWED = 'FMFBrowser.ProductViewed'
export const FMFBROWSER_ADD_TO_CART = 'FMFBrowser.AddToCart'
export const FMFBROWSER_ADD_FAVORITE = 'FMFBrowser.AddFavorite'
export const FMFBROWSER_REMOVE_FAVORITE = 'FMFBrowser.RemoveFavorite'
export const FMFBROWSER_SHOW_DETAILS_CLICK = 'FMFBrowser.ShowDetailsClick'
export const FMFBROWSER_ITEM_TOGGLED = 'FMFBrowser.ItemToggled'

// GA
export const GA_ACTION_FMFBROWSER_PAGE_VISIT = 'fmfBrowser_page_visit'
export const GA_ACTION_FMFBROWSER_FOCUS_AREA_DRAWN = 'fmfBrowser_focus_area_drawn'
export const GA_ACTION_FMFBROWSER_PRODUCT_VIEWED = 'fmfBrowser_product_viewed'
export const GA_ACTION_FMFBROWSER_ADD_TO_CART = 'fmfBrowser_add_to_cart'
export const GA_ACTION_FMFBROWSER_ADD_FAVORITE = 'fmfBrowser_add_favorite'
export const GA_ACTION_FMFBROWSER_REMOVE_FAVORITE = 'fmfBrowser_remove_favorite'
export const GA_ACTION_FMFBROWSER_SHOW_DETAILS = 'fmfBrowser_show_details'

// Payload values
export const FMF_SCENE_TYPE_USER_PHOTO = 'UserPhoto'
export const FMF_SCENE_TYPE_SAMPLE_SCENE = 'SampleScene'
export const FMF_EDIT_BOUNDING_BOX_ACCESS_FROM_SCRIBBLE = 'Scribble'
export const FMF_EDIT_BOUNDING_BOX_ACCESS_FROM_CIRCLE_DRAG = 'CircleDrag'
export const FMF_EDIT_BOUNDING_BOX_ACCESS_FROM_NUMBER_INPUT = 'NumberInput'
export const FMF_VIEW_RESULTS_ACCESS_FROM_SCRIBBLE = 'Scribble'
export const FMF_VIEW_RESULTS_ACCESS_FROM_EDIT_DIMENSIONS = 'EditDimensions'
export const FMF_CART_FAVORITE_ACCESS_FROM_SELECTED_PRODUCT = 'SelectedProduct'
export const FMF_CART_FAVORITE_ACCESS_FROM_PRODUCT_LIST = 'ProductList'
export const FMF_NAVIGATION_DIRECTION_NEXT = 'next'
export const FMF_NAVIGATION_DIRECTION_PREVIOUS = 'previous'
export const FMF_NAVIGATION_METHOD_SWIPE = 'Swipe'
export const FMF_NAVIGATION_METHOD_PRODUCT_LIST = 'ProductList'
export const FMF_NAVIGATION_METHOD_VIEW_RESULTS = 'ViewResults'

// ─── FMF Viewer — CSAT survey ─────────────────────────────────────────────────

// Mixpanel
export const MP_FMF_CSAT_SHOWN = 'FMF.CsatSurvey'
export const MP_FMF_CSAT_SUBMIT = 'FMF.CsatSurvey.Submit'
export const MP_FMF_CSAT_WRITTEN_SUBMIT = 'FMF.CsatSurvey.WrittenFeedback.Submit'
export const MP_FMF_CSAT_DISMISS = 'FMF.CsatSurvey.Dismiss'
export const MP_FMF_CSAT_WRITTEN_DISMISS = 'FMF.CsatSurvey.WrittenFeedback.Dismiss'

// Payload values
export const CSAT_FMF_STORAGE_KEY = 'GeoFmfFeedbackForm'
export const CSAT_DELAY_MS = 60 * 1000 // 1 minute

// ─── FMF — shared / cross-feature ────────────────────────────────────────────

// Mixpanel
export const FMF_UNSUPPORTED_DEVICE_REDIRECT = 'FMF.UnsupportedDevice.Redirect'

// Payload values
export const FMF_UNSUPPORTED_DEVICE_REASON_DESKTOP = 'Desktop'
export const FMF_UNSUPPORTED_DEVICE_REASON_GPU_TIER = 'GpuTier0'

// ─── Kreativ Lite viewer — feedback (CSAT) drawer ────────────────────────────

export const CSAT_KREATIV_LITE_STORAGE_KEY = 'KreativLiteMobileFeedbackForm'
export const MP_KREATIV_LITE_CSAT_SHOWN = 'KreativLiteMobile.CsatSurvey'
export const MP_KREATIV_LITE_CSAT_SUBMIT = 'KreativLiteMobile.CsatSurvey.Submit'
export const MP_KREATIV_LITE_CSAT_WRITTEN_SUBMIT = 'KreativLiteMobile.CsatSurvey.WrittenFeedback.Submit'
export const MP_KREATIV_LITE_CSAT_DISMISS = 'KreativLiteMobile.CsatSurvey.Dismiss'
export const MP_KREATIV_LITE_CSAT_WRITTEN_DISMISS = 'KreativLiteMobile.CsatSurvey.WrittenFeedback.Dismiss'
