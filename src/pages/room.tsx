import React from 'react'
import { HeadFC, graphql } from 'gatsby'
import { Helmet } from 'react-helmet'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from 'hooks'

import { useSugarcubeContext } from 'apps/SugarcubeContext'
import PageContainer from 'containers/PageContainer'
import PageMetadata from 'components/PageMetadata'
import { getAllowMobileWeb } from 'models/location/selectors'
import { getSelectedComposition } from 'models/compositions/selectors'
import { UpptackaDesignPage } from 'components/upptacka/UpptackaDesignPage'

const MobileDesignPage = React.lazy(() => import('components/design/MobileDesignPage'))
const DesktopDesignPage = React.lazy(() => import('components/design/DesktopDesignPage'))
const RenderProvider = React.lazy(() => import('apps/RendererProvider'))

const DesignPageHeader = () => {
    const { t } = useTranslation(['dashboard'])
    const selectedComposition = useAppSelector(getSelectedComposition)

    let pageTitle

    if (selectedComposition?.name) {
        pageTitle = `${t('dashboard:dashboard.ikea kreativ')} - ${selectedComposition?.name}`
    } else {
        pageTitle = t('dashboard:dashboard.ikea kreativ')
    }

    return (
        <Helmet>
            <title>{pageTitle}</title>
        </Helmet>
    )
}

const DesignPage: React.FunctionComponent = () => {
    const { isMobile, isUpptacka } = useSugarcubeContext()
    const isSSR = typeof window === 'undefined'

    // NOTE: because mobile and desktop pages differ significantly, we return null during server
    // side rendering to ensure that when React hydrates on the client it doesn't detect a markup
    // mismatch and rerender the whole page.
    let content
    if (isSSR) {
        content = null
    } else if (isMobile && !getAllowMobileWeb()) {
        content = <MobileDesignPage />
    } else if (isUpptacka) {
        content = (
            <RenderProvider>
                <UpptackaDesignPage />
            </RenderProvider>
        )
    } else {
        content = (
            <RenderProvider>
                <DesignPageHeader />
                <DesktopDesignPage />
            </RenderProvider>
        )
    }

    return <PageContainer page="DecorateRoom">{content}</PageContainer>
}

export const Head: HeadFC = () => <PageMetadata page="DecorateRoom" />

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

export default DesignPage
