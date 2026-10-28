import fs from 'fs'
import path from 'path'

import { type GatsbyNode } from 'gatsby'
import webpack from 'gatsby/webpack'
import { parse } from 'node-html-parser'
import { execSync } from 'child_process'

const is_us_market = process.env.GATSBY_IKEA_MARKET === 'us/en'
const build_blog = process.env.ENABLE_BLOG_BUILD === 'true' && process.env.GATSBY_LOCALE === 'en-US'
const campaignEnv = process.env.GATSBY_ENV_MODE === 'PRODUCTION' ? 'prod' : 'dev'

export type CreatePagesQuery = {
    googleVerificationsJson: {
        value: string
    }
    allWpPost: {
        nodes: Queries.WpPost[]
    }
    allCampaignsJson: {
        nodes: (Queries.CampaignsJson & { allowedLocales: string[] })[]
    }
    site: Queries.Site
}

const buildGraphQLQuery = (
    baseQuery: string,
    conditions: {
        include: boolean
        queryPart: string
    }[],
): string => {
    const queryParts: string[] = []

    conditions.forEach(({ include, queryPart }) => {
        if (include) {
            queryParts.push(queryPart)
        }
    })

    return `
    ${baseQuery} {
      ${queryParts.join('\n')}
    }
  `
}

// Load translation file for a given locale
const loadTranslations = (locale: string) => {
    try {
        const translationPath = path.resolve(__dirname, `./locales/${locale}/campaigns.json`)
        const translations = JSON.parse(fs.readFileSync(translationPath, 'utf8'))
        return translations
    } catch (error) {
        console.warn(`Failed to load translations for locale: ${locale}`)
        return {}
    }
}

// Translate a nested key into its corresponding value
const translate = (key: string | undefined | null, translations: Record<string, unknown>) => {
    const keys = key ? key.split('.') : []
    let value = translations

    for (const k of keys) {
        value = value?.[k as keyof typeof value] as Record<string, unknown>
        if (!value) return key
    }

    return value
}

// This function allows us to set ignoreOrder on mini-css-extract-plugin
// https://github.com/gatsbyjs/gatsby/discussions/30169
export const onCreateWebpackConfig: GatsbyNode['onCreateWebpackConfig'] = ({ stage, actions, getConfig, plugins }) => {
    const config = getConfig()
    const miniCssExtractPluginIndex = config.plugins.findIndex(
        (plugin: any) => plugin.constructor.name === 'MiniCssExtractPlugin',
    )

    const CopyWebpackPlugin = require('copy-webpack-plugin')
    config.plugins = [
        ...config.plugins,
        new CopyWebpackPlugin({
            patterns: [
                { from: 'node_modules/@geomagical/sugarcube-shared/dist/kreativ-core-sdk.wasm', to: 'wasm' },
                {
                    from: 'node_modules/@geomagical/sugarcube-rendering-shared/dist/release/decorate-engine.wasm',
                    to: '',
                },
                {
                    from: 'node_modules/detect-gpu/dist/benchmarks',
                    to: 'benchmarks',
                },
            ],
        }),
    ]

    if (miniCssExtractPluginIndex > -1) {
        // remove miniCssExtractPlugin from plugins list
        config.plugins.splice(miniCssExtractPluginIndex, 1)

        // re-add mini-css-extract-plugin
        if (stage === 'build-javascript') {
            config.plugins.push(
                plugins.extractText({
                    filename: `[name].[contenthash].css`,
                    chunkFilename: `[name].[contenthash].css`,
                    ignoreOrder: true,
                }),
            )
        } else {
            config.plugins.push(
                plugins.extractText({
                    filename: `[name].css`,
                    chunkFilename: `[id].css`,
                    ignoreOrder: true,
                }),
            )
        }
    }

    if (config.optimization.splitChunks.cacheGroups.commons) {
        // Web workers can't import chunks because of unknown behavior in IKEA
        // scripts.
        // This is a workaround to prevent files imported by graphics web workers
        // from splitting.
        config.optimization.splitChunks.cacheGroups.commons = false
    }

    // gatsby-plugin-react-i18next ships CJS in dist/ but webpack 5 misclassifies
    // it as ESM, dropping the `exports` parameter from the module factory and
    // throwing "exports is not defined" at runtime. Force CommonJS treatment.
    config.module.rules.push({
        test: /node_modules[\\/]gatsby-plugin-react-i18next[\\/].*\.js$/,
        type: 'javascript/dynamic',
    })

    // With the CJS treatment above, webpack parses these files as sourceType:script.
    // @pmmmwh/react-refresh-webpack-plugin injects an ESM `import` for its runtime
    // via a normalModuleFactory.afterResolve hook, which then fails to parse as
    // script. Gatsby instantiates the plugin with a custom exclude regex that
    // *includes* any node_modules package depending on gatsby — so the plugin
    // is not excluded by default. Wrap that regex's `.test` to also skip the
    // plugin's dist files. (See gatsby/dist/utils/webpack-utils.js → plugins.fastRefresh.)
    if (stage === 'develop') {
        const refreshPlugin = config.plugins.find(
            (plugin: { constructor?: { name?: string } }) =>
                plugin && plugin.constructor && plugin.constructor.name === 'ReactRefreshPlugin',
        ) as { options?: { exclude?: RegExp } } | undefined
        const excludeRegex = refreshPlugin?.options?.exclude
        if (excludeRegex && typeof excludeRegex.test === 'function') {
            const originalTest = excludeRegex.test.bind(excludeRegex)
            excludeRegex.test = (modulePath: string): boolean => {
                if (modulePath.includes('gatsby-plugin-react-i18next')) return true
                return originalTest(modulePath)
            }
        }
    }

    // Allow using local source maps in production.
    if (process.env.GATSBY_ENV === 'production' && stage === 'build-javascript') {
        config.devtool = false
        config.plugins.push(
            new webpack.SourceMapDevToolPlugin({
                append: '\n//# sourceMappingURL=http://localhost:1088/[url]',
                filename: '[file].map[query]',
            }),
        )
    }

    actions.replaceWebpackConfig(config)
}

