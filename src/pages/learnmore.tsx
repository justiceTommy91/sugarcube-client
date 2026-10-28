import React from 'react'
import { HeadFC, graphql } from 'gatsby'
import LearnMorePage from 'components/LearnMorePage'
import PageContainer from 'containers/PageContainer'
import PageMetadata from 'components/PageMetadata'
import RenderProvider from 'apps/RendererProvider'

const LearnMore = () => (
    <PageContainer page="LearnMore">
        <RenderProvider>
            <LearnMorePage />
        </RenderProvider>
    </PageContainer>
)

export const Head: HeadFC = () => <PageMetadata page="LearnMore" />

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

export default LearnMore
