import Button from '@ingka/button'
import classNames from 'classnames'
import { useAppDispatch, useAppSelector } from 'hooks'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { showChangeView } from 'models/ui/actions'
import { upptackaActions } from 'models/upptacka/slice'
import { getShouldShowChangeView } from 'models/ui/selectors'
import { getPreviewSettings } from 'models/preview/selectors'
import React, { useState, useEffect } from 'react'

import videoCamera from '@ingka/ssr-icon/paths/video-camera'
import { useTranslation } from 'react-i18next'
import Price from '@ingka/price'
import SSRIcon from '@ingka/ssr-icon'
import minus from '@ingka/ssr-icon/paths/minus'
import plus from '@ingka/ssr-icon/paths/plus'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right'
import { useTracker } from 'apps/TrackingBoundary'
import type { RenderItemComplete } from 'models/compositions'
import { saveUpptackaComposition } from 'models/compositions/actions'
import {
    getSelectedRenderItemId,
    getSelectedScene,
    getSelectedCompositionRenderedItemsNumeralPrice,
    getSelectedCompositionShoppableProductData,
} from 'models/compositions/selectors'
import { getLocale } from 'models/location/selectors'
import { allScenesAreStandard3D } from 'models/scenes/utils'
import {
    GA_ACTION_UPPTACKA_OPEN_SUMMARY_PANEL,
    GA_CATEGORY_DYH_SUGARCUBE,
    ACTION_UPPTACKA_OPEN_SUMMARY_PANEL,
} from 'models/tracking/constants'
import { GeomViewer, NOTIFY_VIEWER_STATE_UPDATE, ViewerStateUpdateNotification } from 'Renderer/geomviewer'
import Icon from 'components/uiElements/Icon'
import { getGrandCentral } from 'Renderer/GrandCentral'
import type { NotificationObserver } from 'Renderer/NotificationDispatcher'
import { formatCurrency } from 'utils/convertCurrency'
import { trackGoogleAnalytics } from 'utils/tracker'

import Tooltip from './Tooltip'
import './MultiviewToggle.scss'

const ZOOM_DEFAULT = 100 // No zoom in or out

const ZOOM_MIN = 50 // Max zoom out
const ZOOM_MAX = 200 // Max zoom in
const CAMERA_DOLLY_MAX = 300 // Max zoom in
const CAMERA_DOLLY_MIN = 100 // Max zoom out

const ZOOM_STEP = 10 // Zoom amnt per click
const ZOOM_SCALE = 100 // Percent to decimal
const UPPTACKA_ZOOM_MIN = 100

