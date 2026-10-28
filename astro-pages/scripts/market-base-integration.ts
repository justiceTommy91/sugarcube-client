import type { AstroIntegration } from 'astro'
import { readdir, readFile, writeFile } from 'fs/promises'
import { join, relative, dirname } from 'path'

export default function marketBaseIntegration(): AstroIntegration {
    return {
        name: 'market-base-integration',
        hooks: {
            'astro:build:done': async ({ dir, logger }) => {
                const startTime = Date.now()

                try {
                    // Note: _astro directory copying is handled by merge script, not here
                    // All images use $PATH-PREFIX in SCSS, so no CSS url() transformation needed
                    await updateAssetPaths(dir.pathname, logger)
                    await fixAbsoluteAstroPaths(dir.pathname, logger)

                    const duration = Date.now() - startTime
                    logger.info(`✅ Post-processing completed in ${duration}ms`)
                } catch (error) {
                    logger.error(`❌ Failed: ${error instanceof Error ? error.message : String(error)}`)
                    throw error
                }
            },
        },
    }
}

async function updateAssetPaths(distDir: string, logger: any): Promise<void> {
    const htmlFiles = await findHtmlFiles(distDir)
    let updatedCount = 0

    for (const htmlPath of htmlFiles) {
        const pathParts = htmlPath.split('/home-design/')
        if (pathParts.length < 2) continue

        const homeDesignDir = pathParts[0] + '/home-design'
        const astroDir = join(homeDesignDir, '_astro')
        const htmlDir = dirname(htmlPath)
        const relativeAstroPath = relative(htmlDir, astroDir)

        let html = await readFile(htmlPath, 'utf-8')
        const originalHtml = html

        const attributesToUpdate = ['href', 'src', 'component-url', 'renderer-url']

        for (const attr of attributesToUpdate) {
            const pattern = new RegExp(`${attr}="(\\/_astro\\/[^"]+)"`, 'g')
            html = html.replace(pattern, (match, path) => {
                return `${attr}="${path.replace(/^\/_astro\//, `${relativeAstroPath}/`)}"`
            })
        }

        if (html !== originalHtml) {
            await writeFile(htmlPath, html, 'utf-8')
            updatedCount++
        }
    }

    logger.info(`   Updated paths in ${updatedCount} HTML file(s)`)
}

/**
 * Rewrite absolute "/_astro/..." paths inside JS files in the _astro directory.
 * Vite may embed absolute paths for workers, WASM, and dynamic imports.
 * Since all _astro files are siblings, "/_astro/foo.js" becomes "./foo.js".
 */
async function fixAbsoluteAstroPaths(distDir: string, logger: any): Promise<void> {
    const astroDir = join(distDir, '_astro')
    let entries
    try {
        entries = await readdir(astroDir, { withFileTypes: true })
    } catch {
        logger.info('   No _astro directory found, skipping JS path fixes')
        return
    }

    let updatedCount = 0
    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.js')) continue

        const filePath = join(astroDir, entry.name)
        let content = await readFile(filePath, 'utf-8')
        const original = content

        // Replace absolute /_astro/ references with relative ./ since all files are co-located
        // Matches patterns like: "/_astro/filename.hash.ext" or '/_astro/filename.hash.ext'
        content = content.replace(/(?<=["'])(\/_astro\/)/g, './')

        // Fix the Vite preload-helper base path resolver.
        // Vite generates: p=function(c){return"/"+c} which prepends "/" to dep paths like
        // "_astro/Foo.hash.js", producing "/_astro/Foo.hash.js" (absolute from root).
        // This breaks when served under a deep subpath (e.g. /us/en/home-design/_astro/).
        //
        // We can't just use "./" because link.href resolves relative to the *page* URL,
        // not the script's URL. For a page at /us/en/home-design/learnmore/v2/,
        // "./_astro/Foo.js" would resolve to /us/en/home-design/learnmore/v2/_astro/Foo.js (wrong).
        //
        // Instead, use import.meta.url (the preload-helper's own loaded URL) as the base.
        // Since the preload-helper lives inside _astro/, "../"+dep resolves correctly:
        //   new URL("../_astro/Foo.js", "https://host/us/en/home-design/_astro/preload-helper.js")
        //   → "https://host/us/en/home-design/_astro/Foo.js" ✓
        // This works regardless of page depth or deployment path.
        content = content.replace(
            /=function\((\w+)\)\{return"\/"\+\1\}/g,
            (_, v) => `=function(${v}){return new URL("../"+${v},import.meta.url).href}`,
        )

        if (content !== original) {
            await writeFile(filePath, content, 'utf-8')
            updatedCount++
        }
    }

    logger.info(`   Fixed absolute _astro paths in ${updatedCount} JS file(s)`)
}

async function findHtmlFiles(dir: string, files: string[] = []): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
        const fullPath = join(dir, entry.name)

        if (entry.isDirectory() && entry.name !== '_astro') {
            // Skip test directory in production builds
            if (entry.name === 'test' && process.env.GATSBY_ENV === 'production') {
                continue
            }
            await findHtmlFiles(fullPath, files)
        } else if (entry.name === 'index.html') {
            files.push(fullPath)
        }
    }

    return files
}
