/* eslint-disable react/prop-types */
import React from 'react'
import { HeadFC, graphql } from 'gatsby'

import { DashboardPage } from 'pages/dashboard'
import PageMetadata from 'components/PageMetadata'

interface LocaleNode {
    ns: string
    data: string
    language: string
}

interface IndexPageData {
    site: {
        siteMetadata: {
            siteUrl: string
        }
    }
    locales: {
        edges: Array<{ node: LocaleNode }>
    }
    blogEntries: {
        edges: Queries.BlogEntriesEdge[]
    }
}

export const query = graphql`
    query ($language: String!) {
        locales: allLocale(filter: { language: { eq: $language } }) {
            edges {
                node {
                    ns
                    data
                    language
                }
            }
        }
        blogEntries: allBlogEntries(filter: { featuredImage: { ne: null } }) {
            edges {
                node {
                    id
                    title
                    slug
                    featuredImage
                    uri
                }
            }
        }
        site {
            siteMetadata {
                siteUrl
            }
        }
    }
`

export const Head: HeadFC<IndexPageData> = ({ data }) => {
    const siteUrl = data.site.siteMetadata.siteUrl.replace(/\/$/, '')
    const ogImage = `${siteUrl}/images/graphics/dashboard/dashboard-og.jpg`

    const translationNode = data.locales.edges.find((edge) => edge.node.ns === 'translation')?.node
    const translations = translationNode ? JSON.parse(translationNode.data) : null
    const seo = translations?.siteMetaData?.dashboard
    const title = seo?.title2
    const description = seo?.description2

    return (
        <>
            <PageMetadata page="Dashboard" />
            <meta property="og:url" content={`${siteUrl}/`} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:type" content="website" />
        </>
    )
}

export default DashboardPage