const MultiViewToggle: React.FunctionComponent = () => {
    const { t } = useTranslation('translation')
    const dispatch = useAppDispatch()
    const { isUpptacka } = useSugarcubeContext()

    const shouldShowChangeView = useAppSelector(getShouldShowChangeView)
    const track = useTracker()
    const [walkedToId, setWalkedToId] = useState<number | null>(null)
    const [zoomLevel, setZoomLevel] = useState(ZOOM_DEFAULT)
    const [shiftForCookieConsent, setShiftForCookieConsent] = useState(false)
    const scene = useAppSelector(getSelectedScene)
    const totalPrice = useAppSelector(getSelectedCompositionRenderedItemsNumeralPrice)
    const addedToRoomItems = useAppSelector(getSelectedCompositionShoppableProductData) as RenderItemComplete[]
    const isEmptyRoom = addedToRoomItems.length === 0
    const selectedItemId = useAppSelector(getSelectedRenderItemId)
    const previewSettings = useAppSelector(getPreviewSettings)
    const { currency, currencyPosition, currencyScriptType, decimal, fraction, integer } = formatCurrency(totalPrice)
    // Upptacka would like to override and show hela-optimized functions like walk-to and zoom
    const isHelaScene = allScenesAreStandard3D(scene) || isUpptacka

    const zoomMax = previewSettings.featureFlags.cameraOrbitMode ? CAMERA_DOLLY_MAX : ZOOM_MAX
    let zoomMin = previewSettings.featureFlags.cameraOrbitMode ? CAMERA_DOLLY_MIN : ZOOM_MIN
    if (isUpptacka) {
        zoomMin = UPPTACKA_ZOOM_MIN
    }

    useEffect(() => {
        const resetObserver = (notification: ViewerStateUpdateNotification) => {
            // Reset when the camera comes back to a static view (like after changing the view)
            if (notification.payload?.stateInfo === 'CameraEnterStaticView') {
                setWalkedToId(null)
                setZoomLevel(ZOOM_DEFAULT)
            }
        }

        // TODO removing type assertion requires refactoring GrandCentral
        getGrandCentral().addObserver(NOTIFY_VIEWER_STATE_UPDATE, resetObserver as NotificationObserver)

        return () => {
            getGrandCentral().removeObserver(resetObserver as NotificationObserver)
        }
    }, [])

    const handleWalkToClick = () => {
        if (selectedItemId && selectedItemId !== walkedToId) {
            GeomViewer.bindings?.setCameraMode({
                mode: `focused`,
                itemId: String(selectedItemId),
            })
            setZoomLevel(ZOOM_DEFAULT)
            setWalkedToId(selectedItemId)
        } else if (walkedToId) {
            GeomViewer.bindings?.setCameraMode({ mode: `default` })
            setZoomLevel(ZOOM_DEFAULT)
            setWalkedToId(null)
        }
    }

    const handleZoomClick = (zoomIn: boolean) => {
        const nextZoomLevel = Math.min(zoomMax, Math.max(zoomMin, zoomLevel + (zoomIn ? ZOOM_STEP : -ZOOM_STEP)))
        GeomViewer.bindings?.zoom(nextZoomLevel / ZOOM_SCALE)
        setZoomLevel(nextZoomLevel)
    }

    const showWalkBack = Boolean(walkedToId && (!selectedItemId || selectedItemId === walkedToId))

    const cookieConsentBanner = document.getElementById('onetrust-banner-sdk')
    const locale = getLocale()

    // shift MultiView Toggle up when cookie consent banner is present on Design Page
    useEffect(() => {
        // check for cookie consent banner in us/en only
        if (cookieConsentBanner?.style.display !== 'none' && cookieConsentBanner !== null && locale === 'en-US') {
            setShiftForCookieConsent(true)
        }
        // when cookie consent response has been submitted, return button to original position
        document.addEventListener('ikeaCookieConsent', () => setShiftForCookieConsent(false))
    }, [cookieConsentBanner])

    return (
        <div
            className={classNames('MultiViewToggle', {
                hideMultiView: shouldShowChangeView,
                shiftForCookieConsent,
                isUpptacka,
            })}
        >
            <div
                className={classNames('buttonBar', { isSingle: !isHelaScene })}
                onMouseDown={(e) => {
                    e.stopPropagation()
                }}
            >
                <Button
                    className="toggleButton"
                    onClick={() => dispatch(showChangeView(!shouldShowChangeView))}
                    type="tertiary"
                >
                    <SSRIcon paths={videoCamera} />
                    {t('design.change view')}
                </Button>
                {isHelaScene && (
                    <>
                        <div className="divider" />
                        <Tooltip
                            describedById={`move-or-back-to-${showWalkBack ? `back` : `move`}`}
                            title={showWalkBack ? t('design.go back') : t('design.move to')}
                        >
                            <Button
                                className="toggleButton"
                                onClick={() => handleWalkToClick()}
                                type="tertiary"
                                disabled={!walkedToId && !selectedItemId}
                                size="small"
                                key={`tooltip-${showWalkBack ? 'back' : 'move'}`}
                                aria-label={showWalkBack ? t('design.go back') : t('design.move to')}
                            >
                                <Icon svg code={showWalkBack ? 'walk_back' : 'walk_to'} />
                                <p key={showWalkBack ? 'walkBackText' : 'moveToText'}>
                                    {showWalkBack ? t('design.go back') : t('design.move to')}
                                </p>
                            </Button>
                        </Tooltip>
                    </>
                )}
            </div>
            {isHelaScene && isUpptacka && <div className="UpptackaMultiView__divider" />}
            {isHelaScene && (
                <div
                    className="zoomWrapper"
                    onMouseDown={(e) => {
                        e.stopPropagation()
                    }}
                >
                    <Button
                        type="primary"
                        inverseTheme
                        size="small"
                        ssrIcon={minus}
                        iconOnly
                        onClick={() => handleZoomClick(false)}
                        text={t('aria.zoom out')}
                        disabled={zoomLevel === zoomMin}
                    />
                    <span className="zoomLevel">{`${zoomLevel}%`}</span>
                    <Button
                        type="primary"
                        inverseTheme
                        size="small"
                        ssrIcon={plus}
                        iconOnly
                        onClick={() => handleZoomClick(true)}
                        text={t('aria.zoom in')}
                        disabled={zoomLevel === zoomMax}
                    />
                </div>
            )}
            {isUpptacka && (
                <>
                    <div className="UpptackaMultiView__divider" />
                    <Price
                        className="UpptackaMultiView__price"
                        currencyLabel={currency}
                        currencyPosition={currencyPosition === 'before' ? 'leading' : 'trailing'}
                        currencySpacing="thin"
                        currencyVerticalAlignment={currencyScriptType === 'superscript' ? 'super' : 'base'}
                        decimalSign={decimal}
                        decimalValue={fraction}
                        integerValue={integer}
                        size="medium"
                    />
                    <Button
                        className="UpptackaMultiView__summary-button"
                        iconPosition="trailing"
                        ssrIcon={arrowRight}
                        text={t('upptacka.summary button')}
                        type="emphasised"
                        onClick={() => {
                            trackGoogleAnalytics({
                                action: GA_ACTION_UPPTACKA_OPEN_SUMMARY_PANEL,
                                category: GA_CATEGORY_DYH_SUGARCUBE,
                                label: '',
                            })
                            track.click({
                                target: 'upptacka.multiviewToggleSummaryButton',
                                intendedAction: ACTION_UPPTACKA_OPEN_SUMMARY_PANEL,
                            })
                            dispatch(saveUpptackaComposition())
                            dispatch(upptackaActions.setShowUpptackaSummary(true))
                        }}
                        disabled={isEmptyRoom}
                    />
                </>
            )}
        </div>
    )
}

export default MultiViewToggle
