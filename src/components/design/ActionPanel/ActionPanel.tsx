/* eslint-disable i18next/no-literal-string */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import Image from '@ingka/image'

import { convertRadToDeg, convertDegToRad } from 'utils/convertRotation'

import { scrollSwapMenu, setWalkedToId, setZoomLevel, showSwapMenuForId } from 'models/ui/actions'
import { selectCompositionRenderItem } from 'models/compositions/actions'
import { getSelectedRenderItemId } from 'models/compositions/selectors'
import * as furnitureSelectors from 'models/furniture/selectors'
import { useAppDispatch, useAppSelector } from 'hooks'
import { usePreviewUi } from 'hooks/usePreviewUi'
import { useDesignToolbarContext } from 'components/DesignToolbar/DesignToolbarContext'
import { useHoverIntent } from 'hooks/useHoverIntent'
import SSRIcon from '@ingka/ssr-icon'
import rotateIcon from '@ingka/ssr-icon/paths/rotate'
import shoppingBagAdd from '@ingka/ssr-icon/paths/shopping-bag-add'
import arrowLeftArrowRight from '@ingka/ssr-icon/paths/arrow-left-arrow-right'
import trashCan from '@ingka/ssr-icon/paths/trash-can'
import copy from '@ingka/ssr-icon/paths/copy'
import flipHorizontal from '@ingka/ssr-icon/paths/flip-horizontal'
import furnitureSet from '@ingka/ssr-icon/paths/furniture-set'
import checkmarkIcon from '@ingka/ssr-icon/paths/checkmark'
import { rotate90 } from 'icons/rotate-90'
import { cubeUp } from 'icons/cube-up'
import { useShoppingBag, AddToBagSource } from 'features/shopping-bag'

import { getSelectedFurnitureHasGoesWithProducts } from 'models/furniture/selectors'

import { trackSubCategoryClick } from 'utils/tracker'

import { GeomViewer } from 'Renderer/geomviewer'
import { ZOOM_DEFAULT } from 'models/ui/constants'
import { useStore } from 'react-redux'
import { RelatedProductType, useDesignSidebarContext } from '../DesignSidepanelContext'

import { ActionPanelButton } from './ActionPanelButton'
import { RotateSlider } from './RotateSlider'

require('./ActionPanel.scss')

const MAX_TEXT_WIDTH_BUTTON = 10

type ActionPanelProps = {
    furnitureId: number
    productId: number
    onDelete: () => void
    onRotateStart: () => void
    // can be undefined in CompositionArtItem or null in CompositionFurnitureItem when furniture is a combinable or not placed on the floor
    onRotate?: ((heading: number | ((heading: number) => void)) => void) | null | undefined
    onRotateFinish: () => void
    heading: number
    onAddToCart: (() => void) | null
    onDuplicate: () => void
    onMirror?: () => void
    onChangeSurface: () => void
    localItemNumber: string
    toNextSnapRotation: (arg0: boolean) => void
    showGoesWithTab: (showGoesWith: boolean) => void
    showRotateByDefault: boolean
    isDragging?: boolean
    selectableChildren:
        | {
              onSelect: () => void
              thumbUrl: string
              id: number
              isSelected: boolean
              subCategoryIds: []
          }[]
        | null
}

