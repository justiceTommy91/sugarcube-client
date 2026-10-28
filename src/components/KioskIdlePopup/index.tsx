import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal, { Prompt, ModalFooter } from '@ingka/modal'
import Button from '@ingka/button'

import './styles.scss'

interface KioskIdlePopupProps {
    closeModal: () => void
}

const IDLE_TIMEOUT = 30 // seconds
let lastInteract = Date.now()

const KioskIdlePopup = ({ closeModal }: KioskIdlePopupProps) => {
    const { t } = useTranslation()
    const [isVisible, setIsVisible] = useState(false)

    const checkIdle = useCallback(() => {
        // Check how long it has been since the last interaction
        const currentTime = Date.now()
        const delta = currentTime - lastInteract

        if (!isVisible && delta > IDLE_TIMEOUT * 1000) {
            setIsVisible(true)
        }
    }, [isVisible])

    const onResetDelay = () => {
        lastInteract = Date.now()
    }

    const onClose = () => {
        onResetDelay()
        setIsVisible(false)
    }

    const onRestart = () => {
        // TODO works for H22 only
        // Refresh the page and go to dashboard
        window.location.href = `/dashboard`
    }

    useEffect(() => {
        onResetDelay()
        window.addEventListener('mousemove', onResetDelay)
        window.addEventListener('touchstart', onResetDelay)
        return () => {
            window.removeEventListener('mousemove', onResetDelay)
            window.removeEventListener('touchstart', onResetDelay)
        }
    }, [])

    useEffect(() => {
        // Check for idle every second
        const idleChecker = window.setInterval(checkIdle, 1000)

        return () => {
            window.clearInterval(idleChecker)
        }
    }, [checkIdle])

    return (
        <Modal visible={isVisible} handleCloseBtn={onClose} escapable className="KioskIdlePopup">
            <Prompt
                title={t('kiosk.idle question')}
                className="kioskPromptBody"
                header={null}
                titleId="KioskIdlePopup"
                footer={
                    <ModalFooter className="kioskIntroFooter">
                        <Button
                            text={t('kiosk.keep designing')}
                            type="tertiary"
                            onClick={closeModal}
                            className="dismissButton"
                        />
                        <Button
                            text={t('kiosk.idle restart')}
                            type="emphasised"
                            onClick={onRestart}
                            className="dismissButton"
                        />
                    </ModalFooter>
                }
            >
                <p>{t('kiosk.idle statement')}</p>
            </Prompt>
        </Modal>
    )
}

export default KioskIdlePopup
