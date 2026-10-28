import React from 'react'
import { useTranslation } from 'react-i18next'
import { CompositionSavedFrom } from 'models/compositions'

import { useSceneToolbarLogic } from './hooks/useSceneToolbarLogic'
import InstructionTooltip from './InstructionTooltip'
import SceneToolbarButtons from './SceneToolbarButtons'
import MeasurementsPopover from './MeasurementsPopover'

import './SceneToolbar.scss'

interface SceneToolbarProps {
    exitToRoomBuilderPage: (trackLocation: CompositionSavedFrom) => void
}

const SceneToolbar: React.FunctionComponent<SceneToolbarProps> = ({ exitToRoomBuilderPage }) => {
    const { t } = useTranslation('translation')
    const {
        isEditScanMode,
        shouldShowMeasurements,
        disableShowAll,
        disableHideAll,
        toolbarRef,
        measurementsButtonId,
        measurementsPopoverId,
        showInstructionTooltip,
        editButtonTooltip,
        handlers,
    } = useSceneToolbarLogic(exitToRoomBuilderPage)

    return (
        <div className="SceneToolbar">
            <InstructionTooltip visible={showInstructionTooltip} content={t('design.click objects to hide or show')} />

            <SceneToolbarButtons
                isEditScanMode={isEditScanMode}
                shouldShowMeasurements={shouldShowMeasurements}
                disableShowAll={disableShowAll}
                disableHideAll={disableHideAll}
                measurementsButtonId={measurementsButtonId}
                measurementsPopoverId={measurementsPopoverId}
                toolbarRef={toolbarRef}
                onEditScanClick={handlers.handleEditScanClick}
                onSaveChanges={handlers.handleSaveChanges}
                onMeasurementsClick={handlers.handleMeasurementsClick}
                onHideAll={handlers.handleHideAll}
                onShowAll={handlers.handleShowAll}
                editButtonTooltip={editButtonTooltip}
            />

            <MeasurementsPopover
                anchorRef={toolbarRef}
                measurementsPopoverId={measurementsPopoverId}
                showMagicEraseMode
                exitToRoomBuilderPage={exitToRoomBuilderPage}
            />
        </div>
    )
}

export default SceneToolbar
