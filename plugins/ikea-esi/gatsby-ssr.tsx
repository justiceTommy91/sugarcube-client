import { execSync } from 'child_process'

import ReactHtmlParser from 'html-react-parser'
import React, { Fragment } from 'react'
import type { GatsbySSR } from 'gatsby'
import type { ReactNode } from 'react'

import {
    esiEnabled,
    getEsiHeaderFooterPath,
    getEsiProductPath,
    thisIsSafeIPinkyPromise,
} from './utils'
import { processEsiUrl, readCachedEsiFragment } from './get-fragments'

const buildTime = new Date()
const gitCommitHash = thisIsSafeIPinkyPromise(execSync, 'git rev-parse HEAD').toString().trim()
const gitCommitTime = thisIsSafeIPinkyPromise(execSync, `git --no-pager log -1 --date=iso-strict --pretty='format:%cd'`)
    .toString()
    .trim()

const generateEsiElement = (url: string, requestPath: boolean): ReactNode[] => {
    // Offline mode has no upstream and no cached fragments — render nothing.
    if (process.env.OFFLINE === 'true') {
        return []
    }
    if (esiEnabled()) {
        const esiUrl = processEsiUrl(url, requestPath)
        return [<Fragment key={url}>{ReactHtmlParser(`<esi:include src="${esiUrl}"/>`)}</Fragment>]
    }
    const esiContent = readCachedEsiFragment(url)
    // console.log(`Loading from ${cachePath}: ${content.substring(0, 50)}`)
    return [<Fragment key={url}>{ReactHtmlParser(esiContent)}</Fragment>]
}

const generateHeaderEsiElement = (includeFile: string, requestPath: boolean): ReactNode[] => {
    return generateEsiElement(getEsiHeaderFooterPath(includeFile), requestPath)
}

const generateProductEsiElement = (includeFile: string): ReactNode[] => {
    return generateEsiElement(getEsiProductPath(includeFile), false)
}


const updateHeadComponents = (pathname: string, headComponents: ReactNode[]) => {
    const headInclude = generateHeaderEsiElement('style-fragment-recursive.html', true)

    const collapseSubnav = [
        <style>{`
            .hnf-tabs-navigation--collapsed {
                margin-bottom: 0 !important;
            }
        `}</style>,
    ]

    const hideSyndeoChat = [
        <style>{`
            syndeo-chat {
                display: none;
            }
        `}</style>
    ]

    const preserveWorker = [
        <script
            dangerouslySetInnerHTML={{
                __html: `
                    'use strict';

                    (function() {
                        let NewWorker = window.Worker
                        let allowSettingWorker = false

                        Object.defineProperty(window, 'Worker', {
                            set(value) {
                                // Only allow our code to override the global Worker object, preventing
                                // Akamai from hijacking our Worker and causing various issues.
                                if (!allowSettingWorker) {
                                    return
                                }
                                NewWorker = value
                            },
                            get() {
                                return NewWorker
                            },
                            configurable: false,
                        })

                        window.overrideWorker = (value) => {
                            allowSettingWorker = true
                            window.Worker = value
                            allowSettingWorker = false
                        }
                    })()
                `,
            }}
        />,
    ]

    // Styles for hiding the header/footer rendered by nav-navigera-renderer:
    // https://github.com/ingka-group-digital/nav-navigera-renderer
    const hideHeaderFooter = [
        <style id="kreativ-hideHeaderFooter">{`
            .hnf-voc-cta--footer {
                display: none !important;
            }
            body.hideHeaderFooter .hnf-messages {
                display: none !important;
            }

            body.hideHeaderFooter .hnf-skiplink,
            body.hideHeaderFooter #hnf-navbar-filler {
                display: none !important;
                height: 0 !important;
                overflow: hidden !important;
            }

            /* Cannot use display:none on .hnf-header — the store/postal-code picker modals
               are rendered as position:fixed elements inside it and must remain openable.
               height:0 + overflow:hidden collapses layout space without clipping them. */
            body.hideHeaderFooter .hnf-header {
                height: 0 !important;
                overflow: hidden !important;
            }

            body.hideHeaderFooter .hnf-footer {
                display: none !important;
            }
        `}</style>,
    ]

    return [
        <meta key="kreativ-buildTime" name="kreativ-buildTime" content={buildTime.toISOString()} />,
        <meta key="kreativ-commitHash" name="kreativ-commitHash" content={gitCommitHash} />,
        <meta key="kreativ-commitTime" name="kreativ-commitTime" content={gitCommitTime} />,
        ...preserveWorker,
        ...headComponents,
        ...headInclude,
        ...hideHeaderFooter,
        ...collapseSubnav,
        ...hideSyndeoChat,
    ]
}

const updatePreBodyComponents = (preBodyComponents: ReactNode[]) => {
    const preBodyInclude = [
        ...generateHeaderEsiElement('header-collapsed-fragment-recursive.html', false),
        ...generateProductEsiElement('price-package-styles.html'),
    ]

    return [...preBodyInclude, ...preBodyComponents]
}

const updatePostBodyComponents = (postBodyComponents: ReactNode[]) => {
    const postBodyInclude = [
        ...generateHeaderEsiElement('footer-fragment-recursive.html', false),
        ...generateHeaderEsiElement('script-fragment-recursive.html', true),
        ...generateProductEsiElement('price-package-scripts.html'),
    ]
    return [...postBodyComponents, ...postBodyInclude]
}

export const onPreRenderHTML: GatsbySSR['onPreRenderHTML'] = ({
    pathname,
    getHeadComponents,
    replaceHeadComponents,
    getPreBodyComponents,
    replacePreBodyComponents,
    getPostBodyComponents,
    replacePostBodyComponents,
}) => {
    const updatedHead = updateHeadComponents(pathname, getHeadComponents())
    const updatedPreBody = updatePreBodyComponents(getPreBodyComponents())
    const updatedPostBody = updatePostBodyComponents(getPostBodyComponents())

    replaceHeadComponents(updatedHead)
    replacePreBodyComponents(updatedPreBody)
    replacePostBodyComponents(updatedPostBody)
}

export const onRenderBody: GatsbySSR['onRenderBody'] = ({ pathname, setBodyAttributes }) => {

    // Hide header footer for /room, /chooseRoom, and /searchBrowse pages.
    // Show header footer for pages with -room like /living-room and other pages.
    if (/(?<!-)room|chooseRoom|searchBrowse|kreativ-lite-upload/.test(pathname)) {
        setBodyAttributes({
            // Also set in gatsby-browser
            className: 'hideHeaderFooter',
        })
    }
}
