import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'

import TheaterModal from 'components/uiElements/TheaterModal'

require('./LoginPromptModal.scss')

interface LoginPromptModalProps {
    onClose: () => void
    onLogin: () => void
    onSignup: () => void
    loading?: boolean
}

const LoginPromptModal = ({ onClose, onLogin, onSignup, loading = false }: LoginPromptModalProps) => {
    const { t } = useTranslation()
    const wrapperRef = useRef(null)

    return (
        <div className="LoginPromptModal">
            <TheaterModal ref={wrapperRef} isOpen onClose={onClose} zLayer="top">
                <div className="modalContent">
                    <div className="modalHeader">{t('design.login to save')}</div>
                    <div className="modalBody">{t('design.login to save explain')}</div>
                    <div className="modalCTA">
                        <Button type="secondary" onClick={onSignup} loading={loading}>
                            {t('login.sign up')}
                        </Button>
                        <Button type="primary" onClick={onLogin} loading={loading}>
                            {t('login.login')}
                        </Button>
                    </div>
                </div>
            </TheaterModal>
        </div>
    )
}

export default LoginPromptModal
