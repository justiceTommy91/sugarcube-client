import React, { useCallback, useEffect, useRef, useState } from 'react'
import { NOTIFY_VIEWER_STATE_UPDATE, ViewerStateUpdateNotification } from 'Renderer/geomviewer'

import classNames from 'classnames'
import { TrackingInfo } from 'models/compositions/actions'
import { getGrandCentral } from 'Renderer/GrandCentral'
import { NotificationInfo } from 'Renderer/NotificationDispatcher'
import { useAppDispatch, useAppSelector, useOutsideAlerter } from 'hooks'
import { getShouldShowColorPicker } from 'models/ui/selectors'
import { showColorPicker } from 'models/ui/actions'

require('./ColorPicker.scss')

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

export type ColorPickerProps = {
    planeIndices?: number[]
    planeIndicesInpaint?: number[]
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
    swatchesList: number[][]
}

const ColorPicker = ({
    planeIndices,
    planeIndicesInpaint,
    color,
    setColor,
    compositionId,
    wallMarker,
    colorsList,
    swatchesList,
}: ColorPickerProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const pickerRef = useRef<HTMLDivElement>(null)
    const [helaPlaneIndices, setHelaPlaneIndices] = useState<number[]>([])
    const shouldShowColorPicker = useAppSelector(getShouldShowColorPicker)
    const dispatch = useAppDispatch()

    const updateWallPlanes = useCallback((info: NotificationInfo) => {
        const state = info as ViewerStateUpdateNotification
        if (state.payload?.stateInfo === 'WallPolygonsReady') {
            const polygons = state.payload.wallPolygonsInfo.plane_polygons
            setHelaPlaneIndices(polygons.filter((poly) => poly.class === 'wall').map((wall) => wall.id))
        }
    }, [])
    // Listen to hela rooms parsing the wall data.
    useEffect(() => {
        // Register callback.
        const dispatcher = getGrandCentral()
        dispatcher.addObserver(NOTIFY_VIEWER_STATE_UPDATE, updateWallPlanes)
        return () => {
            // Unregister.
            dispatcher.removeObserver(updateWallPlanes)
        }
    }, [updateWallPlanes])

    useOutsideAlerter({
        ref: containerRef,
        onClickOutside: () => {
            dispatch(showColorPicker(false))
        },
    })

    if (!Array.isArray(colorsList) || colorsList.length === 0 || !Array.isArray(wallMarker) || wallMarker.length < 2) {
        return null
    }

    const setColorWrapped = (colorString: string | null) => {
        const timestamp = Date.now() // For analytics to sync the individual events
        ;(planeIndices || helaPlaneIndices || []).forEach((planeIndex, i) => {
            setColor(compositionId, planeIndex, planeIndicesInpaint?.[i] || -1, colorString, { timestamp })
        })
    }

    const colors: Array<string | null> = []
    const uiColors: Array<string | null> = []
    const colorBrightness: { [key: string]: number } = {}
    colorsList.forEach((rgb, i) => {
        const hex = rgbArrayToHex(rgb)
        colors.push(hex)
        const uihex = rgbArrayToHex(swatchesList[i])
        uiColors.push(uihex)
        colorBrightness[uihex] = rbgToBrightness(swatchesList[i])
    })

    // Option to unset the color
    colors.unshift(null)
    uiColors.unshift(null)

    const colorOptions = uiColors.map((colorOpt, i) => {
        const viewportColor = colors[i]
        const selected = viewportColor === color
        const brightness = colorOpt ? colorBrightness[colorOpt] : 0
        const checkmarkColor = brightness > 192 ? '#111' : `white`

        return (
            <div
                key={colorOpt}
                className={classNames('colorPick')}
                onClick={(e) => {
                    e.stopPropagation()
                    setColorWrapped(viewportColor)
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
        <div className={classNames('ColorPicker', { visible: shouldShowColorPicker })} ref={containerRef}>
            <div className="pickerContainer">
                <div className="pickerRoot" ref={pickerRef}>
                    {colorOptions}
                </div>
            </div>
        </div>
    )
}

export default ColorPicker
