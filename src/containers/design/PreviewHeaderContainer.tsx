import React, { Component } from 'react'
import PreviewHeader from 'components/design/PreviewHeader'
import type { TFunction } from 'i18next'
import {
    toggleSharePanelOpen,
    toggleExpertCheckPanelOpen,
    showAppDownloadModal as showAppDownloadModalAction,
    showDesignSummary as showDesignSummaryAction,
    showSaveMenu,
} from 'models/ui/actions'
import { connect } from 'react-redux'
import {
    renameComposition as renameCompositionAction,
    saveSelectedComposition,
    saveCompositionBeforeSharing as saveCompositionBeforeSharingAction,
} from 'models/compositions/actions'
import type { Composition, CompositionSaveTrackingInfo, CompositionSaveType } from 'models/compositions'
import {
    getSelectedComposition,
    getIsSaving,
    getIsModified,
    getSelectedCompositionShoppableProductData,
    getSelectedCompositionRenderedItemsNumeralPrice,
} from 'models/compositions/selectors'
import { getDesigningEnabled, getShowSaveMenu, getShouldShowExpertCheck } from 'models/ui/selectors'
import { getIsLoggedIn, getUserId } from 'models/user/selectors'
import { getHasRendered } from 'models/renderer/selectors'
import {
    TRACK_LOCATION_DESIGN_HEADER,
    TRACK_LOCATION_EXPERT_CHECK,
    TRACK_LOCATION_SHARE_PANEL,
} from 'models/tracking/constants'
import { withTranslation } from 'react-i18next'
import { getDebugSettings } from 'models/admin/selectors'
import { MAX_COMPOSITION_NAME_LENGTH, TRACK_COPY_COMPOSITION } from 'models/compositions/constants'
import type { ProductData } from 'models/furniture'
import type { DebugSettings } from 'models/admin'
import type { RootState } from 'store'

type RenameCompositionPayload = {
    id: string
    name: string
    trackingInfo: CompositionSaveTrackingInfo
    fullSave: true
}

type PendingRenameResult =
    | {
          shouldExitEditing: false
          shouldRename: false
      }
    | {
          shouldExitEditing: true
          shouldRename: false
      }
    | {
          shouldExitEditing: true
          shouldRename: true
          payload: RenameCompositionPayload
      }

type PendingRenameComposition = {
    id: string
    name: string
}

export const resolvePendingRename = ({
    editing,
    editName,
    composition,
}: {
    editing: boolean
    editName: string
    composition: PendingRenameComposition
}): PendingRenameResult => {
    if (!editing) {
        return { shouldExitEditing: false, shouldRename: false }
    }

    if (editName === composition.name) {
        return { shouldExitEditing: true, shouldRename: false }
    }

    return {
        shouldExitEditing: true,
        shouldRename: true,
        payload: {
            id: composition.id,
            name: editName.slice(0, MAX_COMPOSITION_NAME_LENGTH),
            trackingInfo: { SavedFrom: TRACK_LOCATION_DESIGN_HEADER },
            fullSave: true,
        },
    }
}

type OwnProps = {
    composition?: Composition | null
    toggleSaveModal: (show: boolean) => void
    magicEraserMode: boolean
    deselectItems: () => void
}

type StateProps = {
    composition: Composition | null | undefined
    isLoggedIn: boolean
    designingEnabled: boolean
    isSaving: boolean
    isModified: boolean
    hasRendered: boolean
    totalPrice: number
    addedToRoomItems: ProductData[]
    debugSettings: DebugSettings
    isSaveMenuVisible: boolean
    userId: number
    shouldShowExpertCheck: boolean
}

type DispatchProps = {
    saveComposition: (
        trackingInfo: CompositionSaveTrackingInfo,
        newName?: string,
        saveType?: CompositionSaveType,
    ) => void
    renameComposition: (payload: RenameCompositionPayload) => void
    toggleSharePanel: (trackingInfo: { SharedFrom: typeof TRACK_LOCATION_DESIGN_HEADER }) => void
    toggleExpertCheckPanel: () => void
    saveCompositionBeforeSharing: (trackingInfo: CompositionSaveTrackingInfo) => void
    setShowAppDownloadModal: (show: boolean) => void
    showDesignSummary: () => void
    setShowSaveMenu: (show: boolean) => void
}

