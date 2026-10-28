import React, { useEffect, useRef, useState, useCallback } from 'react'
import { GeomViewer } from 'Renderer/geomviewer'

import { useSugarcubeContext } from 'apps/SugarcubeContext'

import classNames from 'classnames'
import { useAppSelector } from 'hooks'
import { TrackingInfo } from 'models/compositions/actions'
import * as uiSelectors from 'models/ui/selectors'

require('./WallPaintPin.scss')

const RIGHT_SIDE_BUFFER = 48 // Pixels - 3rem

const rgbArrayToHex = (color: Array<number>) =>
    `#${color
        .slice(0, 3)
        .map((channel) => {
            const hex = channel.toString(16)
            return hex.length === 1 ? `0${hex}` : hex
        })
        .join('')}`

// https://www.nbdtech.com/Blog/archive/2008/04/27/Calculating-the-Perceived-Brightness-of-a-Color.aspx
const rbgToBrightness = (colorOpt: Array<number>) =>
    colorOpt ? (colorOpt[0] * 299 + colorOpt[1] * 587 + colorOpt[2] * 114) / 1000 : 255

export type WallPaintPinProps = {
    planeIndices?: number[]
    planeIndicesInpaint?: number[]
    helaPlaneIndices?: number[]
    color: string | number | null
    setColor: (
        compositionId: string,
        planeIndex: number,
        planeIdxInpaint: number,
        colorString: string | null,
        trackingInfo: TrackingInfo,
    ) => void
    compositionId: string
    wallMarker: number[]
    colorsList: number[][]
    onPinInteract: (opening: boolean) => void
}

const WallPaintPin = ({
    planeIndices,
    planeIndicesInpaint,
    helaPlaneIndices,
    color,
    setColor,
    compositionId,
    wallMarker,
    colorsList,
    onPinInteract,
}: WallPaintPinProps) => {
    const { isMobile, isUpptacka } = useSugarcubeContext()
    const arePinsVisible = useAppSelector((state) => uiSelectors.getPinsVisibility(state))

    const containerRef = useRef<HTMLDivElement>(null)
    const pickerRef = useRef<HTMLDivElement>(null)
    const [renderLeft, setRenderLeft] = useState(false)

    const reposition = useCallback(() => {
        // Set renderLeft true if there isn't enough space for the
        // picker on the right of the dot
        const pickerWidth = pickerRef.current?.offsetWidth || 0
        const containerWidth = containerRef.current?.offsetWidth || 0
        const spaceRight = containerWidth * ((100 - wallMarker[0]) / 100)
        setRenderLeft(spaceRight <= pickerWidth + RIGHT_SIDE_BUFFER)
    }, [wallMarker])

    useEffect(() => {
        // assuming for now, that all walls are always of the same color
        GeomViewer.bindings?.setWallColor(color || undefined)
    }, [color])

    useEffect(reposition, [wallMarker])
    useEffect(() => {
        window.addEventListener('resize', reposition)
        return () => {
            window.removeEventListener('resize', reposition)
        }
    }, [wallMarker])

    if (!Array.isArray(colorsList) || colorsList.length === 0 || !Array.isArray(wallMarker) || wallMarker.length < 2) {
        return null
    }

    const setColorWrapped = (colorString: string | null) => {
        const timestamp = Date.now() // For analytics to sync the individual events
        ;(planeIndices || helaPlaneIndices || []).forEach((planeIndex, i) => {
            setColor(compositionId, planeIndex, planeIndicesInpaint?.[i] || -1, colorString, { timestamp })
        })
    }

    const dotStyle = {
        left: `${wallMarker[0]}%`,
        top: `${wallMarker[1]}%`,
    }

    const colors: Array<string | null> = []
    const colorBrightness: { [key: string]: number } = {}
    colorsList.forEach((rgb) => {
        const hex = rgbArrayToHex(rgb)
        colors.push(hex)
        colorBrightness[hex] = rbgToBrightness(rgb)
    })

    // Option to unset the color
    if (renderLeft) {
        if (colors.length >= 5) {
            colors.splice(5, 0, null)
        } else {
            colors.push(null)
        }
    } else {
        colors.unshift(null)
    }

    const colorOptions = colors.map((colorOpt) => {
        const selected = colorOpt === color
        const brightness = colorOpt ? colorBrightness[colorOpt] : 0
        const checkmarkColor = brightness > 192 ? '#111' : `white`

        return (
            <div
                key={colorOpt}
                className={classNames('colorPick')}
                onClick={(e) => {
                    e.stopPropagation()
                    setColorWrapped(colorOpt)
                }}
            >
                <div
                    className={classNames('colorSwatch', {
                        selected,
                        bright: colorOpt ? brightness > 225 : true,
                    })}
                    style={{ backgroundColor: colorOpt || 'white' }}
                />
                <div className={classNames('colorSelect', { selected, noColor: !colorOpt })} />
                {colorOpt && selected && (
                    <div className="colorCheckmark">
                        <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M10.5591 0.499969L12 1.96078L4.56365 9.49997L0 4.87322L1.44089 3.4124L4.56365 6.57835L10.5591 0.499969Z"
                                fill={checkmarkColor}
                            />
                        </svg>
                    </div>
                )}
                {!colorOpt && <div className="diagonal" />}
            </div>
        )
    })

    return (
        <div className="WallPaintPin" ref={containerRef}>
            <div
                // toggling pins visibility should only be possible for Upptacka currently
                className={classNames('dotWrapper', { mobile: isMobile, showPins: isUpptacka && arePinsVisible })}
                style={dotStyle}
                onMouseEnter={() => onPinInteract(true)}
                onMouseLeave={() => onPinInteract(false)}
            >
                <div className="outerDot" />
                <div className={classNames('pickerContainer', { renderLeft })}>
                    <div className="pickerRoot" ref={pickerRef}>
                        {colorOptions}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default WallPaintPin
