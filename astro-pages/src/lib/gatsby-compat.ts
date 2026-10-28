/**
 * Gatsby API compatibility layer for Astro
 *
 * Provides mock implementations of Gatsby APIs so shared components
 * that `import { withPrefix, navigate } from 'gatsby'` work in Astro.
 *
 * Both the tsconfig path alias ("gatsby" → this file) and the Vite resolve
 * alias (astro.config.mjs) point here.
 */

import { getRegion } from './url-utils'

// =============================================================================
// navigate
// =============================================================================

export function navigate(url: string): void {
    if (typeof window !== 'undefined') {
        window.location.href = url
    }
}

// =============================================================================
// withPrefix — market-aware asset path builder
// =============================================================================

/**
 * Market-aware path prefix:
 * - withPrefix(path)          — auto-detects market from URL (for shared Gatsby components)
 * - withPrefix(path, market)  — uses explicit market (for Astro components)
 *
 * Dev:  /home-design{path}
 * Prod: /{market}/home-design{path}
 */
export function withPrefix(path: string, market?: string): string {
    const marketToUse = market || getRegion()
    const isDev = import.meta.env.DEV

    if (!path) {
        return isDev ? '/home-design/' : `/${marketToUse}/home-design/`
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    if (isDev) {
        return `/home-design${normalizedPath}`
    }

    return `/${marketToUse}/home-design${normalizedPath}`
}

// =============================================================================
// GraphQL stubs (unused in Astro, needed to satisfy imports)
// =============================================================================

export function useStaticQuery(_query: any): any {
    console.warn('useStaticQuery called but not implemented in Astro')
    return {}
}

export function graphql(strings: TemplateStringsArray, ...values: any[]): string {
    return strings.join('')
}
