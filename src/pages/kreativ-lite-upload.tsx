import React, { useMemo, useEffect, useCallback } from 'react'
import { graphql, HeadFC, navigate, withPrefix } from 'gatsby'
import { useSugarcubeContext } from 'apps/SugarcubeContext'

import RenderProvider from 'apps/RendererProvider'
import PageContainer from 'containers/PageContainer'
import PageMetadata from 'components/PageMetadata'
import UploadProgressBanners from 'components/KreativLite/UploadProgressBanners'
import DesignTipsCarousel from 'components/KreativLite/DesignTipsCarousel'
import MobileDesignTipsCarousel from 'components/KreativLite/MobileDesignTipsCarousel'
import { getUrlParams } from 'utils/urlParams'
import { PARAM_OPEN_UPLOAD } from 'models/location/constants'
import { error, trackGoogleAnalytics } from 'utils/tracker'
import {
    KREATIVLITE_PROCESSING_NO_SCENE_ID,
    GA_ACTION_KREATIVLITE_PROCESSING_ERROR,
    GA_CATEGORY_DYH_SUGARCUBE,
} from 'models/tracking/constants'
import { useAppDispatch, useAppSelector } from 'hooks'
import { openScene } from 'models/scenes/actions'
import { getContextFromReferrer } from 'models/referrer/selector'
import { requestFurnitureCategories } from 'models/furniture/actions'

require('./KreativLiteUpload.scss')

const KreativLiteUploadContent = ({ sceneId }: { sceneId: string | null }) => {
    const dispatch = useAppDispatch()
    const context = useAppSelector(getContextFromReferrer)
    const { isMobile } = useSugarcubeContext()

    const handleComplete = useCallback(
        (sceneUuid: string) => {
            if (isMobile) {
                // opens the astro design page with the scene id as a query param
                window.location.assign(withPrefix(`/kreativ-lite/?sceneId=${sceneUuid}`))
            } else {
                // opens the scene on the gatsby design page
                dispatch(openScene(sceneUuid, undefined, { sceneId: sceneUuid }))
            }
        },
        [dispatch, isMobile],
    )

    // Pre-fetch furniture categories while the image is processing so the design
    // tool is ready when the user lands on it — same optimisation as RoomBuilderPage.
    useEffect(() => {
        if (context) {
            dispatch(requestFurnitureCategories())
        }
    }, [context, dispatch])

    return (
        <>
            <UploadProgressBanners sceneId={sceneId} onComplete={handleComplete} allowGuest />
            <DesignTipsCarousel />
            <MobileDesignTipsCarousel />
        </>
    )
}

export const KreativLiteUploadPage = () => {
    const sceneId = useMemo(() => {
        const params = getUrlParams()
        return params.sceneId?.toString() || null
    }, [])

    useEffect(() => {
        if (!sceneId) {
            error(KREATIVLITE_PROCESSING_NO_SCENE_ID)
            trackGoogleAnalytics({
                action: GA_ACTION_KREATIVLITE_PROCESSING_ERROR,
                category: GA_CATEGORY_DYH_SUGARCUBE,
                label: '',
            })
            navigate(`/dashboard?${PARAM_OPEN_UPLOAD}=true`)
        }
    }, [sceneId])

    return (
        <PageContainer page="KreativLiteUpload">
            <div id="KreativLiteUploadPage">
                <RenderProvider>
                    <KreativLiteUploadContent sceneId={sceneId} />
                </RenderProvider>
            </div>
        </PageContainer>
    )
}

export const Head: HeadFC = () => <PageMetadata page="KreativLiteUpload" />

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

export default KreativLiteUploadPage
