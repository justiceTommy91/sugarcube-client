import React, { useCallback } from 'react'
import { connect } from 'react-redux'
import { RootState } from 'store'

import { click } from 'utils/tracker'
import { getShowLoginPromptModal } from 'models/ui/selectors'
import { requestLoginPage as requestLoginPageAction } from 'models/user/actions'
import { getIsSaving } from 'models/compositions/selectors'

import LoginPromptModal from 'components/accountAccess/LoginPromptModal'
import { showLoginPromptModal } from 'models/ui/actions'
import type { PageContext } from 'constants/contexts'

interface LoginPromptModalContainerProps {
    isOpen: boolean
    isSaving: boolean
    showModal: typeof showLoginPromptModal
    requestLoginPage: typeof requestLoginPageAction
    context: PageContext
}

const LoginPromptModalContainer = ({
    isOpen,
    isSaving,
    showModal,
    requestLoginPage,
    context,
}: LoginPromptModalContainerProps) => {
    const onClose = useCallback(() => {
        click('DecorateRoom.SignupLogin.OverlayCancel')
        showModal(false)
    }, [showModal])
    const onLogin = useCallback(() => requestLoginPage(false, context), [requestLoginPage])
    const onSignup = useCallback(() => requestLoginPage(true, context), [requestLoginPage])

    if (!isOpen) {
        return null
    }

    return <LoginPromptModal onClose={onClose} onLogin={onLogin} onSignup={onSignup} loading={isSaving} />
}

const mapStateToProps = (state: RootState) => ({
    isOpen: getShowLoginPromptModal(state),
    isSaving: getIsSaving(state),
})

const mapDispatchToProps = {
    showModal: showLoginPromptModal,
    requestLoginPage: requestLoginPageAction,
}

export default connect(mapStateToProps, mapDispatchToProps)(LoginPromptModalContainer)
