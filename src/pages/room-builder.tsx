import React, { Suspense, useEffect, useState } from 'react'
import { HeadFC, graphql } from 'gatsby'

import PageContainer from 'containers/PageContainer'
import PageMetadata from 'components/PageMetadata'
import RenderProvider from 'apps/RendererProvider'
import RoomBuilder from 'components/Planner/RoomBuilderPage'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'

const RoomBuilderPage = () => {
    const [hasMounted, setHasMounted] = useState(false)

    useEffect(() => {
        setHasMounted(true)
    }, [])

    const isLoading = !hasMounted

    let content
    if (isLoading) {
        content = <BouncingBallLoader className="BouncingBallLoader__roomBuilderPage" />
    } else {
        content = (
            <Suspense fallback={<BouncingBallLoader className="BouncingBallLoader__roomBuilderPage" />}>
                <RenderProvider>
                    <RoomBuilder />
                </RenderProvider>
            </Suspense>
        )
    }

    return <PageContainer page="RoomBuilder">{content}</PageContainer>
}

export const Head: HeadFC = () => <PageMetadata page="RoomBuilder" />

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

export default RoomBuilderPage
