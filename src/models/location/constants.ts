import { LocaleToRegion, Split } from 'utils/string'

export const LOCALE_US_EN = 'us/en'
export const LOCALE_US_ES = 'us/es'
export const LOCALE_CA_EN = 'ca/en'
export const LOCALE_CA_FR = 'ca/fr'
export const LOCALE_KR_EN = 'kr/en'
export const LOCALE_KR_KO = 'kr/ko'
export const LOCALE_JP_JA = 'jp/ja'
export const LOCALE_JP_EN = 'jp/en'
export const LOCALE_GB_EN = 'gb/en'
export const LOCALE_IE_EN = 'ie/en'
export const LOCALE_ES_ES = 'es/es'
export const LOCALE_ES_CA = 'es/ca'
export const LOCALE_ES_EU = 'es/eu'
export const LOCALE_ES_GL = 'es/gl'
export const LOCALE_ES_EN = 'es/en'
export const LOCALE_DE_DE = 'de/de'
export const LOCALE_DE_EN = 'de/en'
export const LOCALE_FR_FR = 'fr/fr'
export const LOCALE_NL_NL = 'nl/nl'
export const LOCALE_NL_EN = 'nl/en'
export const LOCALE_SE_SV = 'se/sv'
export const LOCALE_PL_PL = 'pl/pl'
export const LOCALE_CH_EN = 'ch/en'
export const LOCALE_CH_DE = 'ch/de'
export const LOCALE_CH_FR = 'ch/fr'
export const LOCALE_CH_IT = 'ch/it'
export const LOCALE_IT_IT = 'it/it'
export const LOCALE_AT_EN = 'at/en'
export const LOCALE_AT_DE = 'at/de'
export const LOCALE_AU_EN = 'au/en'
export const LOCALE_SE_EN = 'se/en'
export const LOCALE_BE_EN = 'be/en'
export const LOCALE_BE_FR = 'be/fr'
export const LOCALE_BE_NL = 'be/nl'
export const LOCALE_DK_DA = 'dk/da'
export const LOCALE_NO_NO = 'no/no'
export const LOCALE_FI_FI = 'fi/fi'
export const LOCALE_FI_SV = 'fi/sv'
export const LOCALE_FI_EN = 'fi/en'
export const LOCALE_PT_EN = 'pt/en'
export const LOCALE_PT_PT = 'pt/pt'
export const LOCALE_CZ_CS = 'cz/cs'
export const LOCALE_CZ_EN = 'cz/en'
export const LOCALE_HU_HU = 'hu/hu'
export const LOCALE_SK_SK = 'sk/sk'
export const LOCALE_RO_RO = 'ro/ro'
export const LOCALE_HR_HR = 'hr/hr'
export const LOCALE_SI_SL = 'si/sl'
export const LOCALE_RS_SR = 'rs/sr'
export const LOCALE_IN_EN = 'in/en'
export const LOCALE_GEO = 'geo'

export const LOCALES_USING_IMPERIAL_SYSTEM = [
    LOCALE_US_EN,
    LOCALE_GEO,
    LOCALE_CA_EN,
    LOCALE_CA_FR,
    LOCALE_IN_EN,
    LOCALE_SK_SK,
]

export const DEFAULT_LOCALE = 'en'

// TODO Locale: Add any new locales here
export const ALLOWED_LOCALES = [
    'en',
    'en-US',
    'en-NL',
    'nl-NL',
    'en-CA',
    'fr-CA',
    'en-GB',
    'en-IE',
    'es-ES',
    'en-ES',
    'gl-ES',
    'eu-ES',
    'ca-ES',
    'de-DE',
    'fr-FR',
    'sv-SE',
    'en-JP',
    'ja-JP',
    'en-KR',
    'ko-KR',
    'pl-PL',
    'en-CH',
    'it-CH',
    'de-CH',
    'fr-CH',
    'en-AT',
    'de-AT',
    'it-IT',
    'en-AU',
    'en-SE',
    'en-BE',
    'fr-BE',
    'nl-BE',
    'da-DK',
    'fi-FI',
    'no-NO',
    'en-PT',
    'pt-PT',
    'cs-CZ',
    'en-CZ',
    'hu-HU',
    'sk-SK',
    'ro-RO',
    'hr-HR',
    'sl-SI',
    'sr-RS',
    'sv-FI',
    'en-FI',
    'en-IN',
    'es-US',
    'en-DE',
    'en-FR',
    'en-NO',
    'en-NZ',
] as const

export type AllowedLocaleType = (typeof ALLOWED_LOCALES)[number]
export type AllowedCountries = Lowercase<Exclude<Split<AllowedLocaleType, '-'>[1], undefined>>
export type AllowedRegion = LocaleToRegion<AllowedLocaleType>

// TODO Locale: If App Store or Play Store does not have locale badge, add to this list
export const NO_BADGE_LOCALES = ['hr', 'sl', 'sr']

export const DEFAULT_LANGUAGE_CODE = 'en'

export const PROD_HOSTNAMES = ['www.ikea.com', 'publicera.ingka.com', 'www.ppe.ikeadt.com']

