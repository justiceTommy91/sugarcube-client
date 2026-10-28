import React, { useEffect } from 'react'
import classNames from 'classnames'

import { useAppSelector } from 'hooks'
import { RenderItemComplete } from 'models/compositions'
import { DesignSidepanelView, useDesignSidebarContext } from 'components/design/DesignSidepanelContext'
import * as compositionSelectors from 'models/compositions/selectors'
import { UpptackaEditFurniturePanelContent } from './UpptackaEditFurniturePanelContent'

require('./UpptackaEditFurniturePanel.scss')

export const UpptackaEditFurniturePanel: React.FC = () => {
    const { sidepanelViewDisplayed, displaySidepanelView } = useDesignSidebarContext()
    const selectedFurniture = useAppSelector(
        (state) => compositionSelectors.getSelectedCompositionRenderedFurnitureItem(state) as RenderItemComplete | null,
    )
    const furnitureId = selectedFurniture?.uniqueId
    useEffect(() => {
        displaySidepanelView(selectedFurniture ? DesignSidepanelView.EDIT : DesignSidepanelView.ADD)
    }, [selectedFurniture])

    if (!furnitureId) {
        return <div className="UpptackaEditFurniturePanel" />
    }
    const getIsShown = (sidepanelView: DesignSidepanelView) => DesignSidepanelView.EDIT === sidepanelView

    return (
        <div
            className={classNames('UpptackaEditFurniturePanel', {
                isVisible: getIsShown(sidepanelViewDisplayed),
            })}
        >
            <UpptackaEditFurniturePanelContent />
        </div>
    )
}
