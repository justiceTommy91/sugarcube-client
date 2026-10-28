import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import Button from '@ingka/button'
import SSRIcon from '@ingka/ssr-icon'
import menuIcon from '@ingka/ssr-icon/paths/menu'
import questionMarkCircle from '@ingka/ssr-icon/paths/question-mark'
import shareNetworkIcon from '@ingka/ssr-icon/paths/share-network'
import chevronSlash from '@ingka/ssr-icon/paths/chevron-left-slash-chevron-right'

import './PAXCodeTooltip.scss'

export const PAXCodeTooltip = () => {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div
            className="PAXCodeTooltip"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <Button
                iconOnly
                ssrIcon={questionMarkCircle}
                type="tertiary"
                size="xsmall"
                text={t('configurableProducts.pax.customizePanel.step2Tooltip')}
            />
            {isOpen && (
                <div className="PAXCodeTooltip__popover" role="tooltip">
                    <p className="PAXCodeTooltip__title">
                        {t('configurableProducts.pax.customizePanel.codeTooltip.title')}
                    </p>

                    <p className="PAXCodeTooltip__optionLabel">
                        {t('configurableProducts.pax.customizePanel.codeTooltip.option1')}
                    </p>
                    <p className="PAXCodeTooltip__optionBody">
                        <span>{t('configurableProducts.pax.customizePanel.codeTooltip.option1Body_start')}</span>
                        <strong>{t('configurableProducts.pax.customizePanel.codeTooltip.option1Body_bold')}</strong>
                        <span>{t('configurableProducts.pax.customizePanel.codeTooltip.option1Body_end')}</span>
                    </p>

                    <p className="PAXCodeTooltip__optionLabel">
                        {t('configurableProducts.pax.customizePanel.codeTooltip.option2')}
                    </p>
                    <ol className="PAXCodeTooltip__steps">
                        <li>
                            <div className="PAXCodeTooltip__stepRow">
                                <span>
                                    {t('configurableProducts.pax.customizePanel.codeTooltip.option2Step1_start')}
                                    <strong>{t('configurableProducts.pax.customizePanel.codeTooltip.option2Step1_bold')}</strong>
                                </span>
                                <SSRIcon paths={menuIcon} className="PAXCodeTooltip__icon" />
                            </div>
                        </li>
                        <li>
                            <div className="PAXCodeTooltip__stepRow">
                                <span>
                                    {t('configurableProducts.pax.customizePanel.codeTooltip.option2Step2_start')}
                                    <strong>{t('configurableProducts.pax.customizePanel.codeTooltip.option2Step2_bold')}</strong>
                                </span>
                                <SSRIcon paths={shareNetworkIcon} className="PAXCodeTooltip__icon" />
                            </div>
                        </li>
                        <li>
                            <div className="PAXCodeTooltip__stepRow">
                                <span>
                                    {t('configurableProducts.pax.customizePanel.codeTooltip.option2Step3_start')}
                                    <strong>{t('configurableProducts.pax.customizePanel.codeTooltip.option2Step3_bold')}</strong>
                                </span>
                                <SSRIcon paths={chevronSlash} className="PAXCodeTooltip__icon" />
                            </div>
                        </li>
                    </ol>
                </div>
            )}
        </div>
    )
}
