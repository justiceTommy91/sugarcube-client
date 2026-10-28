import React from 'react'
import { useTranslation } from 'react-i18next'

import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'

import cross from '@ingka/ssr-icon/paths/cross'
import { setStarterSetSidebarVisible } from 'models/ui/actions'
import { getStarterSetSidebarVisible } from 'models/ui/selectors'
import StarterSetSidePanel from 'components/StarterSet/StarterSetSidepanel/StarterSetSidepanel'
import { click } from 'utils/tracker'
import { ACTION_STARTER_SET_SIDEPANEL_SKIP } from 'models/tracking/constants'
import { DesignSidepanelOverlayPanel } from '../DesignSidepanelOverlayPanel'

export const StarterSetSidepanelOverlayPanel = () => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()

    const isStarterSetSidebarVisible = useAppSelector(getStarterSetSidebarVisible)
    const closeStarterSetSidePanel = () => dispatch(setStarterSetSidebarVisible(false))
    return (
        <DesignSidepanelOverlayPanel
            open={isStarterSetSidebarVisible}
            heading={t('design.starterSet.sidepanel heading')}
            backButtonProps={{
                ssrIcon: cross,
                text: '',
            }}
            onClickBack={() => {
                click(ACTION_STARTER_SET_SIDEPANEL_SKIP)
                closeStarterSetSidePanel()
            }}
        >
            <StarterSetSidePanel />
        </DesignSidepanelOverlayPanel>
    )
}
