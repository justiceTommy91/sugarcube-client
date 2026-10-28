import React from 'react'
import { useTranslation } from 'react-i18next'

import { useAppDispatch } from 'hooks/useAppDispatch'
import { useDesignSidebarContext } from 'components/design/DesignSidepanelContext'
import { OVERLAY_PAX_IMPORT } from 'components/configurableProducts/constants'
import { requestPAXImport } from 'models/paxDesigns/actions'

import { DesignSidepanelOverlayPanel } from '../DesignSidepanelOverlayPanel'
import { MyDesigns } from './MyDesigns'
import { VPCCodeInput } from './VPCCodeInput'

import './PAXImportPanel.scss'

export const PAXImportPanel = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const { visibleOverlay, dismissOverlay } = useDesignSidebarContext()

    const handleCodeSubmit = (vpcCode: string) => {
        dispatch(requestPAXImport(vpcCode))
    }

    return (
        <DesignSidepanelOverlayPanel
            open={visibleOverlay?.overlay === OVERLAY_PAX_IMPORT}
            heading={t('configurableProducts.pax.importPanel.heading')}
            onClickBack={dismissOverlay}
        >
            <div className="PAXImportPanel">
                <VPCCodeInput onSubmit={handleCodeSubmit} />
                <MyDesigns onImport={handleCodeSubmit} />
            </div>
        </DesignSidepanelOverlayPanel>
    )
}
