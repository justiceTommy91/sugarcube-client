import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import path from 'path'
import { fileURLToPath } from 'url'
import marketBaseIntegration from './scripts/market-base-integration.ts'
import sitemapJsonIntegration from './scripts/sitemap-json-integration.ts'
import { wasmPlugin } from './plugins/wasm-plugin.js'
import { astroDir, envDefines, astroAliases } from './scripts/shared-vite-config.ts'

// Polyfill Promise.withResolvers (ES2024) for Node < 22.
// Required because src/services/experiments/providers/ikea.ts calls it at module scope.
if (typeof Promise.withResolvers !== 'function') {
    Promise.withResolvers = function () {
        let resolve, reject
        const promise = new Promise((res, rej) => {
            resolve = res
            reject = rej
        })
        return { promise, resolve, reject }
    }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(astroDir, '..')
const rootNodeModules = path.resolve(astroDir, '../node_modules')
const astroNodeModules = path.resolve(astroDir, 'node_modules')

export default defineConfig({
    integrations: [react(), marketBaseIntegration(), sitemapJsonIntegration()],
    output: 'static',
    build: {
        inlineStylesheets: 'auto',
    },

    vite: {
        envDir: rootDir,
        plugins: [wasmPlugin()],
        define: envDefines,
        ssr: {
            noExternal: ['@ingka/**'],
            external: ['react', 'react-dom'],
        },
        build: {
            sourcemap: true,
            chunkSizeWarningLimit: 1000,
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        // Vendor libraries — split for independent caching
                        if (id.includes('node_modules/three/')) return 'vendor-three'
                        // Renderer engine
                        if (id.includes('/src/Renderer/')) return 'renderer'
                    },
                },
            },
        },
        css: {
            preprocessorOptions: {
                scss: {
                    // Dev: empty prefix (absolute /images/)
                    // Prod: ../ relative (CSS in /_astro/, images in /images/)
                    additionalData: `$PATH-PREFIX: '${import.meta.env.DEV ? '' : '../'}';`,
                    includePaths: [rootNodeModules, astroNodeModules],
                    silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin'],
                },
            },
        },
        esbuild: {
            jsx: 'automatic',
        },
        optimizeDeps: {
            include: ['react', 'react-dom', 'react-i18next', 'i18next', 'react-copy-to-clipboard'],
            exclude: ['@geomagical/sugarcube-rendering-shared', '@geomagical/sugarcube-shared'],
            esbuildOptions: {
                loader: { '.js': 'jsx' },
            },
        },
        assetsInclude: ['**/*.wasm'],
        server: {
            // Allow Vite dev server to serve files from parent directory (shared Gatsby src/, locales/, static/)
            // For example, it's needed for WASM files.
            fs: { allow: ['..'] },
            // Proxy API calls to avoid CORS on localhost (mirrors Gatsby's developMiddleware)
            proxy: (() => {
                const apiTarget = process.env.GATSBY_SUGARCUBE_API ?? 'https://api.cte.home-design.ikea.com'
                const apiBase = `/${process.env.GATSBY_IKEA_MARKET ?? 'us/en'}/ideas/sugarcube/api`
                return {
                    // Logout endpoint: the backend (legacy=True) redirects to LOGOUT_REDIRECT_URL
                    // which is a relative URL that resolves to localhost — unusable in the browser.
                    // Intercept the redirect, forward the Set-Cookie headers to clear the Django
                    // session, and return a plain 200 so the caller controls the next navigation.
                    [`${apiBase}/auth/logout`]: {
                        target: apiTarget,
                        changeOrigin: true,
                        secure: false,
                        configure: (proxy) => {
                            proxy.on('proxyRes', (proxyRes, _req, res) => {
                                if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400) {
                                    const setCookie = proxyRes.headers['set-cookie']
                                    const headers = { 'content-type': 'application/json' }
                                    if (setCookie) headers['set-cookie'] = setCookie
                                    res.writeHead(200, headers)
                                    res.end(JSON.stringify({ ok: true }))
                                    proxyRes.resume()
                                }
                            })
                        },
                    },
                    // General API proxy — must come after the more specific logout rule
                    [apiBase]: {
                        target: apiTarget,
                        changeOrigin: true,
                        secure: false,
                        // Rewrite Set-Cookie domain/secure flags so the browser accepts
                        // them on non-HTTPS local origins (192.168.x.x, localhost).
                        cookieDomainRewrite: { '*': '' },
                        configure: (proxy) => {
                            proxy.on('proxyRes', (proxyRes) => {
                                const cookies = proxyRes.headers['set-cookie']
                                if (cookies) {
                                    proxyRes.headers['set-cookie'] = cookies.map((c) =>
                                        c.replace(/;\s*Secure/gi, '').replace(/;\s*SameSite=None/gi, '; SameSite=Lax'),
                                    )
                                }
                            })
                        },
                    },
                }
            })(),
        },
        resolve: {
            dedupe: ['react', 'react-dom', 'react-i18next', 'i18next'],
            alias: {
                // Import the devtools component directly, bypassing the NODE_ENV gate in
                // the package's index.js (which returns null when NODE_ENV !== 'development').
                // Visibility is still controlled by the !isProd condition in AppProviders.
                '@tanstack/react-query-devtools': path.resolve(
                    __dirname,
                    'node_modules/@tanstack/react-query-devtools/build/modern/ReactQueryDevtools.js',
                ),
                // Gatsby compat shims, local Astro paths, and shared Gatsby src aliases
                ...astroAliases,
            },
        },
    },
})