// URL params
export const PARAM_SAVEONFIRSTRENDER = 'saveonfirstrender'
export const PARAM_RETURN_URL = 'returnUrl'
export const PARAM_RESUME = 'resume'
export const PARAM_ROOM_TYPE = 'roomType'
export const PARAM_FURNISHING_TYPE = 'furnishingType'
export const PARAM_APP_CONTEXT = 'appContext'
export const PARAM_LEGACY_MANIFEST = 'legacyManifest'
export const PARAM_PARTNER_ID = 'partnerId'
export const PARAM_SKIP_AUTH = 'skipAuth'
export const PARAM_MOBILE_WEB = 'allowMobileWeb'
export const PARAM_NOTIFY_ACTIVITY = 'notifyActivity'
export const PARAM_SEARCH_QUERY = 'query'
export const PARAM_SEARCH_CATEGORYID = 'categoryId'
export const PARAM_SEARCH_CATEGORY = 'category'
export const PARAM_SHOW_KEYS = 'showKeys'
export const PARAM_SUBCATALOG = 'subCatalog'
export const PARAM_FILTER_ROOMTYPE = 'filterRoomType'
export const PARAM_PRODUCT_ID = 'productId'
export const PARAM_OPEN_UPLOAD = 'openUpload'
export const PARAM_BANNER_IMAGE = 'bannerImage'
export const PARAM_PLANNER_ROOM = 'room'
export const PARAM_HOME_PROJECT_ID = 'projectId'
// Override referrer context for testing (e.g. find-my-fit on astro pages, where simulating navigation from ikea.com is not possible)
export const PARAM_REF_CATEGORY_ID = 'ref_cat_id'
export const PARAM_REF_QUERY = 'ref_query'

// hash used for scrolling
export const SHOWROOMS_HASH = 'showrooms'
export const DESIGN_NOW_HASH = 'designnow'

type Currency =
    | 'USD'
    | 'GBP'
    | 'CAD'
    | 'EUR'
    | 'JPY'
    | 'SEK'
    | 'DEK'
    | 'CZK'
    | 'KRW'
    | 'PLN'
    | 'AUD'
    | 'DKK'
    | 'RON'
    | 'RSD'
    | 'CHF'
    | 'HUF'
    | 'NOK'
    | 'INR'
    | 'NZD'
export type CurrencyTypes = Record<AllowedLocaleType, Currency>

type ApiShardRegion = 'us' | 'eu' | 'ap'

export const COUNTRY_TO_API_SHARD: Record<AllowedCountries, ApiShardRegion> = {
    us: 'us',
    ca: 'us',
    gb: 'eu',
    ie: 'eu',
    fr: 'eu',
    es: 'eu',
    de: 'eu',
    nl: 'eu',
    se: 'eu',
    pl: 'eu',
    at: 'eu',
    it: 'eu',
    ch: 'eu',
    be: 'eu',
    dk: 'eu',
    no: 'eu',
    fi: 'eu',
    pt: 'eu',
    cz: 'eu',
    hr: 'eu',
    hu: 'eu',
    ro: 'eu',
    rs: 'eu',
    si: 'eu',
    sk: 'eu',
    jp: 'ap',
    kr: 'ap',
    au: 'ap',
    in: 'ap',
    nz: 'ap',
}

// Application
export const ONBOARDING_ENABLED_REGIONS = [LOCALE_US_EN]

export const appStoreLink = `https://ingka.page.link/geomagicalgallery`

export const getComfortGuideLink = (locale: string) =>
    `https://www.ikea.com/addon-app/guida/comfort-guide/web/latest/?locale=${locale}&uiPlatform=web`

// Regions where Morpheus should be enabled at 100%, regardless of Optimizely
export const MORPHEUS_ENABLED_REGIONS: AllowedRegion[] = [
    LOCALE_US_EN,
    LOCALE_US_ES,
    LOCALE_CA_EN,
    LOCALE_CA_FR,
    LOCALE_GB_EN,
    LOCALE_IE_EN,
    LOCALE_AT_EN,
    LOCALE_AT_DE,
    LOCALE_BE_EN,
    LOCALE_BE_FR,
    LOCALE_BE_NL,
    LOCALE_CH_EN,
    LOCALE_CH_DE,
    LOCALE_CH_FR,
    LOCALE_CH_IT,
    LOCALE_CZ_CS,
    LOCALE_CZ_EN,
    LOCALE_DE_DE,
    LOCALE_DE_EN,
    LOCALE_FI_FI,
    LOCALE_FI_SV,
    LOCALE_FI_EN,
    LOCALE_HU_HU,
    LOCALE_IN_EN,
    LOCALE_NL_NL,
    LOCALE_NL_EN,
    LOCALE_NO_NO,
    LOCALE_PT_EN,
    LOCALE_PT_PT,
    LOCALE_RO_RO,
    LOCALE_RS_SR,
    LOCALE_SE_EN,
    LOCALE_SE_SV,
    LOCALE_SI_SL,
    LOCALE_SK_SK,
    LOCALE_FR_FR,
    LOCALE_HR_HR,
    LOCALE_ES_ES,
    LOCALE_ES_CA,
    LOCALE_ES_EU,
    LOCALE_ES_GL,
    LOCALE_ES_EN,
    LOCALE_PL_PL,
    LOCALE_IT_IT,
    LOCALE_KR_EN,
    LOCALE_KR_KO,
    LOCALE_JP_EN,
    LOCALE_JP_JA,
    LOCALE_DK_DA,
    LOCALE_AU_EN,
]
