import React, { ReactNode, useEffect } from 'react'
import * as Sentry from '@sentry/react'
import { graphql } from 'gatsby'
import ErrorMessage from 'components/ErrorMessage'
import uiStateService from 'services/uiState'
import Seo from 'components/seo'
import { SEO_META_DATA_DASHBOARD, SEO_META_DATA_LEARN_MORE, SeoMetaDataPageType } from 'components/seo/constants'
import { visit } from 'utils/tracker'
import * as tracker from 'utils/tracker'
import {
    GA_ACTION_CHOOSE_ROOM_PAGE_VISIT,
    GA_ACTION_DASHBOARD_PAGE_VISIT,
    GA_ACTION_SHARE_PAGE_VISIT,
    GA_ACTION_DECORATE_ROOM_PAGE_VISIT,
    GA_ACTION_KIOSK_LANDING_PAGE_VISIT,
    GA_ACTION_LEARN_MORE_PAGE_VISIT,
    GA_ACTION_WORDPRESS_PAGE_VISIT,
    GA_LABEL_RETURN_USER,
    GA_LABEL_NEW_USER,
    GA_CATEGORY_DYH_SUGARCUBE,
    GA_ACTION_SEARCH_BROWSE_PAGE_VISIT,
    GA_ACTION_UPPTACKA_LANDING_PAGE_VISIT,
    GA_ACTION_CATEGORY_PAGE_VISIT,
    GA_ACTION_CAMPAIGN_PAGE_VISIT,
    GA_ACTION_ROOM_BUILDER_PAGE_VISIT,
    GA_ACTION_ROOM_EDITOR_PAGE_VISIT,
} from 'models/tracking/constants'
import { getHref } from 'models/location/selectors'
import { Page } from 'constants/pages'
import { useToastsMutations } from 'toasts/ToastsProvider'
import { useTranslation } from 'react-i18next'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { getSlugFromUrl } from 'utils/buildUrls'

type PageContainerProps = {
    children: ReactNode
    // Event name for visit page in Mixpanel and used for getting the ga visit page event
    page: Page
    // This flag is used for disabling deafult SEO allowing templates to handle its own Seo
    disableDefaultSeo?: boolean
}

// Event names for page visit for Google Analytics
const pageTracking = {
    Dashboard: {
        gaEvent: GA_ACTION_DASHBOARD_PAGE_VISIT,
        seoMetaDataPage: SEO_META_DATA_DASHBOARD as SeoMetaDataPageType,
    },
    ChooseRoom: {
        gaEvent: GA_ACTION_CHOOSE_ROOM_PAGE_VISIT,
        seoMetaDataPage: null,
    },
    SearchBrowse: {
        gaEvent: GA_ACTION_SEARCH_BROWSE_PAGE_VISIT,
        seoMetaDataPage: null,
    },
    Share: {
        gaEvent: GA_ACTION_SHARE_PAGE_VISIT,
        seoMetaDataPage: null,
    },
    LearnMore: {
        gaEvent: GA_ACTION_LEARN_MORE_PAGE_VISIT,
        seoMetaDataPage: SEO_META_DATA_LEARN_MORE as SeoMetaDataPageType,
    },
    DecorateRoom: {
        gaEvent: GA_ACTION_DECORATE_ROOM_PAGE_VISIT,
        seoMetaDataPage: null,
    },
    KioskLanding: {
        gaEvent: GA_ACTION_KIOSK_LANDING_PAGE_VISIT,
        seoMetaDataPage: null,
    },
    WordPressPost: {
        gaEvent: GA_ACTION_WORDPRESS_PAGE_VISIT,
        seoMetaDataPage: null,
    },
    Login: {
        gaEvent: null,
        seoMetaDataPage: null,
    },
    IFrameTest: {
        gaEvent: null,
        seoMetaDataPage: null,
    },
    UpptackaIframeTest: {
        gaEvent: null,
        seoMetaDataPage: null,
    },
    UpptackaShowroom: {
        gaEvent: GA_ACTION_UPPTACKA_LANDING_PAGE_VISIT,
        seoMetaDataPage: null,
    },
    Category: {
        gaEvent: GA_ACTION_CATEGORY_PAGE_VISIT,
        seoMetaDataPage: null,
    },
    Campaign: {
        gaEvent: GA_ACTION_CAMPAIGN_PAGE_VISIT,
        seoMetaDataPage: null,
    },
    RoomBuilder: {
        gaEvent: GA_ACTION_ROOM_BUILDER_PAGE_VISIT,
        seoMetaDataPage: null,
    },
    RoomEditor: {
        gaEvent: GA_ACTION_ROOM_EDITOR_PAGE_VISIT,
        seoMetaDataPage: null,
    },
    KreativLiteUpload: {
        gaEvent: null,
        seoMetaDataPage: null,
    },
}

