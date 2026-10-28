import React from 'react'
import { useTranslation } from 'react-i18next'
import Accordion, { AccordionItem } from '@ingka/accordion'
import SSRIcon from '@ingka/ssr-icon'
import colorSpectrumIcon from '@ingka/ssr-icon/paths/colour-spectrum'

import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'

import * as compositionsActions from 'models/compositions/actions'
import * as compositionsSelectors from 'models/compositions/selectors'
import { getProductTrackingInfo } from 'models/tracking/utils'

import { ART_ITEM } from 'constants/renderItemTypes'

import { ArtFrameStyleOptions } from './ArtFrameStyleOptions'
import { ArtFrameColorOptions } from './ArtFrameColorOptions'
import { ArtFrameMatteOptions } from './ArtFrameMatteOptions'

import './ArtItemCustomizations.scss'

export const ArtItemCustomizations: React.FunctionComponent = () => {
    const accordionId = React.useId()
    const { t } = useTranslation()
    const dispatch = useAppDispatch()

    const artItem = useAppSelector(compositionsSelectors.getSelectedRenderItem)
    if (artItem == null || artItem.renderType !== ART_ITEM) {
        return <div className="OptionSelectorView invalid">{t('artCustomize.select something in your room')}</div>
    }
    const {
        frame: { color, colors, mattes },
        frameId: selectedFrameId,
        colorId: selectedColorId,
        matteId: selectedMatteId,
    } = artItem

    const updateFrame = (frameId: number) =>
        dispatch(
            compositionsActions.updateSelectedCompositionRenderItem(
                { frameId },
                {
                    ...getProductTrackingInfo(artItem),
                    OriginalProperties: {
                        frameId: artItem.frameId,
                    },
                    FinalProperties: {
                        frameId,
                    },
                },
            ),
        )

    const updateFrameColor = (colorId: number) =>
        dispatch(
            compositionsActions.updateSelectedCompositionRenderItem(
                { colorId },
                {
                    ...getProductTrackingInfo(artItem),
                    OriginalProperties: {
                        colorId: artItem.colorId,
                    },
                    FinalProperties: {
                        colorId,
                    },
                },
            ),
        )
    const updateFrameMatte = (matteId: number) =>
        dispatch(
            compositionsActions.updateSelectedCompositionRenderItem(
                { matteId },
                {
                    ...getProductTrackingInfo(artItem),
                    OriginalProperties: {
                        matteId: artItem.matteId,
                    },
                    FinalProperties: {
                        matteId,
                    },
                },
            ),
        )
    return (
        <Accordion className="ArtItemCustomizations">
            <AccordionItem
                id={accordionId}
                title={
                    <h3 className="ArtItemCustomizations__title">
                        <SSRIcon paths={colorSpectrumIcon} />
                        <span>{t('design.customize')}</span>
                    </h3>
                }
            >
                <ul className="ArtItemCustomizations__optionGroups">
                    <li>
                        <ArtFrameStyleOptions value={selectedFrameId} onChange={updateFrame} />
                    </li>

                    {color && (
                        <li>
                            <ArtFrameColorOptions
                                options={Object.values(colors ?? {})}
                                value={selectedColorId}
                                onChange={updateFrameColor}
                            />
                        </li>
                    )}

                    <li>
                        <ArtFrameMatteOptions
                            options={Object.values(mattes ?? {})}
                            value={selectedMatteId}
                            onChange={updateFrameMatte}
                        />
                    </li>
                </ul>
            </AccordionItem>
        </Accordion>
    )
}
