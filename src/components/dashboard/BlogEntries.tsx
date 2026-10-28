import Button from '@ingka/button'
import Carousel from '@ingka/carousel'
import Image from '@ingka/image'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { Link, navigate } from 'gatsby'
import { useScrollTracking } from 'hooks'
import { USER_SCROLLED_PAST_GO_TO_BLOG } from 'models/sessionStorage/constants'
import { GA_ACTION_BLOG_CLICK, GA_CATEGORY_DYH_SUGARCUBE, TRACK_LOCATION_DASHBOARD } from 'models/tracking/constants'
import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { click, trackGoogleAnalytics } from 'utils/tracker'

const HiddenPostCategories = {
    TEST_ONLY: 248,
    UNCATEGORIZED: 1,
    LINK_ONLY_NOT_POST: 117,
}

export interface BlogEntriesProps {
    posts?: Queries.BlogEntriesEdge[]
}

require('./BlogEntries.scss')

const TRACKING_BLOG_SECTION = 'GoToBlog'

export const BlogEntries: React.FC<BlogEntriesProps> = ({ posts }) => {
    const { t } = useTranslation()
    const { isMobile } = useSugarcubeContext()

    const blogRef = useRef<HTMLDivElement | null>(null)

    useScrollTracking(blogRef, USER_SCROLLED_PAST_GO_TO_BLOG, TRACKING_BLOG_SECTION, TRACK_LOCATION_DASHBOARD)

    const sendTrackingEvents = (trackingInfo: { BlogId: string }) => {
        if (trackingInfo.BlogId) {
            trackGoogleAnalytics(GA_CATEGORY_DYH_SUGARCUBE, GA_ACTION_BLOG_CLICK, trackingInfo.BlogId)
            click('Dashboard.BlogPostClick', trackingInfo)
        }
    }

    const onPostClick = (post: Queries.BlogEntriesEdge) => {
        if (post.node.slug) {
            const trackingInfo = {
                BlogId: post.node.slug,
            }
            sendTrackingEvents(trackingInfo)
        }
    }

    const onReadMoreClick = () => {
        const trackingInfo = {
            BlogId: `blog`,
        }

        sendTrackingEvents(trackingInfo)
        navigate('/blog')
    }

    const filteredPosts = posts?.filter(
        (post) =>
            !post.node.categories?.some(
                (category) =>
                    category === HiddenPostCategories.TEST_ONLY ||
                    category === HiddenPostCategories.UNCATEGORIZED ||
                    category === HiddenPostCategories.LINK_ONLY_NOT_POST,
            ),
    )

    return !isMobile && posts?.length ? (
        <div className="blogEntries" ref={blogRef}>
            <div className="titleRow">
                <div className="blogEntriesTitle">{t('blog.kreativ design tips')}</div>
                <Button text={t('blog.read more')} onClick={onReadMoreClick} />
            </div>
            <Carousel id="blog-entries-carousel">
                {filteredPosts?.map((post) => (
                    <Link to={`/${post.node.uri}`} onClick={() => onPostClick(post)}>
                        <div className="blogEntry">
                            <Image src={post.node.featuredImage as string} alt="" className="image" />
                            <p className="title">{post.node.title}</p>
                        </div>
                    </Link>
                ))}
            </Carousel>
        </div>
    ) : null
}
