import React from 'react'
import { graphql, useStaticQuery } from 'gatsby'
import { Helmet } from 'react-helmet'
import { useTranslation } from 'react-i18next'
import { getWindow } from 'models/location/selectors'
import { getSeoRoute } from 'utils/seo'
import { SeoMetaDataPageType } from './constants'

interface SeoProps {
    seoMetaDataPage: SeoMetaDataPageType | null
    allowSeo: SeoMetaDataPageType | null
}

const Seo = ({ seoMetaDataPage, allowSeo }: SeoProps) => {
    const data = useStaticQuery(graphql`
        {
            site {
                siteMetadata {
                    siteUrl
                    title
                    description
                    keywords
                }
            }
        }
    `)
    const { t } = useTranslation()
    const defaults = data.site.siteMetadata

    const title = allowSeo && seoMetaDataPage ? t(`siteMetaData.${seoMetaDataPage}.title2`) : undefined
    const description = seoMetaDataPage ? t(`siteMetaData.${seoMetaDataPage}.description2`) : undefined
    const keywords = seoMetaDataPage ? t(`siteMetaData.${seoMetaDataPage}.keywords2`) : undefined
    // Gatsby is stripping out the trailing slash here from siteMetaData.siteUrl
    const siteUrlWithTrailingSlash = defaults.siteUrl.endsWith('/') ? defaults.siteUrl : `${defaults.siteUrl}/`
    const canonicalUrl = getSeoRoute(siteUrlWithTrailingSlash.replace(/\/$/, ''), seoMetaDataPage)

    const seo = {
        siteUrl: canonicalUrl,
        title: title || defaults.title,
        description: description || defaults.description,
        keywords: keywords || defaults.keywords,
    }

    const robotContent = allowSeo ? `index, follow` : `noindex, nofollow`

    const isBlog = getWindow().location?.pathname.includes('/blog/')

    return (
        <Helmet title={isBlog ? undefined : seo.title}>
            {allowSeo && <meta name="description" content={seo.description} />}
            {allowSeo && <meta name="keywords" content={seo.keywords} />}
            <meta name="robots" content={robotContent} />
            {allowSeo && <link rel="canonical" href={seo.siteUrl} />}
        </Helmet>
    )
}

export default Seo
