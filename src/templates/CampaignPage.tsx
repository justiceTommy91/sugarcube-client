import React, { useCallback, useEffect } from 'react'
import { graphql, HeadFC, PageProps } from 'gatsby'
import * as Sections from 'components/campaigns'
import PageContainer from 'containers/PageContainer'
import RenderProvider from 'apps/RendererProvider'
import PageMetadata from 'components/PageMetadata'
import { getHash, getBaseUrl } from 'models/location/selectors'
import { deepReplaceUuids } from 'utils/replaceUuids'

import { CampaignPageData, Section } from './CampaignPage.types'
import './CampaignPage.scss'

interface CampaignPageContext {
    slug: string
    env: string
    seo: {
        title: string
        description: string
        keywords: string
        ogImagePath: string
        datePublished: string
    }
    siteMetadata: {
        siteUrl: string
    }
}

const CampaignPage: React.FC<PageProps<CampaignPageData>> = ({ data }) => {
    const sectionData = data.campaignsJson
    const slug = sectionData.slug

    const localizedSections = deepReplaceUuids(
        sectionData.rawSections,
        process.env.GATSBY_LOCALE,
        data.campaignsJson.uuidMap,
        data.campaignsJson.defaultLocale,
    )

    const scrollToShowroomItems = useCallback(() => {
        let hash = getHash()

        if (hash.startsWith('to-')) {
            hash = hash.split('-')[1]
        }

        if (hash) {
            setTimeout(() => {
                const element = document.getElementById(hash)
                if (element) {
                    element.scrollIntoView({ block: 'start', behavior: 'smooth' })
                }
            }, 100)
        }
    }, [])

    useEffect(() => {
        scrollToShowroomItems()
    }, [scrollToShowroomItems])

    return (
        <PageContainer page="Campaign" disableDefaultSeo>
            <div id="CampaignPage">
                <RenderProvider>
                    <div className="CampaignPage">
                        {localizedSections.map((sec: Section, i: number) => {
                            const key = `${sec.id ?? sec.type}-${i}`

                            const SectionNode = (() => {
                                switch (sec.type) {
                                    case 'brand':
                                        return <Sections.BrandSection {...sec} id={sec.id} slug={slug} />
                                    case 'appMobileButton':
                                        return <Sections.AppMobileButtonSection {...sec} id={sec.id} slug={slug} />
                                    case 'hero':
                                        return <Sections.HeroSection {...sec} slug={slug} />
                                    case 'productGrid':
                                        return <Sections.ProductGridSection {...sec} slug={slug} />
                                    case 'cardGrid':
                                        return <Sections.CardGridSection {...sec} slug={slug} />
                                    case 'featureGrid':
                                        return <Sections.FeatureGridSection {...sec} slug={slug} />
                                    case 'bannerPromo':
                                        return <Sections.BannerPromoSection {...sec} slug={slug} />
                                    case 'tips':
                                        return <Sections.TipsSection {...sec} slug={slug} />
                                    case 'socialCarousel':
                                        return <Sections.SocialCarouselSection {...sec} slug={slug} />
                                    default:
                                        return null
                                }
                            })()

                            return (
                                <div key={key} className="CampaignPage__section">
                                    {SectionNode}
                                </div>
                            )
                        })}
                    </div>
                </RenderProvider>
            </div>
        </PageContainer>
    )
}

/* eslint-disable react/prop-types */
export const Head: HeadFC<unknown, CampaignPageContext> = ({ pageContext }) => {
    const { title, description, keywords, ogImagePath, datePublished } = pageContext.seo
    const siteUrl = (pageContext?.siteMetadata?.siteUrl || getBaseUrl()).replace(/\/$/, '')
    const canonical = `${siteUrl}/${pageContext.slug}/`
    const ogImage = `${siteUrl}/images/graphics/campaigns/${ogImagePath}`

    /* eslint-disable i18next/no-literal-string */
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        image: [ogImage],
        author: {
            '@type': 'Organization',
            name: 'IKEA',
        },
        publisher: {
            '@type': 'Organization',
            name: 'IKEA',
            logo: {
                '@type': 'ImageObject',
                url: 'https://www.ikea.com/global/assets/logos/brand/ikea.svg',
            },
        },
        datePublished,
    }
    /* eslint-disable i18next/no-literal-string */

    return (
        <>
            <title>{title}</title>
            <PageMetadata page="Campaign" />
            <meta name="description" content={description} />
            {keywords && <meta name="keywords" content={keywords} />}
            <meta name="robots" content="index, follow" />
            <link rel="canonical" href={canonical} />
            <meta property="og:url" content={canonical} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={ogImage} />
            {/* eslint-disable-next-line react/no-danger */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        </>
    )
}
/* eslint-disable react/prop-types */

export const query = graphql`
    query ($slug: String!, $language: String!, $env: String!) {
        campaignsJson(slug: { eq: $slug }, env: { eq: $env }) {
            slug
            allowedLocales
            defaultLocale
            uuidMap
            seo {
                title
                description
                keywords
                ogImagePath
            }

            rawSections {
                type
                ...BrandFragment
                ...HeroSectionFragment
                ...ProductGridFragment
                ...CardGridFragment
                ...FeatureGridFragment
                ...BannerPromoFragment
                ...TipsFragment
                ...SocialCarouselFragment
                ...AppDownloadButtonFragment
            }
        }

        locales: allLocale(filter: { language: { eq: $language } }) {
            edges {
                node {
                    ns
                    data
                    language
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

export default CampaignPage
