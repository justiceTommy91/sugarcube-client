#!/usr/bin/env tsx
/**
 * Fetch ESI fragments from IKEA.com for local development
 * This script downloads header/footer fragments and caches them locally
 * so they can be used when ESI is disabled (PUBLIC_USE_CACHED_ESI=true)
 */

import fs from 'fs'
import path from 'path'
import axios from 'axios'

// Cache directory
const CACHE_DIR = path.join(process.cwd(), '.cache', 'ikea-esi')

// Base URL from environment or default
// PUBLIC_IKEA_BASE_URL is set by CI (export) before running this script.
// Fall back to GATSBY_IKEA_BASE_URL which is defined in .env.cte / .env.production / etc.
const IKEA_BASE_URL = process.env.PUBLIC_IKEA_BASE_URL || process.env.GATSBY_IKEA_BASE_URL || 'https://www.ikea.com'
// PUBLIC_IKEA_MARKET is exported per-market in the CI loop before each invocation.
// Do NOT fall back to GATSBY_IKEA_MARKET: Gatsby builds one market at a time,
// but Astro builds all markets, so that value would be stale/wrong.
const IKEA_MARKET = process.env.PUBLIC_IKEA_MARKET || 'us/en'

// Fragments to fetch
const FRAGMENTS = [
    'header-collapsed-fragment-recursive.html',
    'footer-fragment-recursive.html',
    'style-fragment-recursive.html',
    'script-fragment-recursive.html',
]

const PRODUCT_FRAGMENTS = ['price-package-styles.html', 'price-package-scripts.html']

async function fetchFragment(url: string): Promise<string> {
    console.log(`Fetching ${url}...`)
    try {
        const response = await axios.get(url, {
            params: {
                ikexp_override: 'berlioz',
            },
        })
        return response.data
    } catch (error) {
        console.error(`Failed to fetch ${url}:`, error)
        return ''
    }
}

async function expandHIncludes(data: string): Promise<string> {
    const match = data.match(/<h-include(?:-lazy)? src="([^"]+)"><\/h-include(?:-lazy)?>/)

    // No includes found
    if (!match) {
        return data
    }

    console.log(`  Resolving h-include: ${match[1]}`)
    try {
        const response = await axios.get(match[1])
        const newData = data.replace(match[0], response.data || '')
        // Recursively expand any nested includes
        return await expandHIncludes(newData)
    } catch (error) {
        console.error(`Failed to expand h-include ${match[1]}:`, error)
        return data
    }
}

async function cacheFragment(filename: string, isProduct: boolean = false) {
    const baseUrl = isProduct
        ? `${IKEA_BASE_URL}/${IKEA_MARKET}/products/${filename}`
        : `${IKEA_BASE_URL}/${IKEA_MARKET}/header-footer/${filename}`

    const cachePath = path.join(CACHE_DIR, `${IKEA_MARKET.replace('/', '-')}-${filename}`)

    // Fetch the fragment
    let content = await fetchFragment(baseUrl)

    // Expand any h-includes
    content = await expandHIncludes(content)

    // Save to cache
    fs.mkdirSync(path.dirname(cachePath), { recursive: true })
    fs.writeFileSync(cachePath, content, 'utf-8')

    console.log(`✓ Cached to ${cachePath}`)
}

async function main() {
    console.log(`Fetching ESI fragments for ${IKEA_MARKET}...`)
    console.log(`Base URL: ${IKEA_BASE_URL}\n`)

    // Fetch header/footer fragments
    for (const fragment of FRAGMENTS) {
        await cacheFragment(fragment, false)
    }

    // Fetch product fragments
    for (const fragment of PRODUCT_FRAGMENTS) {
        await cacheFragment(fragment, true)
    }

    console.log('\n✅ All fragments cached successfully!')
}

main().catch((error) => {
    console.error('Error fetching fragments:', error)
    process.exit(1)
})