type TranslationProps = {
    t: TFunction
}

type PreviewHeaderContainerProps = OwnProps & StateProps & DispatchProps & TranslationProps

type PreviewHeaderContainerState = {
    editing: boolean
    editName: string
}

// Exported unconnected for unit testing commitPendingRename. The default export
// remains the redux-connected, i18n-wrapped instance used by production code.
export class PreviewHeaderContainer extends Component<PreviewHeaderContainerProps, PreviewHeaderContainerState> {
    constructor(props: PreviewHeaderContainerProps) {
        super(props)
        this.onWindowClick = this.onWindowClick.bind(this)
        this.onSave = this.onSave.bind(this)
        this.commitPendingRename = this.commitPendingRename.bind(this)
        this.onShareClick = this.onShareClick.bind(this)
        this.onExpertCheckClick = this.onExpertCheckClick.bind(this)
        this.rename = this.rename.bind(this)
        this.edit = this.edit.bind(this)
        this.checkEdit = this.checkEdit.bind(this)
        this.onCompositionInputBlur = this.onCompositionInputBlur.bind(this)
        const { t } = props
        this.state = {
            editing: false,
            editName: (props.composition && props.composition.name) || t('design.default composition name'),
        }
    }

    componentDidMount() {
        window.addEventListener('click', this.onWindowClick)
    }

    componentDidUpdate(prevProps: PreviewHeaderContainerProps) {
        const { composition } = this.props
        const { editing, editName } = this.state
        const { composition: prevComposition } = prevProps
        if (
            composition &&
            composition.name &&
            composition !== prevComposition &&
            !editing &&
            composition.name !== editName
        ) {
            this.setState({ editName: composition.name })
        }
    }

    componentWillUnmount() {
        window.removeEventListener('click', this.onWindowClick)
    }

    onWindowClick() {
        if (this.state.editing) {
            this.onSave()
        }
    }

    onCompositionInputBlur() {
        const { t } = this.props
        const { editName } = this.state
        if (!editName) {
            this.setState({ editName: t('design.default composition name') }, () => this.onWindowClick())
        }
    }

    onSave(isCopy?: boolean) {
        const { editing } = this.state
        const { saveComposition, composition, t } = this.props

        if (editing) {
            this.commitPendingRename()
            return
        }

        const trackingInfo: CompositionSaveTrackingInfo = {
            SavedFrom: TRACK_LOCATION_DESIGN_HEADER,
        }
        let compositionNameToSave = composition?.name
        const saveType = isCopy ? TRACK_COPY_COMPOSITION : undefined

        if (isCopy && composition?.name) {
            compositionNameToSave = t('dashboard.copy composition', {
                compositionName: composition.name,
                ns: 'dashboard',
            })
        }
        saveComposition(trackingInfo, compositionNameToSave?.slice(0, MAX_COMPOSITION_NAME_LENGTH), saveType)
    }

    onShareClick() {
        const { toggleSharePanel, saveCompositionBeforeSharing } = this.props

        const saveBeforeSharingTrackingInfo: CompositionSaveTrackingInfo = {
            SavedFrom: TRACK_LOCATION_SHARE_PANEL,
        }
        saveCompositionBeforeSharing(saveBeforeSharingTrackingInfo)

        const shareTrackingInfo: { SharedFrom: typeof TRACK_LOCATION_DESIGN_HEADER } = {
            SharedFrom: TRACK_LOCATION_DESIGN_HEADER,
        }
        toggleSharePanel(shareTrackingInfo)
    }

    onExpertCheckClick() {
        const { toggleExpertCheckPanel, saveCompositionBeforeSharing, isLoggedIn } = this.props
        if (isLoggedIn) {
            saveCompositionBeforeSharing({
                SavedFrom: TRACK_LOCATION_EXPERT_CHECK,
            })
        }
        toggleExpertCheckPanel()
    }

