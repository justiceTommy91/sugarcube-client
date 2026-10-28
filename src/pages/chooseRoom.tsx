import React from 'react'
import { graphql, HeadFC } from 'gatsby'

import ChooseRoomContainer from 'containers/chooseRoom'
import PageContainer from 'containers/PageContainer'
import PageMetadata from 'components/PageMetadata'
import RenderProvider from 'apps/RendererProvider'

require('./DashboardPage.scss')

export const ChooseRoomPage = () => (
    <PageContainer page="ChooseRoom">
        <div id="ChooseRoomPage">
            <RenderProvider>
                <ChooseRoomContainer />
            </RenderProvider>
        </div>
    </PageContainer>
)

export const Head: HeadFC = () => <PageMetadata page="ChooseRoom" />

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

export default ChooseRoomPage