export const ActionPanel = ({
    furnitureId,
    productId,
    onDelete,
    onRotateStart,
    onRotate,
    onRotateFinish,
    heading,
    onAddToCart,
    onDuplicate,
    onMirror,
    onChangeSurface,
    toNextSnapRotation,
    showGoesWithTab,
    showRotateByDefault,
    selectableChildren,
    isDragging,
}: ActionPanelProps) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()

    const shouldShowGoesWith = useAppSelector(getSelectedFurnitureHasGoesWithProducts)
    const selectedRenderItemId = useAppSelector(getSelectedRenderItemId)
    const swapAnchorId = useAppSelector(furnitureSelectors.getSwapAnchorId)
    const [trackedIds, setTrackedIds] = useState<number[]>([])
    const { isAddingProductToBag, isProductAdded } = useShoppingBag()

    const spacer = () => ''
    const addThirdSection = () => toNextSnapRotation !== null || onChangeSurface !== null || onMirror !== null

    const ensureItemSelected = () => {
        // Ensure the current furniture item is selected when using Replace/Goes with buttons post save as flow
        if (swapAnchorId === -1 && productId && selectedRenderItemId) {
            dispatch(selectCompositionRenderItem(furnitureId))
            dispatch(showSwapMenuForId(true, productId))
        }
    }

    const onSwap = () => {}
    const callbacks = [
        onAddToCart,
        onAddToCart ? spacer : null,
        onRotate,
        onSwap,
        showGoesWithTab,
        onDuplicate,
        onDelete,
        addThirdSection() ? spacer : null,
        onMirror,
        toNextSnapRotation,
        onChangeSurface,
    ].filter((callback) => !!callback)

    const actionButtons = new Map()

    const [isRotateControlVisible, setIsRotateControlVisible] = useState(!!(showRotateByDefault && onRotate))
    const showRotateControl = () => {
        setIsRotateControlVisible(true)
    }
    const hideRotateControl = () => {
        setIsRotateControlVisible(false)
    }

    const rotateRangeRef = useRef<HTMLInputElement>(null)
    const focusRotateSlider = () => {
        showRotateControl()
        // KLUDGE: we have to wait untilthe rotation controls are shown before we can focus the rotate input, which
        //  happens AFTER the next React update. We work around that issue here by scheduling a task for the subsequent
        //  frame.
        setTimeout(() => {
            rotateRangeRef.current?.focus()
        }, 0)
    }

    const rotateHoverIntent = useHoverIntent({
        onHover: onRotate ? showRotateControl : undefined,
        onExit: () => {
            // Avoid hiding the rotation controls when it is focused and the user mouses out.
            if (document.activeElement === rotateRangeRef.current) {
                return
            }
            hideRotateControl()
        },
    })

    if (onRotate != null) {
        actionButtons.set(onRotate, {
            onKeyDown: (event: React.KeyboardEvent) => {
                event.stopPropagation()
                event.preventDefault()
                const { key } = event
                if (key === 'Enter') {
                    focusRotateSlider()
                }
            },
            onPointerDown: (event: MouseEvent) => {
                // Ensure that clicking doesn't focus the button, otherwise clicking the button and clicking on anything else will trigger
                // onBlur and close the rotation slider even if the click was on the rotation slider itself.
                event.preventDefault()
            },
            onMouseEnter: rotateHoverIntent.intendsToHover,
            onMouseLeave: rotateHoverIntent.intendsToExit,
            onTouchStart: showRotateControl,
            onFocus: showRotateControl,
            onBlur: hideRotateControl,
            dataTip: t('design.rotate').length < MAX_TEXT_WIDTH_BUTTON ? null : t('design.rotate in place'),
            tabIndex: 0,
            ariaLabel: t('design.rotate in place'),
            dataTestId: 'rotateButton',
            icon: <SSRIcon paths={rotateIcon} />,
            text: t('design.rotate'),
            className: classNames({ active: isRotateControlVisible }),
        })
    }

    actionButtons.set(toNextSnapRotation, {
        onClick: () => {
            hideRotateControl()
            toNextSnapRotation(true)
        },
        dataTip: t('design.flip').length < MAX_TEXT_WIDTH_BUTTON ? null : t('design.choose orientation'),
        tabIndex: 0,
        ariaLabel: t('design.choose orientation'),
        icon: <SSRIcon paths={rotate90} />,
        text: t('design.flip'),
    })

    if (onAddToCart) {
        const isAddingThisProduct = isAddingProductToBag(productId, AddToBagSource.ACTION_PANEL, furnitureId)
        const isThisProductAdded = isProductAdded(productId, AddToBagSource.ACTION_PANEL, furnitureId)
        actionButtons.set(onAddToCart, {
            onClick: () => {
                if (isThisProductAdded) {
                    return
                }
                hideRotateControl()
                onAddToCart()
            },
            dataTip: t('design.add to bag').length < 11 ? null : t('design.add to bag'),
            tabIndex: 0,
            ariaLabel: t('design.add to bag'),
            icon: isThisProductAdded ? (
                <SSRIcon paths={checkmarkIcon} />
            ) : isAddingThisProduct ? undefined : (
                <SSRIcon paths={shoppingBagAdd} />
            ),
            text: isThisProductAdded ? t('design.added') : isAddingThisProduct ? '' : t('design.add to bag'),
            loading: isAddingThisProduct,
        })
    }

    actionButtons.set(spacer, {
        spacer: true,
    })

    const { displayRelatedProducts } = useDesignSidebarContext()
    actionButtons.set(onSwap, {
        onClick: () => {
            hideRotateControl()
            ensureItemSelected()

            displayRelatedProducts(RelatedProductType.SWAP)

            dispatch(scrollSwapMenu({ eventName: 'DecorateRoom.AccessSwapPane', AccessFrom: 'ActionPanel' }))
            // Second param of the showGoesWithTab action, trackingInfo, is not provided here and defaults to null.
            // No tracking event is fired here.
            dispatch(showGoesWithTab(false))
        },
        dataTip: t('design.replace').length < MAX_TEXT_WIDTH_BUTTON ? null : t('tooltip.swap product with'),
        tabIndex: 0,
        ariaLabel: t('tooltip.swap product with'),
        icon: <SSRIcon paths={arrowLeftArrowRight} />,
        text: t('design.replace'),
    })

    actionButtons.set(showGoesWithTab, {
        onClick: () => {
            hideRotateControl()
            ensureItemSelected()

            displayRelatedProducts(RelatedProductType.GOES_WELL_WITH)

            dispatch(scrollSwapMenu({ eventName: 'DecorateRoom.AccessGoesWellWithPane', AccessFrom: 'ActionPanel' }))
            // Second param of the showGoesWithTab action, trackingInfo, is not provided here and defaults to null.
            // No tracking event is fired here.
            dispatch(showGoesWithTab(true))
        },
        dataTip: t('design.goes with').length < MAX_TEXT_WIDTH_BUTTON ? null : t('tooltip.goes with product'),
        tabIndex: 0,
        ariaLabel: t('tooltip.goes with product'),
        icon: <SSRIcon paths={furnitureSet} />,
        text: t('design.goes with'),
        disabled: !shouldShowGoesWith,
    })

    actionButtons.set(onChangeSurface, {
        onClick: () => {
            hideRotateControl()
            onChangeSurface()
        },
        dataTip: t('design.lift').length < MAX_TEXT_WIDTH_BUTTON ? null : t('design.change surface'),
        tabIndex: 0,
        ariaLabel: t('design.change surface'),
        icon: <SSRIcon paths={cubeUp} />,
        text: t('design.lift'),
    })

    actionButtons.set(onDelete, {
        onClick: () => {
            hideRotateControl()
            onDelete()
        },
        dataTip: t('design.delete').length < MAX_TEXT_WIDTH_BUTTON ? null : t('design.remove from design'),
        tabIndex: 0,
        ariaLabel: t('design.remove from design'),
        icon: <SSRIcon paths={trashCan} />,
        text: t('design.delete'),
    })

    actionButtons.set(onDuplicate, {
        onClick: () => {
            hideRotateControl()
            onDuplicate()
        },
        dataTip: t('design.make copy').length < MAX_TEXT_WIDTH_BUTTON ? null : t('design.make copy'),
        icon: <SSRIcon paths={copy} />,
        text: t('design.make copy'),
    })

    if (onMirror) {
        actionButtons.set(onMirror, {
            onClick: () => onMirror(),
            dataTip: t('design.mirror').length < MAX_TEXT_WIDTH_BUTTON ? null : t('design.mirror'),
            icon: <SSRIcon paths={flipHorizontal} />,
            text: t('design.mirror'),
        })
    }

    const { toolbarRef } = useDesignToolbarContext()
    const subSelectRef = useRef<HTMLDivElement>(null)
    const previewUi = usePreviewUi({ furnitureId, toolbarRef, subSelectRef })

    useLayoutEffect(() => {
        const newIdsToTrack =
            selectableChildren?.filter((child) => child.isSelected && !trackedIds.includes(child.id)) || []

        if (newIdsToTrack.length) {
            newIdsToTrack.forEach((child) => {
                trackSubCategoryClick(child.subCategoryIds)
            })

            setTrackedIds((prev) => [...prev, ...newIdsToTrack.map((child) => child.id)])
        }
    }, [selectableChildren, trackedIds])

    const store = useStore()
    useEffect(
        () => () => {
            if (isDragging) return

            const latestSelectedId = getSelectedRenderItemId(store.getState())
            if (latestSelectedId != null && latestSelectedId !== furnitureId) return
            GeomViewer.bindings?.setCameraMode({ mode: `default` })
            dispatch(setZoomLevel(ZOOM_DEFAULT))
            dispatch(setWalkedToId(null))
        },
        [isDragging],
    )

    return (
        <div
            ref={previewUi.register}
            className="ActionPanel"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
        >
            {selectableChildren?.length && selectableChildren.length > 1 && !isRotateControlVisible && (
                <div ref={subSelectRef} className="actionPanelSubSelect">
                    {selectableChildren.map((child) => (
                        <button
                            tabIndex={0}
                            key={child.id}
                            className={classNames('actionPanelChild', { isSelected: child.isSelected })}
                            onClick={child.onSelect}
                        >
                            <Image className="childThumb" src={child.thumbUrl} alt="" />
                        </button>
                    ))}
                </div>
            )}
            <div className={classNames('actionPanelButtons', { active: isRotateControlVisible })}>
                {callbacks.map((callback, index) => {
                    const buttonProps = { ...actionButtons.get(callback) }
                    if (buttonProps.spacer === true) {
                        // eslint-disable-next-line react/no-array-index-key
                        return <div key={`spacer-${index}`} className="spacer" />
                    }
                    return <ActionPanelButton {...buttonProps} key={buttonProps.text} />
                })}
            </div>
            <div className="actionPanelContent">
                <div
                    onMouseMove={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onPointerMove={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onMouseEnter={rotateHoverIntent.intendsToHover}
                    onMouseLeave={rotateHoverIntent.intendsToExit}
                    className={classNames('rotateContainer', { rotateContainer_visible: isRotateControlVisible })}
                >
                    <RotateSlider
                        ref={rotateRangeRef}
                        onChange={(h: number) => {
                            // Convert to radians for the renderer/data model
                            onRotate?.(convertDegToRad(h))
                        }}
                        onPointerDown={onRotateStart}
                        onPointerUp={onRotateFinish}
                        initialHeading={Math.round(convertRadToDeg(heading))}
                    />
                </div>
            </div>
        </div>
    )
}