const updateAnchorsInContent = (content: string, blogSlug: string, isBlog: boolean): string => {
    const doc = parse(content)
    const anchors = doc.querySelectorAll('a')

    const basePath = isBlog ? '../' : '../../'

    const handleHomeDesignPath = (href: string, designPath: string) => {
        const newPath = `${basePath}${href.split(designPath).pop()}`
        return newPath
    }

    anchors.forEach((anchor) => {
        const currentHref = anchor.getAttribute('href')

        if (
            currentHref?.includes(blogSlug) &&
            !currentHref.includes('wallspice-assets') &&
            !currentHref.includes('go.ikea.com')
        ) {
            const href = currentHref?.replace(`/${blogSlug}-`, '')
            const updatedHref = isBlog ? href : `../${href}`
            anchor.setAttribute('data-gatsby-href', updatedHref)
            // ACCESSIBILITY FIX: Keep href attribute for keyboard navigation (WEBFS-278)
            anchor.setAttribute('href', updatedHref)
        } else if (currentHref?.includes('home-design')) {
            const designPath = currentHref.includes('home-design/') ? 'home-design/' : 'home-design'
            const newPath = handleHomeDesignPath(currentHref, designPath)
            anchor.setAttribute('data-gatsby-href', newPath)
            // ACCESSIBILITY FIX: Keep href attribute for keyboard navigation (WEBFS-278)
            anchor.setAttribute('href', newPath)
        }
    })

    return doc.outerHTML
}