const PageContainer = ({ children, page, disableDefaultSeo }: PageContainerProps) => {
    const { i18n } = useTranslation()
    const { showLocaleKeys } = useSugarcubeContext()
    useEffect(() => {
        if (showLocaleKeys) {
            i18n.changeLanguage(`cimode`)
        }
    }, [showLocaleKeys])

    // If seoMetaDataPage value is null, do not have a Seo component for the page
    // When it is non null, it holds the key for site meta data that is localized in translation.json
    const { seoMetaDataPage } = pageTracking[page]

    const allowSeo = seoMetaDataPage
    const { clearAllToasts } = useToastsMutations()

    useEffect(() => {
        if (!page) {
            return undefined
        }
        const trackVisitPageGA = pageTracking[page].gaEvent
        const trackingInfo = trackVisitPageGA
            ? {
                  action: trackVisitPageGA,
                  label: '',
              }
            : null

        if (page === 'Dashboard') {
            // On the dashboard page, we want to check if the user has seen the dashboard page
            // and add this meta data in mixpanel and GA events.

            const { seenDashboard = false } = uiStateService.retrieve()
            const userTypeString = seenDashboard ? GA_LABEL_RETURN_USER : GA_LABEL_NEW_USER
            tracker.visit(page, { UserType: userTypeString })
            if (trackingInfo) {
                trackingInfo.label = userTypeString
                tracker.trackGoogleAnalytics(GA_CATEGORY_DYH_SUGARCUBE, trackingInfo.action, trackingInfo.label)
            }
        } else if (page === 'WordPressPost') {
            const url = getHref()
            visit(page, { Url: url })
            if (trackingInfo) {
                trackingInfo.label = url
                tracker.trackGoogleAnalytics(GA_CATEGORY_DYH_SUGARCUBE, trackingInfo.action, trackingInfo.label)
            }
        } else if (page === 'Category') {
            const slug = getSlugFromUrl(getHref())
            visit(page, { Category: slug })
            if (trackingInfo) {
                trackingInfo.label = slug
                tracker.trackGoogleAnalytics(GA_CATEGORY_DYH_SUGARCUBE, trackingInfo.action, trackingInfo.label)
            }
        } else if (page === 'Campaign') {
            const slug = getSlugFromUrl(getHref())
            visit(page, { Campaign: slug })
            if (trackingInfo) {
                trackingInfo.label = slug
                tracker.trackGoogleAnalytics(GA_CATEGORY_DYH_SUGARCUBE, trackingInfo.action, trackingInfo.label)
            }
        } else if (page === 'RoomBuilder') {
            const slug = getSlugFromUrl(getHref())
            visit(page, { RoomBuilder: slug })
            if (trackingInfo) {
                trackingInfo.label = slug
                tracker.trackGoogleAnalytics(GA_CATEGORY_DYH_SUGARCUBE, trackingInfo.action, trackingInfo.label)
            }
        } else if (page === 'RoomEditor') {
            const slug = getSlugFromUrl(getHref())
            visit(page, { RoomEditor: slug })
            if (trackingInfo) {
                trackingInfo.label = slug
                tracker.trackGoogleAnalytics(GA_CATEGORY_DYH_SUGARCUBE, trackingInfo.action, trackingInfo.label)
            }
        } else {
            // all other pages that are not dashboard
            visit(page)
            if (trackingInfo) {
                tracker.trackGoogleAnalytics(GA_CATEGORY_DYH_SUGARCUBE, trackingInfo.action, trackingInfo.label)
            }
        }

        // Ensure that toasts are cleared after every page transition.
        return () => {
            clearAllToasts()
        }
    }, [page])

    return (
        <Sentry.ErrorBoundary fallback={<ErrorMessage />} onError={tracker.trackError}>
            {!disableDefaultSeo && <Seo seoMetaDataPage={seoMetaDataPage} allowSeo={allowSeo} />}
            <React.Suspense>{children}</React.Suspense>
        </Sentry.ErrorBoundary>
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
    }
`
export default PageContainer
