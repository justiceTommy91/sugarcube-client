/// <reference path="../.astro/types.d.ts" />

// Allow JSON imports
declare module '*.json' {
    const value: any
    export default value
}

// Custom environment variables defined in astro.config.mjs
interface ImportMetaEnv {
    // Asset bucket (used in components like LearnMoreV2.tsx)
    readonly PUBLIC_ASSET_BUCKET: string

    // ESI config (used in esi-utils.ts)
    readonly PUBLIC_USE_CACHED_ESI: string
    readonly PUBLIC_IKEA_BASE_URL: string

    // Built-in Vite variables
    readonly DEV: boolean
    readonly PROD: boolean
    readonly MODE: string
    readonly BASE_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
