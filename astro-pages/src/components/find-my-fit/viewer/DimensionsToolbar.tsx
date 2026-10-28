import React from 'react'
import { useTranslation } from 'react-i18next'
import SSRIcon from '@ingka/ssr-icon'
import minus from '@ingka/ssr-icon/paths/minus'
import plus from '@ingka/ssr-icon/paths/plus'
import checkmark from '@ingka/ssr-icon/paths/checkmark'
import { DIMENSIONS_TOOLBAR_TOP } from './constants'
import type { Dimension, DimensionLabels } from './types'
import './DimensionsToolbar.scss'

type DimensionsToolbarProps = {
    /** Display-keyed labels (visual meaning). */
    dimensionLabels: DimensionLabels
    /** Dimension currently being dragged (gold highlight), in display terms. */
    activeDimension: Dimension | null
    /** Dimension in targeted-edit mode (null = default), in display terms. */
    targetedDimension: Dimension | null
    formatDimension: (meters: number) => string
    onDimensionTap: (dim: Dimension) => void
    onStep: (direction: 1 | -1) => void
    onConfirm: () => void
    /** Extra top offset to avoid overlapping other controls. */
    topOffset?: string
}

const DIM_CONFIG: { key: Dimension; tKey: string }[] = [
    { key: 'width', tKey: 'find-my-fit.viewer.dimWidth' },
    { key: 'height', tKey: 'find-my-fit.viewer.dimHeight' },
    { key: 'depth', tKey: 'find-my-fit.viewer.dimDepth' },
]

const DimensionsToolbar: React.FC<DimensionsToolbarProps> = ({
    dimensionLabels,
    activeDimension,
    targetedDimension,
    formatDimension,
    onDimensionTap,
    onStep,
    onConfirm,
    topOffset,
}) => {
    const { t } = useTranslation('find-my-fit')
    const isTargeted = targetedDimension !== null

    return (
        <div
            className="DimensionsToolbar"
            style={{ top: topOffset ?? DIMENSIONS_TOOLBAR_TOP }}
            data-fmf-blocks-move
        >
            {isTargeted && (
                <button
                    className="DimensionsToolbar__stepper-btn"
                    onPointerDown={(e) => { e.stopPropagation(); onStep(-1) }}
                    aria-label={t('find-my-fit.viewer.decreaseDimension')}
                >
                    <SSRIcon paths={minus} />
                </button>
            )}

            {DIM_CONFIG.map((dim, i) => {
                if (isTargeted && dim.key !== targetedDimension) return null

                const isActive = dim.key === activeDimension || dim.key === targetedDimension
                const cellClass = [
                    'DimensionsToolbar__cell',
                    isActive ? 'DimensionsToolbar__cell--active' : '',
                    isTargeted ? 'DimensionsToolbar__cell--targeted' : '',
                ].filter(Boolean).join(' ')

                return (
                    <React.Fragment key={dim.key}>
                        {!isTargeted && i > 0 && <div className="DimensionsToolbar__separator" />}
                        <div
                            className={cellClass}
                            onPointerDown={isTargeted ? undefined : (e) => {
                                e.stopPropagation()
                                onDimensionTap(dim.key)
                            }}
                        >
                            <span className="DimensionsToolbar__cell-label">
                                {t(dim.tKey)}
                            </span>
                            <span className="DimensionsToolbar__cell-value">
                                {formatDimension(dimensionLabels[dim.key])}
                            </span>
                        </div>
                    </React.Fragment>
                )
            })}

            {isTargeted && (
                <>
                    <button
                        className="DimensionsToolbar__stepper-btn"
                        onPointerDown={(e) => { e.stopPropagation(); onStep(1) }}
                        aria-label={t('find-my-fit.viewer.increaseDimension')}
                    >
                        <SSRIcon paths={plus} />
                    </button>
                    <button
                        className="DimensionsToolbar__confirm-btn"
                        onPointerDown={(e) => { e.stopPropagation(); onConfirm() }}
                        aria-label={t('find-my-fit.viewer.confirmDimension')}
                    >
                        <SSRIcon paths={checkmark} />
                    </button>
                </>
            )}
        </div>
    )
}

export default DimensionsToolbar
