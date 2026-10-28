import React, { useState, useEffect } from 'react'
import classNames from 'classnames'
import Tooltip from 'components/Tooltip'
import { useTranslation } from 'react-i18next'
import './styles.scss'

type CarouselDotsProps = {
    total: number
    curItem: number
    showSwipeTooltip?: boolean
}

const MAX_DOTS = 8
const ALL_DOTS_THRESHOLD = 10
const OVERFLOW_DOT_COUNT = 2
const DOT_SLOT_REM = 1 // 0.5rem slot width + 0.5rem gap

// Positions within the window where the active dot sits without triggering a scroll.
// Outside this range the window shifts to keep the active dot inside it.
const INNER_LEFT = OVERFLOW_DOT_COUNT // position 2
const INNER_RIGHT = MAX_DOTS - OVERFLOW_DOT_COUNT - 1 // position 5

export const DOT_ACTIVE = 'CarouselDots__dot--active'
export const DOT_OVERFLOW_NEAR = 'CarouselDots__dot--overflow-near'
export const DOT_OVERFLOW_FAR = 'CarouselDots__dot--overflow-far'

export const getDotModifier = (
    index: number,
    curItem: number,
    windowStart: number,
    total: number,
    isScrolling: boolean,
): string | null => {
    if (index === curItem) return DOT_ACTIVE
    if (!isScrolling) return null

    const pos = index - windowStart
    if (pos < 0 || pos >= MAX_DOTS) return null

    const hasLeftOverflow = windowStart > 0
    const hasRightOverflow = windowStart + MAX_DOTS < total

    if (hasLeftOverflow && pos < INNER_LEFT) {
        return pos === INNER_LEFT - 1 ? DOT_OVERFLOW_NEAR : DOT_OVERFLOW_FAR
    }
    if (hasRightOverflow && pos > INNER_RIGHT) {
        return pos === INNER_RIGHT + 1 ? DOT_OVERFLOW_NEAR : DOT_OVERFLOW_FAR
    }

    return null
}

// Dot strip indicator: shows all dots when total ≤ 10, otherwise a sliding 8-dot window
// with progressively smaller overflow dots at each edge where more items exist.
const CarouselDots = ({ total, curItem, showSwipeTooltip }: CarouselDotsProps) => {
    const { t } = useTranslation('find-my-fit')
    const isScrolling = total > ALL_DOTS_THRESHOLD

    // windowStart is the index of the first dot in the visible 8-dot window.
    // It only shifts when curItem enters one of the 2 overflow positions at either edge,
    // keeping the active dot within the inner zone (positions 2–5) during normal navigation.
    // At the list boundaries the active dot naturally drifts into the overflow positions.
    const [windowStart, setWindowStart] = useState(() => {
        if (total <= ALL_DOTS_THRESHOLD) return 0
        return Math.max(0, Math.min(curItem - INNER_LEFT, total - MAX_DOTS))
    })

    useEffect(() => {
        if (total <= ALL_DOTS_THRESHOLD) {
            setWindowStart(0)
            return
        }
        setWindowStart((prev) => {
            const pos = curItem - prev // active dot's position within the current window
            if (pos < INNER_LEFT) return Math.max(0, curItem - INNER_LEFT)
            if (pos > INNER_RIGHT) return Math.min(total - MAX_DOTS, curItem - INNER_RIGHT)
            return prev
        })
    }, [curItem, total])

    return (
        <div className="CarouselDots">
            <Tooltip
                describedById="swipe-tooltip"
                title={t('find-my-fit.viewer.swipeForMore')}
                hide={!showSwipeTooltip}
                place="top"
            >
                <div className="CarouselDots__container" id="swipe-tooltip">
                    <div className="CarouselDots__dot-indicators">
                        <div
                            className={classNames('CarouselDots__dot-clip', {
                                'CarouselDots__dot-clip--scrolling': isScrolling,
                            })}
                        >
                            <div
                                className="CarouselDots__dot-strip"
                                style={{ '--dot-strip-offset': `-${windowStart * DOT_SLOT_REM}rem` } as React.CSSProperties}
                            >
                                {Array.from({ length: total }, (_, i) => (
                                    <span
                                        key={i}
                                        className="CarouselDots__dot-slot"
                                        aria-label={t('find-my-fit.viewer.goToImage', { index: i + 1 })}
                                    >
                                        <span
                                            data-testid="carousel-dot"
                                            className={classNames('CarouselDots__dot', getDotModifier(i, curItem, windowStart, total, isScrolling))}
                                        />
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="CarouselDots__counter">
                        <span className="CarouselDots__counter-text">
                            {curItem + 1}
                            <span className="CarouselDots__counter-separator">/</span>
                            {total}
                        </span>
                    </div>
                </div>
            </Tooltip>
        </div>
    )
}

export default CarouselDots
