import { SEO_META_DATA_LEARN_MORE, SEO_META_DATA_DASHBOARD, SeoMetaDataPageType } from 'components/seo/constants'

export const getSeoRoute = (siteUrl: string, seo: SeoMetaDataPageType | null) => {
    if (!seo) {
        return undefined
    }

    switch (seo) {
        case SEO_META_DATA_DASHBOARD:
            return siteUrl.concat('/')
        case SEO_META_DATA_LEARN_MORE:
            return siteUrl.concat(`/${SEO_META_DATA_LEARN_MORE}/`)
        default:
            return undefined
    }
}
