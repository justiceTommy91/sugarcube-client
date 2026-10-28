import React, { useCallback, useEffect, useRef, useState } from 'react'
import { NOTIFY_SCENE_ITEM_UPDATE, SceneItemUpdateNotification } from 'Renderer/geomviewer'
import { getGrandCentral } from 'Renderer/GrandCentral'
import Icon from 'components/uiElements/Icon'
import { NotificationInfo } from 'Renderer/NotificationDispatcher'
import classNames from 'classnames'

require('./PlacementIndicator.scss')

export const PlacementIndicator = () => {
    // Using a ref instead of state for speeed
    const indicatorRef = useRef<HTMLDivElement>(null)
    const [isVisible, setIsVisible] = useState(false)

    const onSceneItemUpdate = useCallback((notification: NotificationInfo) => {
        const { payload } = notification as SceneItemUpdateNotification

        if (payload.stateInfo === 'GhostGeometry') {
            const { corners } = payload.itemData

            if (corners) {
                const x = ((corners[0] + corners[1]) / 2) * 100
                const y = corners[3] * 100

                if (indicatorRef.current) {
                    indicatorRef.current.style.left = `${x}%`
                    indicatorRef.current.style.bottom = `${y}%`
                    setIsVisible(true)
                }
            }
        } else if (payload.stateInfo === 'HoverEnd' || payload.stateInfo === 'EndPlacementModeWithItem') {
            setIsVisible(false)
        }
    }, [])

    useEffect(() => {
        getGrandCentral().addObserver(NOTIFY_SCENE_ITEM_UPDATE, onSceneItemUpdate)

        return () => {
            getGrandCentral().removeObserver(onSceneItemUpdate)
        }
    }, [onSceneItemUpdate])

    return (
        <div className={classNames('PlacementIndicator', { isVisible })} ref={indicatorRef}>
            <Icon code="location_pointer" svg />
        </div>
    )
}

export default PlacementIndicator
