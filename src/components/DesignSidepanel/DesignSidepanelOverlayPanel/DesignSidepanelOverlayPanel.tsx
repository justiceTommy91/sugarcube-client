/* eslint-disable no-param-reassign */
import * as React from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import Button, { type ButtonProps } from '@ingka/button'
import arrowLeftIcon from '@ingka/ssr-icon/paths/arrow-left'
import { TipOverWarning } from '../FurnitureOptionsOverlayPanel/TipOverWarning'

require('./DesignSidepanelOverlayPanel.scss')

type BackButtonProps = Pick<ButtonProps, 'ssrIcon' | 'text'>

export type DesignSidepanelOverlayPanelProps = {
    open: boolean
    heading: string
    children: React.ReactNode
    onClickBack: React.MouseEventHandler<HTMLElement>
    backButtonProps?: BackButtonProps | undefined
}

export const DesignSidepanelOverlayPanel: React.FunctionComponent<DesignSidepanelOverlayPanelProps> = ({
    open,
    heading,
    children,
    onClickBack,
    backButtonProps,
}) => {
    const { t } = useTranslation()
    backButtonProps = { text: t('design.go back'), ssrIcon: arrowLeftIcon, ...backButtonProps }
    return (
        <div
            className={classNames('DesignSidepanelOverlayPanel', { DesignSidepanelOverlayPanel_open: open })}
            id="DesignSidepanelOverlayPanel"
        >
            <div className="DesignSidepanelOverlayPanel__backdrop" />

            <div className="DesignSidepanelOverlayPanel__wrapper">
                <div className="DesignSidepanelOverlayPanel__header">
                    <div className="DesignSidepanelOverlayPanel__action">
                        <Button {...backButtonProps} iconOnly size="small" type="secondary" onClick={onClickBack} />
                    </div>

                    {heading}
                </div>

                <TipOverWarning />

                <div className="DesignSidepanelOverlayPanel__content">{children}</div>
            </div>
        </div>
    )
}
