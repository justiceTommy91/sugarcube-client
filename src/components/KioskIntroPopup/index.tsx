import React from 'react'
import { useTranslation } from 'react-i18next'
import Modal, { Prompt, ModalFooter } from '@ingka/modal'
import Button from '@ingka/button'
import Icon from 'components/uiElements/Icon'
import SSRIcon from '@ingka/ssr-icon'
import layout from '@ingka/ssr-icon/paths/layout'
import link from '@ingka/ssr-icon/paths/link'

import './styles.scss'
import { withPrefix } from 'gatsby'

interface KioskIntroPopupProps {
    closeModal: () => void
    isVisible: boolean
}

const KioskIntroPopup = ({ closeModal, isVisible }: KioskIntroPopupProps) => {
    const { t } = useTranslation()

    return (
        <Modal visible={isVisible} handleCloseBtn={closeModal} escapable className="KioskIntroPopup">
            <Prompt
                title={t('kiosk.visualize your dream home')}
                className="kioskPromptBody"
                header={null}
                titleId="KioskIntroPopup"
                footer={
                    <ModalFooter className="kioskIntroFooter">
                        <Button
                            data-testid="kiosk-dismiss-button"
                            text={t('kiosk.lets go')}
                            type="secondary"
                            onClick={closeModal}
                            className="dismissButton"
                        />
                    </ModalFooter>
                }
            >
                <p>{t('kiosk.try one of our spaces')}</p>
                <div className="steps">
                    <div className="stepOne">
                        <div className="iconWrapper">
                            <div className="Icon">
                                <SSRIcon paths={layout} />
                            </div>
                        </div>
                        <div className="stepText">{t('kiosk.pick a room')}</div>
                    </div>
                    <div className="stepTwo">
                        <div className="iconWrapper">
                            <Icon code="designPlay" svg />
                        </div>
                        <div className="stepText">{t('kiosk.design & Play')}</div>
                    </div>
                    <div className="stepThree">
                        <div className="iconWrapper">
                            <div className="Icon">
                                <SSRIcon paths={link} />
                            </div>
                        </div>
                        <div className="stepText">{t('kiosk.save or share')}</div>
                    </div>
                    <div className="arcOne">
                        <img src={withPrefix('/images/kiosk/arcQuarter.svg')} alt="" />
                    </div>
                    <div className="arcTwo">
                        <img src={withPrefix('/images/kiosk/arcHorizontal.svg')} alt="" />
                    </div>
                </div>
            </Prompt>
        </Modal>
    )
}

export default KioskIntroPopup
