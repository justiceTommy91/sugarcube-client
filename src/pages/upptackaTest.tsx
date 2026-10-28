import React from 'react'
import { HeadFC, graphql } from 'gatsby'
import { UpptackaIframeTest as UpptackaIframeTestComponent } from 'components/upptackaIframeTest/UpptackaIframeTest'
import PageContainer from 'containers/PageContainer'
import PageMetadata from 'components/PageMetadata'
import RenderProvider from 'apps/RendererProvider'

const UpptackaTest = () => (
    <PageContainer page="UpptackaIframeTest">
        <RenderProvider>
            <UpptackaIframeTestComponent />
        </RenderProvider>
    </PageContainer>
)

export const Head: HeadFC = () => <PageMetadata page="UpptackaIframeTest" />

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

export default UpptackaTest
