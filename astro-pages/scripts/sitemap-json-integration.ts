import type { AstroIntegration } from 'astro'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

/**
 * Astro integration that generates a sitemap.json file
 * Similar to the Gatsby ikea-sitemap-json plugin
 */
export default function sitemapJsonIntegration(): AstroIntegration {
    return {
        name: 'sitemap-json-integration',
        hooks: {
            'astro:build:done': async ({ dir, logger, pages }) => {
                try {
                    await generateSitemapJson(dir.pathname, pages, logger)
                } catch (error) {
                    logger.error(
                        `❌ Failed to generate sitemap.json: ${error instanceof Error ? error.message : String(error)}`,
                    )
                    throw error
                }
            },
        },
    }
}

async function generateSitemapJson(distDir: string, pages: { pathname: string }[], logger: any): Promise<void> {
    // Get market from environment (e.g., 'us/en')
    const market = process.env.PUBLIC_IKEA_MARKET || 'us/en'

    // Always use production URLs for SEO purposes (same as Gatsby)
    const siteUrl = `https://www.ikea.com`

    // Debug: log all page paths to see the structure
    const allPagePaths = pages.map((p) => p.pathname)
    logger.info(`Found ${allPagePaths.length} total pages`)
    if (allPagePaths.length > 0) {
        logger.info(`Sample pages: ${allPagePaths.slice(0, 3).join(', ')}`)
    }

    // Pages to always exclude from sitemap regardless of SEO config (e.g. entire test directories)
    const excludedPatterns = ['/test/']

    // Filter to only pages for the current market and collect paths
    const marketPrefix = `${market}/home-design/`
    const marketPages = allPagePaths
        .filter((page) => page.startsWith(marketPrefix))
        .map((page) => (page.startsWith('/') ? page : `/${page}`))
        .filter((page) => !excludedPatterns.some((pattern) => page.includes(pattern)))

    // Exclude pages whose built HTML has noindex in the robots meta tag
    const astroPages: string[] = []
    for (const page of marketPages) {
        const htmlPath = join(distDir, page, 'index.html')
        try {
            const html = await readFile(htmlPath, 'utf-8')
            if (/<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) {
                logger.info(`Excluding noindex page from sitemap: ${page}`)
                continue
            }
        } catch {
            // If the HTML file can't be read, skip the page to be safe
            logger.warn(`Could not read HTML for page ${page}, excluding from sitemap`)
            continue
        }
        astroPages.push(page)
    }

    // Generate full URLs
    const resources = astroPages.map((path) => `${siteUrl}${path}`)

    const sitemapData = {
        updatedAt: new Date().toISOString(),
        resources: resources.sort(),
    }

    // Write astro-sitemap.json to the dist directory (will be merged with Gatsby's sitemap.json later)
    const outPath = join(distDir, 'astro-sitemap.json')
    await writeFile(outPath, JSON.stringify(sitemapData, null, 2))

    logger.info(
        `✅ Astro sitemap JSON written to astro-sitemap.json with ${resources.length} URLs (filtered for ${market})`,
    )
}
