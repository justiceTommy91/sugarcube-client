import React, { useRef, useEffect, useState } from 'react'
import { arrayOf, element } from 'prop-types'
import classNames from 'classnames'

import Icon from 'components/uiElements/Icon'

require('./Carousel.scss')

const Carousel = ({ children }) => {
    const ref = useRef(null)
    const [barWidth, setBarWidth] = useState(0)
    const [barPosition, setBarPosition] = useState(0)
    const [scrollOrigin, setScrollOrigin] = useState(null)
    const [dragging, setDragging] = useState(false)

    const updateBarPosition = () => {
        setBarPosition((ref.current.scrollLeft / ref.current.scrollWidth) * 100)
    }

    const onScrollStart = (e) => {
        setScrollOrigin(e.clientX)
        setDragging(true)
    }
    const onScrollEnd = () => {
        if (dragging) {
            setDragging(false)
            setScrollOrigin(null)
        }
    }
    const onDragScroll = (e) => {
        // console.debug(e)
        // console.debug(scrollOrigin, dragging)
        if (ref.current && dragging && scrollOrigin) {
            const dragAmt = e.clientX - scrollOrigin
            ref.current.scrollLeft += dragAmt * (ref.current.scrollWidth / ref.current.offsetWidth)
            setScrollOrigin(e.clientX)
            updateBarPosition()
        }
    }

    useEffect(() => {
        if (ref.current) {
            ref.current.scrollLeft = 0
            setBarWidth((ref.current.offsetWidth / ref.current.scrollWidth) * 100)
            updateBarPosition()
        }
    }, [children])

    useEffect(() => {
        if (dragging) {
            window.addEventListener('mouseup', onScrollEnd)
            window.addEventListener('mousemove', onDragScroll)
        }

        return () => {
            window.removeEventListener('mouseup', onScrollEnd)
            window.removeEventListener('mousemove', onDragScroll)
        }
    }, [onScrollEnd, onScrollStart, dragging])

    if (!children || !children.length) {
        return null
    }

    const getItemWidth = () => {
        const margin = parseInt(window.getComputedStyle(ref.current.firstChild).marginRight, 10)
        return ref.current.firstChild.offsetWidth + margin
    }

    const scroll = (left) => {
        if (ref.current) {
            let itemWidth = getItemWidth()
            if (left) {
                itemWidth *= -1
            }
            ref.current.scrollLeft += itemWidth
            updateBarPosition()
        }
    }
    const isScrollAtBeginning = barPosition === 0
    const isScrollAtEnd =
        ref && ref.current ? ref.current.scrollWidth === ref.current.scrollLeft + ref.current.clientWidth : false

    const showScrollBar = barWidth !== 100

    return (
        <div className={classNames('Carousel', { dragging })}>
            <div className="carouselWrapper">
                {!isScrollAtBeginning && (
                    <button className="carrow left" onClick={() => scroll(true)}>
                        <Icon code="chevron_left" svg />
                    </button>
                )}
                <div className="carouselContent" ref={ref}>
                    {children}
                </div>
                {!isScrollAtEnd && (
                    <button className="carrow right" onClick={() => scroll(false)}>
                        <Icon code="chevron_right" svg />
                    </button>
                )}
            </div>
            {showScrollBar && (
                <div className="carouselScrollContainer">
                    <div className="scrollBar">
                        <div
                            className="scrollHandle"
                            style={{ width: `${barWidth}%`, left: `${barPosition}%` }}
                            onMouseDown={onScrollStart}
                            draggable={false}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

Carousel.defaultProps = {
    children: null,
}

Carousel.propTypes = {
    children: arrayOf(element),
}

export default Carousel
