import { writeFile } from 'fs/promises'
import type { GatsbyNode } from 'gatsby'

const is_us_market = process.env.GATSBY_IKEA_MARKET === 'us/en'

interface Query {
    site: {
        siteMetadata: {
            siteUrl: string
        }
    }
    allSitePage: {
        nodes: {
            path: string
        }[]
    }
    allCampaignsJson: {
        nodes: { slug: string }[]
    }
}

export const onPostBuild: GatsbyNode[`onPostBuild`] = async ({ graphql, reporter, basePath, pathPrefix }) => {
    const { data, errors } = await graphql<Query>(`
        query IkeaSitemapJsonOnPostBuild {
            site {
                siteMetadata {
                    siteUrl
                }
            }

            allSitePage {
                nodes {
                    path
                }
            }
            allCampaignsJson {
                nodes {
                    slug
                }
            }
        }
    `)

    if (!data) {
        reporter.panic(`Unable to fetch data for sitemap JSON: ${errors}`)
        return // panic() does not return but for TypeScript just include this.
    }

    const staticPages = new Set<string>(['/', '/learnmore/'])

    const campaignPages = is_us_market
        ? data.allSitePage.nodes
              // TODO it would be good if this was more flexible or adaptive to future content.
              .map((n) => n.path)
              .filter((path) => {
                  const slug = path.replace(/^\/|\/$/g, '')
                  return data.allCampaignsJson.nodes.some((c) => c.slug === slug)
              })
        : []

    const allPaths = new Set([...staticPages, ...campaignPages])
    const resources = Array.from(allPaths).map((p) => `${data.site.siteMetadata.siteUrl}${p}`)

    const sitemapData = {
        updatedAt: new Date().toISOString(),
        resources,
    }
    const outPath = `public/sitemap.json`
    await writeFile(outPath, JSON.stringify(sitemapData))
    reporter.success(`Sitemap JSON written to ${outPath}`)
}
