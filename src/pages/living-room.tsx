import React from 'react'
import { graphql, HeadFC, navigate } from 'gatsby'

import PageMetadata from 'components/PageMetadata'
import PageContainer from 'containers/PageContainer'
import LivingRoomPage from 'components/LivingRoomPage'
import RenderProvider from 'apps/RendererProvider'
import { useSugarcubeContext } from 'apps/SugarcubeContext'

export const LivingRoom = () => {
    const { isMobile } = useSugarcubeContext()

    if (isMobile) {
        navigate('/')
    } else {
        return <div>
            <PageContainer page="Category">
                <div id="LivingRoom">
                    <RenderProvider>
                        <LivingRoomPage />
                    </RenderProvider>
                </div>
            </PageContainer>
        </div>
    }

    return null
}

export const Head: HeadFC = () => <PageMetadata page="SearchBrowse" />

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

export default LivingRoom
