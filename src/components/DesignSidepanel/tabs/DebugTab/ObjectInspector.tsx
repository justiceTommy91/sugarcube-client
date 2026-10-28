/* eslint-disable i18next/no-literal-string */
import React, { useState, useEffect } from 'react'

import SSRIcon from '@ingka/ssr-icon'
import arrowLeftArrowRight from '@ingka/ssr-icon/paths/arrow-left-arrow-right'
import { useAppSelector } from 'hooks'

import { getSelectedRenderItem, getSelectedComposition } from 'models/compositions/selectors'

import { GeomViewer } from 'Renderer/geomviewer'

require('./Debug.scss')

const ObjectInspector = () => {
    const renderItem = useAppSelector(getSelectedRenderItem)
    const composition = useAppSelector(getSelectedComposition)

    const [xInput, setXInput] = useState(String(renderItem?.rawPlacement3d?.location3.localPos.x))
    const [yInput, setYInput] = useState(String(renderItem?.rawPlacement3d?.location3.localPos.y))
    const [zInput, setZInput] = useState(String(renderItem?.rawPlacement3d?.location3.localPos.z))

    useEffect(() => {
        setXInput(String(renderItem?.rawPlacement3d?.location3.localPos.x))
    }, [renderItem?.rawPlacement3d?.location3.localPos.x])
    useEffect(() => {
        setYInput(String(renderItem?.rawPlacement3d?.location3.localPos.y))
    }, [renderItem?.rawPlacement3d?.location3.localPos.y])
    useEffect(() => {
        setZInput(String(renderItem?.rawPlacement3d?.location3.localPos.z))
    }, [renderItem?.rawPlacement3d?.location3.localPos.z])

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        coordinate: 'x' | 'y' | 'z',
        updateState: (value: string) => void,
    ) => {
        const value = Number(e.target.value)
        updateState(e.target.value)
        if (!Number.isNaN(value)) {
            const position = {
                x: renderItem?.rawPlacement3d?.location3.localPos.x || 0.0,
                y: renderItem?.rawPlacement3d?.location3.localPos.y || 0.0,
                z: renderItem?.rawPlacement3d?.location3.localPos.z || 0.0,
            }
            position[coordinate] = value
            GeomViewer.bindings?.modifySceneItem(String(renderItem?.uniqueId), {
                inspectorParameters: { position },
            })
        }
    }

    const boundTo = renderItem?.rawPlacement3d?.location3.bindTo
    let surfaceClass = null
    const polys = composition?.scene?.manifest?.plane_polygon_0
    if (polys) {
        surfaceClass = polys.plane_polygons.find((plane) => String(plane.id) === boundTo)?.class || null
    }
    const boundToText = surfaceClass ? `${surfaceClass} (${boundTo})` : boundTo

    if (!renderItem || !composition) {
        return (
            <div className="switchRow">
                <p>(Select a furniture item)</p>
            </div>
        )
    }

    return (
        <>
            <div className="switchRow">
                <p>Position x: </p>
                <input
                    type="text"
                    value={xInput}
                    key="toCopy"
                    onChange={(e) => {
                        handleChange(e, 'x', setXInput)
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                />
            </div>
            <div className="switchRow">
                <p>Position y: </p>
                <input
                    type="text"
                    value={yInput}
                    key="toCopy"
                    onChange={(e) => {
                        handleChange(e, 'y', setYInput)
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                />
            </div>
            <div className="switchRow">
                <p>Position z: </p>
                <input
                    type="text"
                    value={zInput}
                    key="toCopy"
                    onChange={(e) => {
                        handleChange(e, 'z', setZInput)
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                />
            </div>
            <div className="switchRow">
                <p>Bound to: </p>
                <div className="rowContent">{boundToText}</div>
            </div>
            <div className="toolRow">
                <p>Re-attach to surface</p>
                <button
                    onClick={() =>
                        GeomViewer.bindings?.modifySceneItem(String(renderItem.uniqueId), {
                            inspectorParameters: { reattachToSurface: true },
                        })
                    }
                >
                    <SSRIcon paths={arrowLeftArrowRight} />
                </button>
            </div>
            <div className="toolRow">
                <p>Wallsnap push out</p>
                <button
                    onClick={() =>
                        GeomViewer.bindings?.modifySceneItem(String(renderItem.uniqueId), {
                            inspectorParameters: { wallSnapPushOut: true },
                        })
                    }
                >
                    <SSRIcon paths={arrowLeftArrowRight} />
                </button>
            </div>
        </>
    )
}

export default ObjectInspector
