/* eslint-disable react/prop-types */
import React, { useEffect, useState, Suspense } from 'react'
import { HeadFC, PageProps, graphql } from 'gatsby'

import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { useExperiments } from 'hooks/useExperiments'
import PageContainer from 'containers/PageContainer'
import PageMetadata from 'components/PageMetadata'
import { MobileDashboardV2 } from 'components/dashboard/MobileDashboardV2'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'

require('./DashboardPage.scss')

const KioskLanding = React.lazy(() => import('components/KioskLanding'))
const DashboardContainer = React.lazy(() => import('containers/dashboard'))
const RenderProvider = React.lazy(() => import('apps/RendererProvider'))
const MobileDashboardV3 = React.lazy(
    () => import('components/dashboard/MobileDashboardV3/MobileDashboardV3')
)

interface LocaleNode {
    ns: string
    data: string
    language: string
}

export interface DashboardPageQuery {
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

export const DashboardPage = (props: PageProps<DashboardPageQuery>) => {
    const { isKiosk, isMobile } = useSugarcubeContext()
    const { variations } = useExperiments()
    const isSSR = typeof window === 'undefined'
    const [hasMounted, setHasMounted] = useState(false)

    useEffect(() => {
        setHasMounted(true)
    }, [])

    const shouldShowMobile = isSSR || (hasMounted && isMobile)
    const isDesktopPremount = !isMobile && !hasMounted

    if (isKiosk) {
        return (
            <PageContainer page="KioskLanding">
                <RenderProvider>
                    <KioskLanding />
                </RenderProvider>
            </PageContainer>
        )
    }

    let content
    if (isDesktopPremount) {
        content = <BouncingBallLoader />
    } else if (shouldShowMobile) {
        content =
            hasMounted && variations.KreativLite === 'enabled' && variations.KreativLiteMobile === 'enabled' ? (
                <Suspense fallback={<BouncingBallLoader />}>
                    <RenderProvider>
                        <MobileDashboardV3 />
                    </RenderProvider>
                </Suspense>
            ) : (
                <MobileDashboardV2 />
            )
    } else {
        content = (
            <Suspense fallback={<BouncingBallLoader />}>
                <RenderProvider>
                    <DashboardContainer posts={props?.data?.blogEntries?.edges} />
                </RenderProvider>
            </Suspense>
        )
    }

    return (
        <PageContainer page="Dashboard">
            <div id="DashboardPage">{content}</div>
        </PageContainer>
    )
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

export const Head: HeadFC<DashboardPageQuery> = ({ data }) => {
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