export const onCreatePage: GatsbyNode['onCreatePage'] = async ({ page, actions }) => {
    const { createPage } = actions

    // Special case the share page to have a client-side route glob.
    if (page.path === '/share/') {
        // eslint-disable-next-line no-param-reassign
        page.matchPath = '/share/:id'
        createPage(page)
    }
}
export const createPages: GatsbyNode['createPages'] = async ({
    actions: { createPage, createNode },
    createNodeId,
    createContentDigest,
    graphql,
    reporter,
}) => {
    const googleVerificationQueryPart = `
        googleVerificationsJson(market: {eq: "${process.env.GATSBY_IKEA_MARKET}"}) {
            value
        }
    `

    const wpPostsQueryPart = `
        allWpPost(filter: {tags: {nodes: {elemMatch: {name: {eq: "${process.env.GATSBY_IKEA_MARKET}"}}}}}) {
            nodes {
                slug
                uri
                title
                content
                featuredImage {
                    node {
                        sourceUrl
                    }
                }
                categories {
                    nodes {
                        databaseId
                    }
                }
            }
        }
    `

    const campaignsQueryPart = `
        allCampaignsJson(
            filter: { env: { eq: "${campaignEnv}" } }
        ) {
            nodes {
                slug
                uuidMap
                allowedLocales
                defaultLocale
                sections {
                    type
                }
                seo {
                    title
                    description
                    keywords
                    ogImagePath
                 }
            }
        }

        site {
            siteMetadata {
                siteUrl
            }
        }
    `

    const queryConditions = [
        {
            include: true,
            queryPart: googleVerificationQueryPart,
        },
        {
            include: build_blog,
            queryPart: wpPostsQueryPart,
        },
        {
            include: true,
            queryPart: campaignsQueryPart,
        },
    ]

    const query = buildGraphQLQuery('query GatsbyNodeCreatePages', queryConditions)

    const { data } = await graphql<CreatePagesQuery>(query)

    if (data?.googleVerificationsJson) {
        // Write the value to a file.
        try {
            await fs.promises.access('public')
        } catch (error) {
            // Just in case.
            await fs.promises.mkdir('public')
        }
        await fs.promises.writeFile(
            `public/${data.googleVerificationsJson.value}.html`,
            `google-site-verification: ${data.googleVerificationsJson.value}.html`,
        )
    }

    data?.allCampaignsJson?.nodes.forEach(({ slug, seo, allowedLocales }) => {
        if (!allowedLocales?.includes(process.env.GATSBY_LOCALE)) {
            return
        }

        const translations = loadTranslations(process.env.GATSBY_LOCALE)

        // Translate SEO fields at build time
        const translatedSeo = {
            title: translate(seo?.title, translations),
            description: translate(seo?.description, translations),
            keywords: translate(seo?.keywords, translations),
            ogImagePath: seo?.ogImagePath,
        }

        reporter.info(
            `[createPage]: campaignsJson "${slug}" - (env=${campaignEnv}) - (market=${process.env.GATSBY_IKEA_MARKET}) - (allowedLocales=${allowedLocales})`,
        )
        createPage({
            path: `/${slug}/`,
            component: path.resolve(`./src/templates/CampaignPage.tsx`),
            context: {
                slug,
                env: campaignEnv,
                seo: translatedSeo,
                siteMetadata: data?.site?.siteMetadata,
                locale: process.env.GATSBY_LOCALE,
            },
        })
    })

    if (build_blog) {
        const blogPost = data?.allWpPost?.nodes?.find((post) => post.slug === 'blog')

        data?.allWpPost?.nodes?.forEach((post) => {
            if (!post.slug) {
                // Skip anything with no slug.
                // TODO also skip things that would overlap real pages?
                return
            }
            const postPath =
                post.slug === blogPost?.slug
                    ? post.slug
                    : `${blogPost?.slug}/${post.slug.replace(`${blogPost?.slug}-`, '')}`

            const processedContent = updateAnchorsInContent(
                post?.content || '',
                blogPost?.slug || '',
                post.slug === blogPost?.slug,
            )

            if (is_us_market) {
                createNode({
                    ...post,
                    uri: postPath,
                    featuredImage: post?.featuredImage?.node?.sourceUrl,
                    id: createNodeId(`blog-entry-${post.slug}`),
                    categories: post.categories?.nodes?.map((category) => category?.databaseId),
                    parent: null,
                    children: [],
                    internal: {
                        type: 'BlogEntries',
                        contentDigest: createContentDigest(post),
                    },
                })
            }

            createPage({
                path: postPath,
                component: path.resolve(`./src/templates/WordpressPost.tsx`),
                context: {
                    slug: post.slug,
                    blogPost,
                    processedContent,
                },
            })
        })
    }
}

