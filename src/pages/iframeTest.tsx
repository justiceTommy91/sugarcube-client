import React from 'react'
import { HeadFC, graphql } from 'gatsby'
import { IFrameTest as IFrameTestComponent } from 'components/IFrameTest'
import PageContainer from 'containers/PageContainer'
import PageMetadata from 'components/PageMetadata'
import RenderProvider from 'apps/RendererProvider'

const IFrameTest = () => (
    <PageContainer page="IFrameTest">
        <RenderProvider>
            <IFrameTestComponent />
        </RenderProvider>
    </PageContainer>
)

export const Head: HeadFC = () => <PageMetadata page="IFrameTest" />

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

export default IFrameTest
