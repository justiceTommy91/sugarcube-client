import React from 'react'
import { HeadFC, graphql } from 'gatsby'
import { UpptackaShowroom as UpptackaShowroomComponent } from 'components/upptackaShowroom/UpptackaShowroom'
import PageContainer from 'containers/PageContainer'
import PageMetadata from 'components/PageMetadata'
import RenderProvider from 'apps/RendererProvider'

const UpptackaShowroom = () => (
    <PageContainer page="UpptackaShowroom">
        <RenderProvider>
            <UpptackaShowroomComponent />
        </RenderProvider>
    </PageContainer>
)

export const Head: HeadFC = () => <PageMetadata page="UpptackaShowroom" />

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

export default UpptackaShowroom
