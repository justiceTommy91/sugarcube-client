import React from 'react'
import { bool, func } from 'prop-types'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import Tooltip from 'components/Tooltip'

require('./DesignModeSelector.scss')

const DesignModeSelector = ({ magicEraserMode, updateMagicEraserMode }) => {
    const { t } = useTranslation()

    return (
        <div className="DesignModeSelector">
            <div className={classNames('modeSelector', { editing: magicEraserMode })}>
                <Tooltip describedById="magicEraserDesignBtn" title={t('tooltip.add furniture to room')}>
                <button
                    onClick={() => updateMagicEraserMode(false)}
                    data-testid="design-mode-selector"
                    aria-pressed={!magicEraserMode}
                    className={classNames('magicEraserButton', { selected: !magicEraserMode })}
                >
                    {t('design.design room')}
                </button>
                </Tooltip>

                <Tooltip describedById="magicEraserEditBtn" title={t('tooltip.hide unwanted items')}>
                <button
                    onClick={() => updateMagicEraserMode(true)}
                    data-testid="edit-mode-selector"
                    aria-pressed={magicEraserMode}
                    className={classNames('magicEraserButton', { selected: magicEraserMode })}
                >
                    {t('design.edit image')}
                </button>
                </Tooltip>
            </div>
        </div>
    )
}

DesignModeSelector.propTypes = {
    magicEraserMode: bool.isRequired,
    updateMagicEraserMode: func.isRequired,
}

export default DesignModeSelector