export const createSchemaCustomization: GatsbyNode[`createSchemaCustomization`] = ({ actions }) => {
    const { createTypes } = actions

    // Dummy type to the WordpressPost template not crash on typescript check
    if (!build_blog) {
        createTypes(`
            type WpPost implements Node {
                slug: String
                title: String
                content: String
                featuredImage: WpPostFeaturedImage
                categories: WpPostCategories
            }

            type WpPostCategories {
                nodes: [WpPostCategory]
            }

            type WpPostCategory { 
                databaseId: [Int]
            }

            type WpPostFeaturedImage {
                node: WpPostFeaturedImageNode
            }

            type WpPostFeaturedImageNode {
                sourceUrl: String
            }
            
        `)
    }

    // Dummy type to the WordpressPost blog entry not crash on typescript check
    createTypes(`
        type BlogEntries implements Node {
            id: ID!
            title: String
            slug: String
            content: String
            featuredImage: String
            uri: String
            categories: [Int]
        }
    `)

    createTypes(`
        extend type CampaignsJson implements Node {
            uuidMap: JSON
            allowedLocales: JSON
            defaultLocale: String
        }

        extend type CampaignsJsonSections {
            tracking: JSON
        }

        extend type CampaignsJsonSectionsCards {
            tracking: JSON
            mobileUrl: String
        }

        extend type CampaignsJsonSectionsPosts {
            tracking: JSON
        }
    `)
}

const flattenNestedObject = (obj: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
    return (
        obj &&
        Object.keys(obj).reduce((acc: Record<string, unknown>, key: string) => {
            const newKey = prefix ? `${prefix}.${key}` : key

            if (typeof obj[key] === 'object' && obj[key] !== null) {
                Object.assign(acc, flattenNestedObject(obj[key] as Record<string, unknown>, newKey))
            } else {
                acc[newKey] = obj[key]
            }

            return acc
        }, {})
    )
}

export const createResolvers: GatsbyNode['createResolvers'] = ({ createResolvers }) => {
    const sectionTypes = [
        'productGrid',
        'cardGrid',
        'featureGrid',
        'bannerPromo',
        'tips',
        'socialCarousel',
        'brand',
        'hero',
        'appMobileButton',
    ] as const

    const fields = Object.fromEntries(
        sectionTypes.map((type) => {
            const fieldName = `${type}Section`
            return [
                fieldName,
                {
                    type: 'CampaignsJsonSections',
                    resolve(source: any) {
                        return source.sections.find((s: any) => s.type === type) || null
                    },
                },
            ]
        }),
    )

    createResolvers({
        CampaignsJson: {
            // exposing the original array so we know the order
            rawSections: {
                type: '[CampaignsJsonSections!]',
                resolve(source: any) {
                    return source.sections
                },
            },
            ...fields,
        },
    })
}

export const onPostBootstrap: GatsbyNode['onPostBootstrap'] = async ({ reporter }) => {
    try {
        execSync("npx i18next 'src/**/*.{js,jsx,ts,tsx}'", { stdio: 'inherit' })

        const loadTranslations = async (folder: string): Promise<Record<string, Record<string, unknown>>> => {
            const fileNames = await fs.promises.readdir(folder)
            const translations = await Promise.all(
                fileNames
                    .filter((fileName) => fileName.endsWith('.json'))
                    .map(async (fileName) => {
                        const namespace = path.basename(fileName, '.json')
                        const data = await fs.promises.readFile(path.join(folder, fileName), 'utf8')
                        return [namespace, JSON.parse(data)]
                    }),
            )
            return Object.fromEntries(translations)
        }

        const existingTranslations = await loadTranslations('locales/en')
        const extractedKeys = await loadTranslations('locales/parse/en')

        let missingKeys = false

        for (const namespace of Object.keys(extractedKeys)) {
            const extracted = flattenNestedObject(extractedKeys[namespace])
            const existing = flattenNestedObject(existingTranslations[namespace])

            const missing = Object.keys(extracted).filter((key) => !Object.keys(existing).includes(key))

            if (missing.length > 0) {
                reporter.warn(`Missing keys in en/${namespace}: ${JSON.stringify(missing)}`)
                missingKeys = true
            }
        }

        if (missingKeys) {
            reporter.panic('Missing Translations found! Please fix them before proceeding.')
        } else {
            reporter.info('Every translations seems to have a proper i18n key')
        }
    } catch (error) {
        reporter.panic('Translation key validation error:', {
            message: JSON.stringify(error),
            name: `Translation key validation error`,
        })
    }
}
