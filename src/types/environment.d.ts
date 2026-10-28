import { AllowedRegion } from 'models/location/constants'

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            GATSBY_ASSET_BUCKET: string
            GATSBY_BUILD_TAG: string
            GATSBY_RELEASE_BRANCH: string
            GATSBY_ENV: string
            GATSBY_ENV_MODE: 'DEVELOPMENT' | 'PRODUCTION'
            GATSBY_ENV_IS_PRODUCTION: boolean
            GATSBY_SUGARCUBE_ORIGIN: string
            GATSBY_SUGARCUBE_CUSTOM_ORIGIN: string
            GATSBY_MAGICWINDOW_ORIGIN: string
            GATSBY_PARTNER_PORTAL_ORIGIN: string
            GATSBY_SUGARCUBE_API: string
            GATSBY_BEAUTIFIER_API?: string
            GATSBY_SPIDERPIGS_FAVS_API: string
            GATSBY_SPIDERPIGS_CLIENT_ID_FAVS: string
            GATSBY_ENTRA_CLIENT_ID?: string
            GATSBY_IKEA_BASE_URL: string
            GATSBY_IKEA_MARKET: AllowedRegion
            GATSBY_LOCALE: string
            GATSBY_LOCAL_ESI: boolean
            ENABLE_BLOG_BUILD: string
        }
    }
}

export {}
