// ESI utilities for Astro pages
// Based on plugins/ikea-esi/utils.ts from Gatsby app

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export const esiEnabled = () => {
    // In production (CTE/Prod), ESI tags are processed by the CDN
    // When PUBLIC_USE_CACHED_ESI=true, pre-fetched HTML replaces ESI tags (local dev, Cloudflare)
    return import.meta.env.PUBLIC_USE_CACHED_ESI !== 'true'
}

export const getEsiHeaderFooterPath = (market: string, path: string = '') => {
    // Get base URL from environment
    const host = import.meta.env.PUBLIC_IKEA_BASE_URL || 'https://www.ikea.com'

    return `${host}/${market}/header-footer/${path}`
}

export const getEsiProductPath = (market: string, path: string = '') => {
    const host = import.meta.env.PUBLIC_IKEA_BASE_URL || 'https://www.ikea.com'

    return `${host}/${market}/products/${path}`
}

export const readCachedEsiFragment = (url: string): string => {
    // Extract filename from URL
    const urlParsed = new URL(url)
    const pathParts = urlParsed.pathname.split('/')
    const country = pathParts[1] || ''
    const language = pathParts[2] || ''
    const filename = pathParts[4] || ''
    const cachePath = join(process.cwd(), '.cache', 'ikea-esi', `${country}-${language}-${filename}`)

    if (existsSync(cachePath)) {
        return readFileSync(cachePath, 'utf-8')
    }

    const usEnCachePath = join(process.cwd(), '.cache', 'ikea-esi', `us-en-${filename}`)
    if (existsSync(usEnCachePath)) {
        return readFileSync(usEnCachePath, 'utf-8')
    }

    // Return empty string if cache doesn't exist
    console.warn(`ESI fragment cache not found: ${cachePath} or ${usEnCachePath}`)
    console.warn('Run: npm run fetch-esi-fragments')
    return ''
}

export const generateEsiInclude = (url: string) => {
    // If ESI is enabled (production), return ESI include tag
    if (esiEnabled()) {
        return `<esi:include src="${url}"/>`
    }

    // If ESI is disabled (local dev), return cached HTML content
    return readCachedEsiFragment(url)
}

export const getMarketFromParams = (country: string, lang: string) => {
    return `${country}/${lang}`
}
