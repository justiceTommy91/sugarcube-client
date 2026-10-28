import classNames from 'classnames'
import React, { HTMLProps } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'

import * as compositionActions from 'models/compositions/actions'
import * as compositionSelectors from 'models/compositions/selectors'

require('./ProductMirror.scss')

const MAX_MIRROR_STRINGS_LENGTH = 30

type SegmentedButtonProps = Omit<HTMLProps<HTMLInputElement>, 'id' | 'type'> & {
    label: string
}

const SegmentedButton: React.FunctionComponent<SegmentedButtonProps> = ({ label, ...props }) => {
    const inputId = React.useId()
    return (
        <label className="SegmentedButton" htmlFor={inputId}>
            <input id={inputId} type="radio" {...props} />

            {label}
        </label>
    )
}

const ProductMirror: React.FunctionComponent = () => {
    const dispatch = useAppDispatch()

    const { t } = useTranslation()

    const compositionId = useAppSelector(compositionSelectors.getSelectedCompositionId)
    const furnitureId = useAppSelector(compositionSelectors.getSelectedRenderItemId)
    const renderItem = useAppSelector((state) => compositionSelectors.getRenderItemById(state, furnitureId))

    if (!renderItem) {
        return null
    }

    const hasLongStrings = t('design.left').length + t('design.right').length > MAX_MIRROR_STRINGS_LENGTH
    return (
        <div className={classNames('ProductMirror', { hasLongStrings })}>
            <h3 className="ProductMirror__header">{t('design.choose orientation')}</h3>

            <fieldset className="ProductMirror__choices">
                <SegmentedButton
                    data-testid="config-left-btn"
                    label={t('design.left')}
                    checked={!renderItem.mirrorOptionEnabled}
                    onClick={() =>
                        dispatch(compositionActions.enableMirrorOption(compositionId, renderItem.uniqueId, false))
                    }
                />

                <SegmentedButton
                    data-testid="config-right-btn"
                    label={t('design.right')}
                    checked={renderItem.mirrorOptionEnabled}
                    onClick={() =>
                        dispatch(compositionActions.enableMirrorOption(compositionId, renderItem.uniqueId, true))
                    }
                />
            </fieldset>
        </div>
    )
}

export default ProductMirror
