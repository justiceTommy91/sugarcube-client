import path from 'path'
import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'
import prefixWrap from 'postcss-prefixwrap'

import type { GatsbyConfig } from 'gatsby'
import { createProxyMiddleware } from 'http-proxy-middleware'

// Set up environment variables.
process.env.GATSBY_ENV = process.env.GATSBY_ENV || 'development'

const env = dotenv.config({ path: `.env.${process.env.GATSBY_ENV}` })
dotenvExpand.expand(env)

process.env.GATSBY_BUILD_TAG = process.env.BUILD_TAG || process.env.CF_PAGES_COMMIT_SHA || 'local'
process.env.GATSBY_RELEASE_BRANCH = process.env.RELEASE_BRANCH || 'local'
process.env.GATSBY_CDN_BUCKET = process.env.CDN_BUCKET
    ? `//storage.googleapis.com/${process.env.CDN_BUCKET}/${process.env.GATSBY_BUILD_TAG}`
    : ''

const gatsbyRequiredRules = path.join(process.cwd(), 'node_modules', 'gatsby', 'dist', 'utils', 'eslint-rules')

export const pathPrefix = `/${process.env.GATSBY_IKEA_MARKET}/home-design`

const plugins: any = [
    {
        resolve: 'gatsby-plugin-sass',
        options: {
            additionalData: `$PATH-PREFIX: '${process.env.PREFIX_PATHS ? pathPrefix : ''}';`,
            postCssPlugins: [
                prefixWrap('#___gatsby', {
                    ignoredSelectors: ['body.prevent-scroll-y'],
                }),
            ],
        },
    },
    'gatsby-plugin-root-import',
    {
        resolve: 'gatsby-plugin-eslint',
        options: {
            rulePaths: [gatsbyRequiredRules],
            extensions: ['js', 'jsx', 'ts', 'tsx'],
            exclude: ['node_modules'],
        },
    },
    'typescript-checker',
    {
        resolve: 'gatsby-source-filesystem',
        options: {
            path: `${__dirname}/locales`,
            name: 'locale',
        },
    },
    {
        resolve: `gatsby-source-filesystem`,
        options: {
            path: `${__dirname}/campaigns`,
            name: `campaigns`,
        },
    },
    {
        resolve: `gatsby-transformer-json`,
        options: {
            typeName: ({ node }: { node: { sourceInstanceName: string } }): string | null => {
                return node.sourceInstanceName === 'campaigns' ? 'CampaignsJson' : null
            },
        },
    },
    {
        resolve: 'gatsby-plugin-react-i18next',
        options: {
            defaultLanguage: process.env.GATSBY_LOCALE,
            languages: [process.env.GATSBY_LOCALE],
            redirect: false,
            i18nextOptions: {
                debug: false,
                interpolation: {
                    escapeValue: false, // not needed for react as it escapes by default
                },
                lowerCaseLng: false,
                ns: ['translation', 'common', 'dashboard', 'learnmore'],

                // Also update i18next.d.ts
                returnNull: false,
                allowObjectInHTMLChildren: true,
            },
            pages: [
                {
                    matchPath: '/',
                    languages: [process.env.GATSBY_LOCALE],
                },
            ],
        },
    },
    'ikea-esi',
    `gatsby-transformer-json`,
    {
        resolve: `gatsby-source-filesystem`,
        options: {
            path: `./data/`,
        },
    },
    {
        resolve: 'html-attributes',
        options: { lang: process.env.GATSBY_LOCALE },
    },
    'gatsby-plugin-react-helmet',
    'gatsby-plugin-image',
    'gatsby-plugin-sharp',
    'gatsby-source-ikea-stores',
    'ikea-sitemap-json',
]

if (process.env.ENABLE_BLOG_BUILD === 'true' && process.env.GATSBY_LOCALE === 'en-US') {
    plugins.push({
        resolve: `gatsby-source-wordpress`,
        options: {
            url: `https://kreativcontent.wpengine.com/graphql`,
            html: {
                useGatsbyImage: process.env.USE_GATSBY_IMAGE === `true`,
                createStaticFiles: process.env.USE_GATSBY_IMAGE === `true`,
            },
        },
    })
}

const config: GatsbyConfig = {
    siteMetadata: {
        siteUrl: `https://www.ikea.com/${process.env.GATSBY_IKEA_MARKET}/home-design/`,
        title: 'Home design for inspired living spaces - IKEA Kreativ',
        description:
            'Get ideas in showrooms, design in your space, and plan a room. It’s a fun, easy way to shop furniture, storage, home office and more. Try IKEA Kreativ!',
        keywords: 'keywords etc',
    },
    // Enabled via env variable in pipeline.yml
    pathPrefix,
    developMiddleware: (app) => {
        app.use(
            `/${process.env.GATSBY_IKEA_MARKET}/ideas/sugarcube/api`,
            createProxyMiddleware({
                target: process.env.GATSBY_SUGARCUBE_API,
                changeOrigin: true,
                secure: false, // Node doesn't like our cert.
            }),
        )
    },
    // More easily incorporate content into your pages through automatic TypeScript type generation and better GraphQL IntelliSense.
    // If you use VSCode you can also use the GraphQL plugin
    // Learn more at: https://gatsby.dev/graphql-typegen
    graphqlTypegen: {
        generateOnBuild: process.env.GRAPHQL_GENERATE_ON_BUILD === `true`,
    },
    plugins,
}

export default config
