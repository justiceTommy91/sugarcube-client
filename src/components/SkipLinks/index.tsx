import React from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'

import arrowDown from '@ingka/ssr-icon/paths/arrow-down'
import arrowLeft from '@ingka/ssr-icon/paths/arrow-left'
import arrowUp from '@ingka/ssr-icon/paths/arrow-up'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right'
import arrowUpBackwards from '@ingka/ssr-icon/paths/arrow-up-backwards'
import arrowUpForwards from '@ingka/ssr-icon/paths/arrow-up-forwards'
import arrowDownForwards from '@ingka/ssr-icon/paths/arrow-down-forwards'
import arrowDownBackwards from '@ingka/ssr-icon/paths/arrow-down-backwards'
import SSRIcon from '@ingka/ssr-icon'

import { useAppDispatch } from 'hooks/useAppDispatch'
import { openDesignSidepanel } from 'models/ui/actions'

import getSkipLinkInfo from './helpers'
import { BROWSE, DESIGN, HEADER } from './constants'

require('./styles.scss')

interface SkipLinksProps {
    label: string
    skipLinks: string[]
    skipContext: string
    categoryKey?: string
    floating?: boolean
}

const icons = {
    arrowDown,
    arrowLeft,
    arrowUp,
    arrowRight,
    arrowUpBackwards,
    arrowUpForwards,
    arrowDownForwards,
    arrowDownBackwards,
}

const SkipLinks = ({ label, skipLinks, skipContext, categoryKey = '', floating = false }: SkipLinksProps) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const pinDesignSidepanel = () => dispatch(openDesignSidepanel())

    const getIconCode = (code: string | null) => icons[code as keyof typeof icons]

    return (
        <nav
            className={classNames('SkipLinks', { positionAbsolute: floating || skipContext === DESIGN })}
            aria-label={label}
        >
            {skipLinks.map((skipLink, index) => {
                const { skipToText, iconCode, onClick } = getSkipLinkInfo(skipLink, skipContext, categoryKey, t)
                if (!skipToText) {
                    return null
                }

                return (
                    <button
                        key={`skipLink-${skipContext}-${skipToText}`}
                        onClick={() => {
                            // Ensure the design sidebar panel is pinned before skipping to it
                            if (skipContext === DESIGN && (skipLink === BROWSE || skipLink === HEADER)) {
                                pinDesignSidepanel()
                            }
                            // KLUDGE: we have to wait for the redux actions to finish before focusing the skip
                            // links in the sidebar because when the sidebar is not pinned it's contents are "inert"
                            // and unfocusable.
                            setTimeout(() => onClick?.(), 0)
                        }}
                        id={index === 0 ? `skipLinkId-${skipContext}` : undefined}
                    >
                        <SSRIcon paths={getIconCode(iconCode)} />
                        {skipToText}
                    </button>
                )
            })}
        </nav>
    )
}

export default SkipLinks
