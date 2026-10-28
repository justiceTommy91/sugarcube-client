/* eslint-disable react/no-danger */

import './WordpressPost.scss'
import './WordpressPlugin.scss'

import React, { useEffect } from 'react'
import { graphql, navigate, PageProps } from 'gatsby'

import { Breadcrumb, Crumb } from 'components/uiElements/Breadcrumb'
import { useTranslation } from 'react-i18next'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import { GA_ACTION_WORDPRESS_CLICK, GA_CATEGORY_DYH_SUGARCUBE } from 'models/tracking/constants'
import PageContainer from 'containers/PageContainer'

interface WordpressPostProps extends PageProps<Queries.WordpressPostTemplateQuery> {
    pageContext: {
        blogPost: {
            slug: string
            title: string
            uri: string
        }
        processedContent: string
    }
}

export const WordpressPost = ({ data: { post }, pageContext }: WordpressPostProps) => {
    const blogCrumbData = pageContext.blogPost
    const isBlogHome = blogCrumbData.slug === post?.slug
    const { t } = useTranslation('translation')

    const blogCrumb: Crumb[] = [
        {
            pathname: '/',
            crumbLabel: t('blog.design'),
            isCurrent: false,
        },
        {
            pathname: blogCrumbData.uri,
            crumbLabel: t('blog.kreativ design tips'),
            isCurrent: isBlogHome,
        },
    ]
    const crumbs = isBlogHome
        ? blogCrumb
        : [...blogCrumb, { pathname: '../', crumbLabel: post?.title, isCurrent: !isBlogHome }]

    useEffect(() => {
        const hasFeaturedPostsParent = (target: HTMLElement | null): boolean | ChildNode | null => {
            if (!target) {
                return false
            }

            if (target.id === 'featured-posts') {
                return true
            }

            return hasFeaturedPostsParent(target.parentElement)
        }

        const getFeaturedPostInnerText = (target: HTMLElement | null): string | boolean | null => {
            if (!target) {
                return false
            }

            if (target.innerText) {
                return target.innerText
            }

            return getFeaturedPostInnerText(target.parentElement)
        }
        const handleLinkClick = (e: Event) => {
            const target = e.currentTarget as HTMLAnchorElement
            const href = target.getAttribute('data-gatsby-href')

            const hasParentTracking = !!target.parentElement?.getAttribute('data-track-cta-text')

            const element = hasParentTracking ? target.parentElement : target

            const isFeaturePost = hasFeaturedPostsParent(target) as HTMLElement

            const trackingInfo = {
                CtaText: isFeaturePost
                    ? getFeaturedPostInnerText(target)
                    : element?.getAttribute('data-track-cta-text'),
                LinkType: isFeaturePost ? `crosslink` : element?.getAttribute('data-track-link-type'),
                CtaPlacement: element?.getAttribute('data-track-cta-placement') || 1,
                ElementType: element?.getAttribute('data-track-element-type'),
            }

            if (trackingInfo.CtaText) {
                const gaLabel = `${trackingInfo.CtaText || null}|${trackingInfo.LinkType || null}|${
                    trackingInfo.CtaPlacement || null
                }|${trackingInfo.ElementType || null}`
                trackGoogleAnalytics(GA_CATEGORY_DYH_SUGARCUBE, GA_ACTION_WORDPRESS_CLICK, gaLabel)
                click('WordPressPost.ButtonClick', trackingInfo)
            }

            if (href) {
                e.preventDefault()
                navigate(href)
            }
        }

        const links = document.querySelectorAll('a[data-gatsby-href]')
        links.forEach((link) => {
            link.addEventListener('click', handleLinkClick)
        })

        return () => {
            links.forEach((link) => {
                link.removeEventListener('click', handleLinkClick)
            })
        }
    }, [])

    return (
        <PageContainer page="WordPressPost">
            <div className="wordpress">
                <Breadcrumb crumbs={crumbs} />
                <div className="post-content WordpressGenesisPluginStyles">
                    <div
                        className="entry-content"
                        dangerouslySetInnerHTML={{ __html: pageContext.processedContent || '' }}
                    />
                </div>
            </div>
        </PageContainer>
    )
}

export default WordpressPost

export const Head = ({ data: { post }, pageContext }: WordpressPostProps) => {
    const blogData = pageContext.blogPost
    const isBlogHome = pageContext.blogPost.slug === post?.slug
    const postTitle = post?.title

    const title = isBlogHome ? blogData.title : `${pageContext.blogPost.title} - ${postTitle}`

    return (
        <div>
            <title>{title}</title>
        </div>
    )
}

export const query = graphql`
    query WordpressPostTemplate($slug: String!, $language: String!) {
        post: wpPost(slug: { eq: $slug }) {
            title
            slug
        }
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
