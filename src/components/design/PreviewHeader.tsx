import React, { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import Icon from 'components/uiElements/Icon'
import InputField from '@ingka/input-field'
import Tooltip from 'components/Tooltip'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { withTrackingBoundary } from 'apps/TrackingBoundary'
import SkipLinks from 'components/SkipLinks'
import { DESIGN, HEADER, NAVIGATION } from 'components/SkipLinks/constants'
import { navigate } from 'gatsby'
import cross from '@ingka/ssr-icon/paths/cross'
import shoppingBag from '@ingka/ssr-icon/paths/shopping-bag'
import shoppingBagActive from '@ingka/ssr-icon/paths/shopping-bag-active'
import { useAppDispatch, useAppSelector, useDynamicInputWidth, useWindowSize } from 'hooks'

import { getShouldShowMeasurementsPopover } from 'models/ui/selectors'

import {
    selectCompositionRenderItem,
    resetCompositionToLatestSavedState,
    resetPlaceProduct,
} from 'models/compositions/actions'
import { getUrlContext, getPlannerDashboardUrl } from 'models/location/selectors'
import { getHasBeenSaved } from 'models/compositions/selectors'
import SSRIcon from '@ingka/ssr-icon'
import camera from '@ingka/ssr-icon/paths/camera'
import pencil from '@ingka/ssr-icon/paths/pencil'
import SaveOptions from 'components/SaveOptions'
import { getIsNewComposition } from 'models/compositions/helpers'
import arrowUpFromBase from '@ingka/ssr-icon/paths/arrow-up-from-base'
import { useShoppingBag } from 'features/shopping-bag'
import { getIsProductContext } from 'models/referrer/selector'
import type { Composition } from 'models/compositions'
import type { ProductData } from 'models/furniture'
import type { DebugSettings } from 'models/admin'

import './PreviewHeader.scss'

import { showMeasurementsPopover, setStarterSetSidebarVisible, setStarterSetPopupVisible } from 'models/ui/actions'
import SummaryPrice from './SummaryPrice'
import { DesignIconButton } from './DesignIconButton'
import PreviewHeaderExpertCheckButton from './PreviewHeaderExpertCheckButton'

export type PreviewHeaderProps = {
    composition?: Composition | null
    isSaving: boolean
    isModified: boolean
    designingEnabled: boolean
    onSave: (saveAs?: boolean) => void
    commitPendingRename: () => boolean
    onShareClick: () => void
    onExpertCheckClick: () => void
    shouldShowExpertCheck: boolean
    editing: boolean
    editName: string
    rename: (e: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLInputElement>) => void
    edit: React.ChangeEventHandler<HTMLInputElement>
    checkEdit: React.KeyboardEventHandler<HTMLInputElement>
    hasRendered: boolean
    onCompositionInputBlur: React.FocusEventHandler<HTMLInputElement>
    isLoggedIn: boolean
    setShowAppDownloadModal: (show: boolean) => void
    toggleSaveModal: (show: boolean) => void
    magicEraserMode: boolean
    totalPrice: number
    deselectItems: () => void
    showDesignSummary: () => void
    addedToRoomItems: ProductData[]
    debugSettings: DebugSettings
    isSaveMenuVisible: boolean
    setShowSaveMenu: (show: boolean) => void
    userId: number
}

const PreviewHeader = withTrackingBoundary('PreviewHeader')(
    ({
        composition,
        isSaving,
        isModified,
        designingEnabled,
        onSave,
        commitPendingRename,
        onShareClick,
        onExpertCheckClick,
        shouldShowExpertCheck,
        editing,
        editName,
        rename,
        edit,
        checkEdit,
        hasRendered,
        onCompositionInputBlur,
        isLoggedIn,
        setShowAppDownloadModal,
        toggleSaveModal,
        magicEraserMode,
        totalPrice,
        deselectItems,
        showDesignSummary,
        addedToRoomItems,
        debugSettings,
        isSaveMenuVisible,
        setShowSaveMenu,
        userId,
    }: PreviewHeaderProps) => {
        const { t } = useTranslation()
        const dispatch = useAppDispatch()
        const { hasAddedSomethingToBag, openBag } = useShoppingBag()

        const { hideDashboard, isRoomPlannerIntegration } = useSugarcubeContext()
        const { isLivingRoomIntegration } = getUrlContext()

        const isProductContext = useAppSelector(getIsProductContext)

        const isNewComposition = composition ? getIsNewComposition(composition.id, composition.wid, userId) : false
        const hasBeenSaved = useAppSelector(getHasBeenSaved)

        const shouldShowMeasurements = useAppSelector(getShouldShowMeasurementsPopover)

        const canModify = composition
        const isReadOnly = debugSettings.disable3DCompositionSave && composition?.isGLTF
        const canSave = !isSaving && (isModified || editing) && !isReadOnly
        const disabledSaveAs = isSaving || isReadOnly || isNewComposition || !isLoggedIn
        const autoSelect = editName === t('design.default composition name')

        const hasProductsInDesign = !!addedToRoomItems.length

        const onSaveMenuClick = () => {
            setShowSaveMenu(!isSaveMenuVisible)
        }

        const showShareButton = isLoggedIn
        const onClickSave = (saveAs: boolean) => {
            onSave(saveAs)
            setShowSaveMenu(false)
        }

        const stopPropagationFunc = (e: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>) => {
            e.stopPropagation()
        }

        const inputRef = useRef<HTMLInputElement>(null)
        const { width: windowWidth } = useWindowSize()

        // Set the name input field's max width to 30% of the header's remaining space (after subtracting 531px for the side panel).
        const maxInputWidth = useMemo(() => Math.floor(0.3 * (windowWidth - 531)), [windowWidth])

        const inputWidth = useDynamicInputWidth(editName, inputRef, { maxWidth: maxInputWidth, minWidth: 162 })

        useEffect(() => {
            if (autoSelect && inputRef && inputRef.current) {
                inputRef.current.setSelectionRange(0, inputRef.current.value.length)
            }
        }, [])

        const onExitClick = () => {
            dispatch(setStarterSetPopupVisible(false))
            dispatch(setStarterSetSidebarVisible(false))
            if (isModified) {
                return toggleSaveModal(true)
            }

            if (shouldShowMeasurements) {
                dispatch(showMeasurementsPopover(!shouldShowMeasurements))
            }

            if (isProductContext || isLivingRoomIntegration) {
                dispatch(resetPlaceProduct())
            }

            // WEBFS-902: commit any pending design-header rename BEFORE the reset.
            // The window-click listener that normally auto-commits the rename fires
            // AFTER this React handler completes, by which time the reset would have
            // stripped placement and the rename's save would serialize as empty.
            // The saveSelectedComposition thunk runs synchronously up to its first
            // await, so it snapshots placement here before the reset mutates state.
            commitPendingRename()

            if (composition?.id) {
                dispatch(selectCompositionRenderItem(-1))
                dispatch(resetCompositionToLatestSavedState(composition.id))
            }

            if (isLivingRoomIntegration && !hasBeenSaved && !isRoomPlannerIntegration) {
                return navigate(`/living-room`)
            }

            return navigate(isRoomPlannerIntegration ? getPlannerDashboardUrl() : '/dashboard')
        }

        return (
            <div className={classNames('PreviewHeader', { hasRendered })}>
                <SkipLinks
                    label={t('accessibility.skiplinks for navigation')}
                    skipLinks={[DESIGN, HEADER]}
                    skipContext={NAVIGATION}
                />
                <div className="compositionTitle">
                    {canModify ? (
                        <div
                            className={classNames('nameEditContainer', { designingEnabled })}
                            onMouseDown={stopPropagationFunc}
                            onPointerDown={stopPropagationFunc}
                        >
                            <div className={classNames('nameEdit', { editing })} onClick={rename}>
                                <Tooltip
                                    describedById="design-name-input"
                                    title={
                                        isReadOnly ? t('tooltip.scene is read-only') : t('tooltip.rename this design')
                                    }
                                >
                                    <InputField
                                        id="design-name-input"
                                        type="text"
                                        value={editName}
                                        onChange={edit}
                                        onKeyDown={checkEdit}
                                        disabled={isReadOnly}
                                        ref={inputRef}
                                        data-testid="design-name-input"
                                        onFocus={rename}
                                        onBlur={onCompositionInputBlur}
                                        style={{ width: `${inputWidth}px` }}
                                        aria-label={editName || t('design.default composition name')}
                                        maxLength={128}
                                    />
                                    <SSRIcon className={editing ? 'hidden' : ''} paths={pencil} />
                                </Tooltip>
                            </div>
                        </div>
                    ) : null}
                </div>
                <nav
                    role="navigation"
                    className="previewCtaContainer"
                    onMouseDown={stopPropagationFunc}
                    onPointerDown={stopPropagationFunc}
                >
                    {shouldShowExpertCheck ? (
                        <PreviewHeaderExpertCheckButton onExpertCheckClick={onExpertCheckClick} />
                    ) : null}

                    <Tooltip title={t('tooltip.scan your own space')} describedById="camera-design">
                        <DesignIconButton
                            onClick={() => setShowAppDownloadModal(true)}
                            aria-label={t('tooltip.scan your own space')}
                            data-testid="preview-header-camera-btn"
                        >
                            <div className="Icon">
                                <SSRIcon paths={camera} className="headerIcons" />
                            </div>
                        </DesignIconButton>
                    </Tooltip>
                    {canModify ? (
                        <>
                            <div>
                                <Tooltip
                                    title={isReadOnly ? t('tooltip.scene is read-only') : t('tooltip.save options')}
                                    describedById="save-design"
                                    hide={isSaveMenuVisible}
                                >
                                    <DesignIconButton
                                        className="saveButton"
                                        onClick={onSaveMenuClick}
                                        disabled={!designingEnabled}
                                        aria-label={t('tooltip.save options')}
                                        data-testid="preview-header-save-btn"
                                    >
                                        <Icon code="save" className="headerIcons" svg label="" />
                                    </DesignIconButton>
                                </Tooltip>
                                {isSaveMenuVisible ? (
                                    <SaveOptions
                                        onClickSave={() => onClickSave(false)}
                                        onClickSaveAs={() => onClickSave(true)}
                                        saveDisabled={!canSave}
                                        saveAsDisabled={disabledSaveAs}
                                    />
                                ) : null}
                            </div>
                            {showShareButton && (
                                <Tooltip
                                    title={
                                        isReadOnly ? t('tooltip.scene is read-only') : t('tooltip.share this design')
                                    }
                                    describedById="share-design"
                                >
                                    <DesignIconButton
                                        className="shareButton"
                                        onClick={() => onShareClick()}
                                        disabled={!composition || !designingEnabled || isReadOnly}
                                        aria-label={t('tooltip.share this design')}
                                        data-testid="preview-header-share-btn"
                                    >
                                        <SSRIcon paths={arrowUpFromBase} className="headerIcons" aria-hidden="true" />
                                    </DesignIconButton>
                                </Tooltip>
                            )}
                        </>
                    ) : null}
                    <Tooltip title={t('tooltip.open shopping bag')} describedById="add-to-cart-design">
                        <DesignIconButton
                            onClick={() => openBag()}
                            aria-label={t('aria.shopping bag')}
                            data-testid="preview-header-bag-btn"
                        >
                            <SSRIcon
                                paths={hasAddedSomethingToBag ? shoppingBagActive : shoppingBag}
                                className="headerIcons"
                                aria-hidden="true"
                            />
                        </DesignIconButton>
                    </Tooltip>
                    <div className="divider" />
                    <SummaryPrice
                        totalPrice={totalPrice}
                        disabled={!hasProductsInDesign}
                        onClick={showDesignSummary}
                        onMouseDown={deselectItems}
                    />
                    <div className="divider divider--price" />
                    <DesignIconButton
                        onClick={onExitClick}
                        className={classNames('exitDesign', {
                            hideExitDesign: hideDashboard || magicEraserMode,
                        })}
                        aria-label={t('design.cancel')}
                    >
                        <SSRIcon paths={cross} />
                    </DesignIconButton>
                </nav>
            </div>
        )
    },
)
export default PreviewHeader
