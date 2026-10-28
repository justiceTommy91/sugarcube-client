import React from 'react'
import Modal, { Prompt, ModalBody, ModalFooter } from '@ingka/modal'
import Button from '@ingka/button'
import { useTranslation } from 'react-i18next'
import { click } from '@utils/tracker'
import {
    FMF_LOGIN_PROMPT_CLICK,
    FMF_LOGIN_PROMPT_ACTION_LOGIN,
    FMF_LOGIN_PROMPT_ACTION_SIGNUP,
} from '@lib/tracking/constants'

import '@ingka/modal/dist/style.css'
import './LoginPromptModal.scss'

interface LoginPromptModalProps {
    isOpen: boolean
    onClose: () => void
    onLogin: () => void
    onSignup?: () => void
}

const LoginPromptModal = ({ isOpen, onClose, onLogin, onSignup }: LoginPromptModalProps) => {
    const { t } = useTranslation('find-my-fit')

    const handleLogin = () => {
        click(FMF_LOGIN_PROMPT_CLICK, { LoginAction: FMF_LOGIN_PROMPT_ACTION_LOGIN })
        onLogin()
    }

    const handleSignup = () => {
        click(FMF_LOGIN_PROMPT_CLICK, { LoginAction: FMF_LOGIN_PROMPT_ACTION_SIGNUP })
        onSignup?.()
    }

    return (
        <Modal visible={isOpen} handleCloseBtn={onClose} className="LoginPromptModal">
            <Prompt
                title={t('find-my-fit.loginPrompt.title')}
                titleId="login-prompt-title"
                header={null}
                footer={
                    <ModalFooter>
                        {onSignup && <Button type="secondary" text={t('find-my-fit.loginPrompt.signUp')} onClick={handleSignup} />}
                        <Button type="primary" text={t('find-my-fit.loginPrompt.logIn')} onClick={handleLogin} />
                    </ModalFooter>
                }
            >
                <ModalBody>{t('find-my-fit.loginPrompt.body')}</ModalBody>
            </Prompt>
        </Modal>
    )
}

export default LoginPromptModal
