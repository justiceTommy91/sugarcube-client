import { loadEnv } from 'vite'

/**
 * Returns Vite `define` replacements for process.env.GATSBY_* and import.meta.env.PUBLIC_*.
 * Mode is derived from NODE_ENV  and defaults to 'development'. When we run npm run dev, mode = development, and when * we run npm run build, mode = production. Vite will load .env files based on this mode (e.g. .env.development or .env.* production) and include those variables in the returned object.
 * This allows us to share environment variables between Gatsby and Astro builds, since the same components in ../src/ * can reference these variables at runtime.
 */
export const getSharedEnvDefines = (rootEnvDir: string) => {
    // GATSBY_ENV determines which .env file to load (e.g. 'cte' → .env.cte).
    // Falls back to NODE_ENV (always 'production' during `npm run build`).
    const mode = process.env.GATSBY_ENV || process.env.NODE_ENV || 'development'
    const env = loadEnv(mode, rootEnvDir, '')
    const getEnv = (key: string, fallback = '') => process.env[key] ?? env[key] ?? fallback

    const resolvedEnv = {
        GATSBY_ASSET_BUCKET: getEnv('GATSBY_ASSET_BUCKET', 'https://wallspice-assets.storage2.home-design.ikea.com'),
        GATSBY_ENV_IS_PRODUCTION: getEnv('GATSBY_ENV_IS_PRODUCTION', 'false'),
        GATSBY_ENV: getEnv('GATSBY_ENV', getEnv('NODE_ENV', 'development')),
        GATSBY_ENV_MODE: getEnv('GATSBY_ENV_MODE', 'DEVELOPMENT'),
        GATSBY_SUGARCUBE_API: getEnv('GATSBY_SUGARCUBE_API', 'https://api.cte.home-design.ikea.com'),
        GATSBY_CART_API: getEnv('GATSBY_CART_API', 'https://stage.cart.caas.selling.ingka.com/api/v1'),
        GATSBY_SPIDERPIGS_FAVS_API: getEnv('GATSBY_SPIDERPIGS_FAVS_API', 'https://dev.favs.oneweb.ingkadt.com/graphql'),
        GATSBY_SPIDERPIGS_CLIENT_ID_FAVS: getEnv('GATSBY_SPIDERPIGS_CLIENT_ID_FAVS', ''),
        GATSBY_SUGARCUBE_CUSTOM_ORIGIN: getEnv('GATSBY_SUGARCUBE_CUSTOM_ORIGIN', ''),
        GATSBY_BUILD_TAG: getEnv('BUILD_TAG', getEnv('CF_PAGES_COMMIT_SHA', 'local')),
        GATSBY_RELEASE_BRANCH: getEnv('RELEASE_BRANCH', 'local'),
        NODE_ENV: getEnv('NODE_ENV', 'development'),
        PUBLIC_ASSET_BUCKET: getEnv('GATSBY_ASSET_BUCKET', 'https://wallspice-assets.storage2.home-design.ikea.com'),
        PUBLIC_IKEA_BASE_URL: getEnv('GATSBY_IKEA_BASE_URL', 'https://www.ikea.com'),
        PUBLIC_USE_CACHED_ESI: getEnv('PUBLIC_USE_CACHED_ESI', getEnv('GATSBY_LOCAL_ESI', '')),
    }

    return {
        'process.env.GATSBY_ASSET_BUCKET': JSON.stringify(resolvedEnv.GATSBY_ASSET_BUCKET),
        'process.env.GATSBY_ENV_IS_PRODUCTION': JSON.stringify(resolvedEnv.GATSBY_ENV_IS_PRODUCTION),
        'process.env.GATSBY_ENV': JSON.stringify(resolvedEnv.GATSBY_ENV),
        'process.env.GATSBY_ENV_MODE': JSON.stringify(resolvedEnv.GATSBY_ENV_MODE),
        'process.env.GATSBY_SUGARCUBE_API': JSON.stringify(resolvedEnv.GATSBY_SUGARCUBE_API),
        'process.env.GATSBY_CART_API': JSON.stringify(resolvedEnv.GATSBY_CART_API),
        'process.env.GATSBY_SPIDERPIGS_FAVS_API': JSON.stringify(resolvedEnv.GATSBY_SPIDERPIGS_FAVS_API),
        'process.env.GATSBY_SPIDERPIGS_CLIENT_ID_FAVS': JSON.stringify(resolvedEnv.GATSBY_SPIDERPIGS_CLIENT_ID_FAVS),
        'process.env.GATSBY_SUGARCUBE_CUSTOM_ORIGIN': JSON.stringify(resolvedEnv.GATSBY_SUGARCUBE_CUSTOM_ORIGIN),
        'process.env.GATSBY_BUILD_TAG': JSON.stringify(resolvedEnv.GATSBY_BUILD_TAG),
        'process.env.GATSBY_RELEASE_BRANCH': JSON.stringify(resolvedEnv.GATSBY_RELEASE_BRANCH),
        'process.env.NODE_ENV': JSON.stringify(resolvedEnv.NODE_ENV),
        'import.meta.env.PUBLIC_ASSET_BUCKET': JSON.stringify(resolvedEnv.PUBLIC_ASSET_BUCKET),
        'import.meta.env.PUBLIC_IKEA_BASE_URL': JSON.stringify(resolvedEnv.PUBLIC_IKEA_BASE_URL),
        'import.meta.env.PUBLIC_USE_CACHED_ESI': JSON.stringify(resolvedEnv.PUBLIC_USE_CACHED_ESI),
    }
}
