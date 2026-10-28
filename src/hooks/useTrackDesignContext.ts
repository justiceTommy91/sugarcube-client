import { useEffect } from 'react'
import { setActiveDesignContext, clearActiveDesignUuids } from 'utils/tracker'
import { getSourceTypeLabel } from 'models/scenes/utils'
import type { Composition } from 'models/compositions'

/**
 * Tracks the active design context for Google Analytics.
 * Sets the scene UUID, composition UUID, and room source type when the composition loads,
 * and clears them on unmount.
 */
export const useTrackDesignContext = (composition: Composition | undefined) => {
    useEffect(() => {
        if (composition?.scene?.sceneId) {
            const roomSourceType = composition.scene ? getSourceTypeLabel(composition.scene) : null
            setActiveDesignContext(composition.scene.sceneId, composition.uuid || null, roomSourceType)
        }

        return () => {
            clearActiveDesignUuids()
        }
    }, [composition?.scene?.sceneId, composition?.uuid, composition?.scene?.sourceType])
}
