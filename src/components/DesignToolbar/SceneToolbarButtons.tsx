import React from 'react'
import { useTranslation } from 'react-i18next'

import classNames from 'classnames'
import Button from '@ingka/button'
import ruler from '@ingka/ssr-icon/paths/ruler'
import visibilityHide from '@ingka/ssr-icon/paths/visibility-hide'
import visibilityShow from '@ingka/ssr-icon/paths/visibility-show'
import checkmarkIcon from '@ingka/ssr-icon/paths/checkmark'

import Tooltip from 'components/Tooltip'
import { magicBroom } from 'icons/magic-broom'
import ToolbarButton from './ToolbarButton'

interface SceneToolbarButtonsProps {
    isEditScanMode: boolean
    shouldShowMeasurements: boolean
    disableShowAll: boolean
    disableHideAll: boolean
    measurementsButtonId: string
    measurementsPopoverId: string
    toolbarRef: React.RefObject<HTMLDivElement>
    onEditScanClick: () => void
    onSaveChanges: () => void
    onMeasurementsClick: () => void
    onHideAll: () => void
    onShowAll: () => void
    editButtonTooltip: string
}

const SceneToolbarButtons: React.FC<SceneToolbarButtonsProps> = ({
    isEditScanMode,
    shouldShowMeasurements,
    disableShowAll,
    disableHideAll,
    measurementsButtonId,
    measurementsPopoverId,
    toolbarRef,
    onEditScanClick,
    onSaveChanges,
    onMeasurementsClick,
    onHideAll,
    onShowAll,
    editButtonTooltip,
}) => {
    const { t } = useTranslation('translation')
    return (
        <div
            className={classNames('buttonBar', {
                editMode: isEditScanMode,
            })}
            ref={toolbarRef}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {!isEditScanMode ? (
                <>
                    <Tooltip describedById="edit-scan" title={editButtonTooltip} place="top">
                        <ToolbarButton
                            active={false}
                            onClick={onEditScanClick}
                            icon={magicBroom}
                            label={t('design.eraser')}
                        />
                    </Tooltip>

                    <Tooltip
                        describedById="measurements-scene"
                        title={t('tooltip.show measurement options')}
                        place="top"
                        hide={shouldShowMeasurements}
                    >
                        <ToolbarButton
                            active={shouldShowMeasurements}
                            role="button"
                            aria-haspopup="menu"
                            aria-expanded={shouldShowMeasurements}
                            aria-controls={measurementsPopoverId}
                            id={measurementsButtonId}
                            aria-label={t('tooltip.show measurement options')}
                            onClick={onMeasurementsClick}
                            icon={ruler}
                            label={t('design.measurements')}
                        />
                    </Tooltip>
                </>
            ) : (
                <>
                    <Button
                        className="SceneToolbar__button"
                        onClick={onHideAll}
                        type="primary"
                        inverseTheme
                        size="small"
                        ssrIcon={visibilityHide}
                        disabled={disableHideAll}
                        text={t('design.hide all')}
                    />

                    <Button
                        className="SceneToolbar__button"
                        onClick={onShowAll}
                        type="primary"
                        inverseTheme
                        size="small"
                        ssrIcon={visibilityShow}
                        disabled={disableShowAll}
                        text={t('design.show all')}
                    />

                    <Button
                        className="SceneToolbar__button"
                        onClick={onSaveChanges}
                        ssrIcon={checkmarkIcon}
                        type="primary"
                        size="small"
                        text={t('design.finish')}
                    />
                </>
            )}
        </div>
    )
}

export default SceneToolbarButtons
