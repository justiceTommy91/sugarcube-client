import React from 'react'
import { useTranslation } from 'react-i18next'

import Button from '@ingka/button'
import ProgressIndicator, { ProgressStep } from '@ingka/progress-indicator'
import SimpleVideo from '@ingka/simple-video'
import AspectRatioBox from '@ingka/aspect-ratio-box'
import linkOut from '@ingka/ssr-icon/paths/link-out'


import { getRegion } from 'models/location/selectors'
import { useDesignSidebarContext } from 'components/design/DesignSidepanelContext'
import { OVERLAY_PAX_CUSTOMIZE, getPAXPlannerUrl } from 'components/configurableProducts/constants'

import { DesignSidepanelOverlayPanel } from '../DesignSidepanelOverlayPanel'
import { PAXCodeTooltip } from './PAXCodeTooltip'

import './PAXCustomizePanel.scss'

const PAX_VIDEO_URL = `${process.env.GATSBY_ASSET_BUCKET}/videos/pax_customize.mp4`

export const PAXCustomizePanel = () => {
    const { t } = useTranslation()
    const { visibleOverlay, dismissOverlay, openPAXImportPanel } = useDesignSidebarContext()
    const paxPlannerUrl = getPAXPlannerUrl(getRegion())

    return (
        <DesignSidepanelOverlayPanel
            open={visibleOverlay?.overlay === OVERLAY_PAX_CUSTOMIZE}
            heading={t('configurableProducts.pax.customizePanel.heading')}
            onClickBack={dismissOverlay}
        >
            <div className="PAXCustomizePanel">
                <AspectRatioBox ratio='16:9' className="PAXCustomizePanel__videoWrapper">
                    <SimpleVideo
                        src={PAX_VIDEO_URL}
                        type="video/mp4"
                        className="PAXCustomizePanel__video"
                        // eslint-disable-next-line i18next/no-literal-string
                        descriptionId="pax-customize-video"
                        descriptionBody={t('configurableProducts.pax.customizePanel.heading')}
                        playAriaLabel={t('configurableProducts.pax.customizePanel.videoPlay')}
                        pauseAriaLabel={t('configurableProducts.pax.customizePanel.videoPause')}
                        muted
                        loop
                        autoPlay
                        emphasised={false}
                        additionalControls="bottomTrailing"
                    />
                </AspectRatioBox>

                <p className="PAXCustomizePanel__heroCopy">
                    {t('configurableProducts.pax.customizePanel.heroCopy')}
                </p>

                <ProgressIndicator
                    ariaLabel={t('configurableProducts.pax.customizePanel.heading')}
                    completedLabel={t('configurableProducts.pax.customizePanel.stepsCompleted')}
                    incompleteLabel={t('configurableProducts.pax.customizePanel.stepsIncomplete')}
                    current={3}
                    size="medium"
                    subtle
                    type="number"
                    vertical
                >
                    <ProgressStep
                        label={
                            <div className="PAXCustomizePanel__stepContent">
                                <span className="PAXCustomizePanel__stepLabelRow">
                                    {t('configurableProducts.pax.customizePanel.step1Label')}</span>
                                <Button
                                    type="primary"
                                    ssrIcon={linkOut}
                                    iconPosition="trailing"
                                    text={t('configurableProducts.pax.customizePanel.step1Button')}
                                    onClick={() => window.open(paxPlannerUrl, '_blank', 'noopener,noreferrer')}
                                    size='small'

                                />
                            </div>
                        }

                    />
                    <ProgressStep
                        label={
                            <div className="PAXCustomizePanel__stepContent">
                                <span className="PAXCustomizePanel__stepLabelRow">
                                    {t('configurableProducts.pax.customizePanel.step2Label')}
                                    <PAXCodeTooltip />
                                </span>

                                <p className="PAXCustomizePanel__stepHelper">
                                    {t('configurableProducts.pax.customizePanel.step2Helper')}
                                </p>
                            </div>
                        }
                    />
                    <ProgressStep
                        label={
                            <div className="PAXCustomizePanel__stepContent">
                                <span className="PAXCustomizePanel__stepLabelRow">{
                                    t('configurableProducts.pax.customizePanel.step3Label')}</span>
                                <Button
                                    type="secondary"
                                    text={t('configurableProducts.pax.customizePanel.step3Button')}
                                    onClick={openPAXImportPanel}
                                    size='small'
                                />
                            </div>
                        }
                    />
                </ProgressIndicator>
            </div>
        </DesignSidepanelOverlayPanel>
    )
}