    // Flush any pending design-header rename synchronously and return whether a rename
    // dispatch was issued. Returns false if there's no pending edit (or the user typed
    // and reverted to the original name). Exposed as a prop so the X-button handler in
    // PreviewHeader can commit BEFORE the resetCompositionToLatestSavedState dispatch,
    // avoiding the WEBFS-902 race where the window-click listener would otherwise fire
    // the rename's save against a placement-stripped state.
    commitPendingRename() {
        const { editing, editName } = this.state
        const { renameComposition, composition } = this.props
        if (!composition) return false

        const pendingRename = resolvePendingRename({
            editing,
            editName,
            composition,
        })

        if (pendingRename.shouldExitEditing) {
            this.setState({ editing: false })
        }

        if (!pendingRename.shouldRename) return false
        renameComposition(pendingRename.payload)
        return true
    }

    checkEdit(e: React.KeyboardEvent<HTMLInputElement>) {
        e.stopPropagation()
        // Preserve keyCode behavior for now; migrating to e.key is separate cleanup.
        if (e.keyCode === 13) {
            // Enter key pressed, save it
            this.onSave()
        } else if (e.keyCode === 27) {
            // Cancel with Esc
            this.setState({
                editing: false,
                editName: this.props.composition?.name || this.props.t('design.default composition name'),
            })
        }
    }

    rename(e: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLInputElement>) {
        e.stopPropagation()
        if (!this.state.editing && this.props.composition) {
            this.setState({ editing: true, editName: this.props.composition.name })
        }
    }

    edit(e: React.ChangeEvent<HTMLInputElement>) {
        this.setState({ editName: e.target.value, editing: true })
    }

    render() {
        const {
            composition,
            designingEnabled,
            isSaving,
            isModified,
            hasRendered,
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
            shouldShowExpertCheck,
        } = this.props
        const { editing, editName } = this.state
        return (
            <PreviewHeader
                composition={composition}
                isSaving={isSaving}
                isModified={isModified}
                designingEnabled={designingEnabled}
                onSave={this.onSave}
                commitPendingRename={this.commitPendingRename}
                onShareClick={this.onShareClick}
                onExpertCheckClick={this.onExpertCheckClick}
                shouldShowExpertCheck={shouldShowExpertCheck}
                editName={editName}
                editing={editing}
                rename={this.rename}
                edit={this.edit}
                checkEdit={this.checkEdit}
                hasRendered={hasRendered}
                onCompositionInputBlur={this.onCompositionInputBlur}
                isLoggedIn={isLoggedIn}
                setShowAppDownloadModal={setShowAppDownloadModal}
                toggleSaveModal={toggleSaveModal}
                magicEraserMode={magicEraserMode}
                totalPrice={totalPrice}
                deselectItems={deselectItems}
                showDesignSummary={showDesignSummary}
                addedToRoomItems={addedToRoomItems}
                debugSettings={debugSettings}
                isSaveMenuVisible={isSaveMenuVisible}
                setShowSaveMenu={setShowSaveMenu}
                userId={userId}
            />
        )
    }
}

const mapStateToProps = (state: RootState, props: OwnProps): StateProps => ({
    composition: props.composition || getSelectedComposition(state),
    isLoggedIn: getIsLoggedIn(state),
    designingEnabled: getDesigningEnabled(state),
    isSaving: getIsSaving(state),
    isModified: getIsModified(state),
    hasRendered: getHasRendered(state),
    totalPrice: getSelectedCompositionRenderedItemsNumeralPrice(state),
    addedToRoomItems: getSelectedCompositionShoppableProductData(state),
    debugSettings: getDebugSettings(state),
    isSaveMenuVisible: getShowSaveMenu(state),
    userId: getUserId(state),
    shouldShowExpertCheck: getShouldShowExpertCheck(state),
})

const mapDispatchToProps = {
    saveComposition: saveSelectedComposition,
    renameComposition: renameCompositionAction,
    toggleSharePanel: toggleSharePanelOpen,
    toggleExpertCheckPanel: toggleExpertCheckPanelOpen,
    saveCompositionBeforeSharing: saveCompositionBeforeSharingAction,
    setShowAppDownloadModal: showAppDownloadModalAction,
    showDesignSummary: showDesignSummaryAction,
    setShowSaveMenu: showSaveMenu,
}

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(PreviewHeaderContainer))
