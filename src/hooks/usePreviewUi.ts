import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'
import * as Sentry from '@sentry/react'
import { PlacingBehavior } from 'Renderer/geomviewer'

import { getRenderItemById } from 'models/compositions/selectors'
import { RenderItemComplete } from 'models/compositions'

import { isClient } from 'utils/environment'

import { useAppSelector } from './useAppSelector'

const ROTATE_MARGIN = 40
const BELOW_ITEM_GAP = 16

/**
 * Calculate the bounding rect of a {@link RenderItem} in camera space.
 */
const renderItemCameraExtents = (renderItem: RenderItemComplete) => {
    const [topLeft, , bottomRight] = renderItem.rootCorners
    const [x0, y0] = topLeft
    const [x1, y1] = bottomRight
    const logicalWidth = x1 - x0
    const logicalHeight = y1 - y0
    return new DOMRectReadOnly(x0, y0, logicalWidth, logicalHeight)
}

/**
 * Project a rectangle in normalized camera-space coordinates (coordinates between 0 and 1 which represent a percentage
 * of the 2D camera screen projection) into pixel coordinates in the browser viewport relative to the Preview area.
 *
 * ```
 *           Camera-space                     Browser Viewport
 * ┌───────┬─────────────────────┐    ┌───────┬─────────────────────┐   ┬
 * │       │                     │    │       │                     │   │
 * │       ├─────────────────────┤    │       ├─────────────────────┤   y px
 * │       │(0,0)           (1,0)│    │       │(0,0)           (w,0)│   │
 * │       │  ┌───────────────┐  │    │       │  ┌───────────────┐  │ ┬ ┴
 * │       │  │***************│  │    │       │  │***************│  │ │
 * │       │  │*** Preview ***│  │    │       │  │*** Preview ***│  │ h px
 * │       │  │***************│  │    │       │  │***************│  │ │
 * │       │  └───────────────┘  │    │       │  └───────────────┘  │ ┴
 * │       │(0,1)           (1,1)│    │       │(0,h)           (w,h)│
 * └───────┴─────────────────────┘    └───────┴─────────────────────┘
 *                                               ├───── w px ────┤
 *                                    ├── x px ──┤
 * ```
 *
 * Several properties of {@link RenderItem} are defined in normalized camera-space coordinates, including
 * {@link RenderItem.corners}, and this allows us to project those coordinates into the browser viewport for
 * positioning with CSS.
 *
 * Thus, a normalized camera-space coordinate of (0, 0) would represent a position at the top-left of the camera
 * projection, and through this method will be projected to a point at the top-left of the Preview area with
 * coordinates (0px, 0px), while a normalized camera coordinate of (0.5, 0.5) would represent a position at the center
 * of the camrea projection and thus would be projected to a point at (w/2 px, y/2 px).
 */
const projectToViewport = (offsetParent: Element, renderItem: RenderItemComplete) => {
    const cameraExtents = renderItemCameraExtents(renderItem)
    const previewExtents = offsetParent.getBoundingClientRect()

    const projection = new DOMRect(
        cameraExtents.x * previewExtents.width,
        cameraExtents.y * previewExtents.height,
        cameraExtents.width * previewExtents.width,
        cameraExtents.height * previewExtents.height,
    )
    return projection
}

/**
 * Clamp a DOMRect to the extents of the preview area, preventing it from overflowing or clipping.
 */
const clampToExtents = (offsetParent: Element, rect: DOMRectReadOnly) => {
    const newRect = new DOMRect(rect.x, rect.y, rect.width, rect.height)
    const previewExtents = offsetParent.getBoundingClientRect()

    // Clamp UI elements to the horizontal extents of the canvas, centering it in the preview area if it
    // cannot fit in the preview area's width.
    if (newRect.width > previewExtents.width) {
        newRect.x = previewExtents.width / 2 - newRect.width / 2
    } else if (newRect.left < 0) {
        newRect.x = 0
    } else if (newRect.right > previewExtents.width) {
        newRect.x = previewExtents.width - newRect.width
    }

    // Clamp UI elements to the vertical extents of the canvas, centering it in the preview area if it cannot
    // fit in the preview area's height.
    if (newRect.height > previewExtents.height) {
        newRect.y = previewExtents.height / 2 - newRect.height / 2
    } else if (newRect.top < 0) {
        newRect.y = 0
    } else if (newRect.bottom > previewExtents.height) {
        newRect.y = previewExtents.height - newRect.height
    }

    return newRect
}

export type UsePreviewUiResult = {
    register: <Elem extends HTMLElement>(elem: Elem | null) => void
}

export type UsePreviewUiArgs = {
    furnitureId: number
    toolbarRef: RefObject<HTMLDivElement | null>
    subSelectRef?: RefObject<HTMLDivElement | null>
}

