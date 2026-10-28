import React from 'react'
import { HeadFC, graphql } from 'gatsby'
import ShareSummaryContainer from 'containers/share/ShareSummaryContainer'
import PageContainer from 'containers/PageContainer'
import PageMetadata from 'components/PageMetadata'
import RenderProvider from 'apps/RendererProvider'

interface ParamsProps {
    params: {
        id: string
    }
}

const SharePage = ({ params }: ParamsProps) => {
    const { id } = params
    return (
        <PageContainer page="Share">
            <RenderProvider>
                <ShareSummaryContainer compositionUuid={id} />
            </RenderProvider>
        </PageContainer>
    )
}

export const Head: HeadFC = () => <PageMetadata page="Share" />

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

export default SharePage