/**
 * Position a UI element over a render item (furniture) in the scene Preview.
 *
 * To position the UI element over the render item pass a reference to the element into the `register` function. The
 * easiest way to do this is to simply pass `regiser` to the element's `ref` prop.
 *
 * @note The element to position MUST be rendered inside of the .Preview element and have no other offset parent to be
 * correctly positioned
 *
 * @example
 *
 * const UiComponent = () => {
 *   const ui = usePreviewUi({ furnitureId: '...' })
 *   return (
 *     <div ref={ui.register}>
 *       // ...
 *     </div>
 *   )
 * }
 */
export const usePreviewUi = ({ furnitureId, toolbarRef, subSelectRef }: UsePreviewUiArgs): UsePreviewUiResult => {
    const renderItem = useAppSelector((state) => getRenderItemById(state, furnitureId))
    const [uiElement, setUiElement] = useState<HTMLElement | null>(null)

    const renderItemPosition = renderItem?.p3
    const reposition = useCallback(() => {
        if (!uiElement) {
            return
        }

        if (!renderItem) {
            Sentry.captureMessage(
                `no render item with id ${furnitureId} was found in store, cannot position Preview UI element`,
            )
            return
        }

        const { offsetParent } = uiElement
        if (!offsetParent) {
            Sentry.captureMessage(`ui element did not have a valid offset parent`)
            return
        }

        // Position the Preview UI element over the top of the furniture item.
        const renderItemExtents = projectToViewport(offsetParent, renderItem)
        const previewExtents = offsetParent.getBoundingClientRect()
        let elemExents = uiElement.getBoundingClientRect()
        const renderItemCenterX = renderItemExtents.left + renderItemExtents.width / 2
        elemExents.x = renderItemCenterX - elemExents.width / 2
        elemExents.y = renderItemExtents.top - elemExents.height

        // If the Preview UI element cannot fit inside the Preview area in it's preferred position, clamp it to
        // the extents of the Preview area by offsetting it.
        elemExents = clampToExtents(offsetParent, elemExents)

        // If the RenderItem's top position (renderItemExtents.top) is less than the toolbar's height
        // (elemExents.height), adjust the toolbar's Y position to align with the bottom of the RenderItem.
        // It also removes the extra margin for Child elements to avoid toolbar to be very far from the item.
        // This prevents clipping or rendering outside the viewport.
        const canRotateRenderItem =
            renderItem.placingBehavior === PlacingBehavior.ON_FLOOR && !renderItem.isCombinableChild

        // Account for a sub-select element absolutely positioned above the UI element.
        // When the panel is below the furniture we must push it down far enough so the
        // sub-select doesn't cover the furniture.
        const subSelect = subSelectRef?.current ?? null
        let subSelectOverflow = 0
        if (subSelect) {
            const panelTop = uiElement.getBoundingClientRect().top
            const subSelectTop = subSelect.getBoundingClientRect().top
            subSelectOverflow = Math.max(0, panelTop - subSelectTop)
        }

        if (renderItemExtents.top < elemExents.height + subSelectOverflow) {
            elemExents.y = canRotateRenderItem
                ? renderItemExtents.bottom + BELOW_ITEM_GAP + subSelectOverflow
                : renderItemExtents.bottom + BELOW_ITEM_GAP + subSelectOverflow - ROTATE_MARGIN
        }

        // Keep the action panel from being pushed behind the footer toolbar (DesignToolbar).
        // On small screens the fixed ROTATE_MARGIN alone is insufficient, so we dynamically
        // compute the available height by checking where the toolbar actually starts.
        // We blend 50/50 between the preview bounds and the toolbar-aware bounds so the
        // panel doesn't jump too far above its natural position.
        const toolbar = toolbarRef.current
        let availableHeight = previewExtents.height
        if (toolbar) {
            const toolbarTop = toolbar.getBoundingClientRect().top
            const toolbarAwareHeight = Math.min(previewExtents.height, toolbarTop - previewExtents.top)
            availableHeight = (previewExtents.height + toolbarAwareHeight) / 2
        }
        if (elemExents.y + elemExents.height > availableHeight - ROTATE_MARGIN) {
            elemExents.y = Math.max(0, availableHeight - elemExents.height + BELOW_ITEM_GAP)
        }
        /* eslint-disable i18next/no-literal-string, no-param-reassign */
        uiElement.style.position = 'absolute'
        uiElement.style.top = '0'
        uiElement.style.left = '0'
        uiElement.style.transform = `translate(${elemExents.x}px, ${elemExents.y}px)`
        /* eslint-enable i18next/no-literal-string, no-param-reassign */
    }, [
        // NOTE: only re-position the UI element when the render item's position changes to avoid issue with the 2d
        //  projection of the render item changing while rotating due to asymmetry along the axis of rotation,
        //  resulting in the UI element repositioning slightly when the render item is rotated.
        JSON.stringify(renderItemPosition),
        uiElement,
    ])

    useLayoutEffect(() => {
        if (!isClient) {
            return undefined
        }

        window.addEventListener('resize', reposition)
        return () => {
            window.removeEventListener('resize', reposition)
        }
    }, [reposition])

    useEffect(reposition, [reposition])

    return {
        register: setUiElement,
    }
}
