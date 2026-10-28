import React, { useCallback } from 'react'
import { connect } from 'react-redux'

import { requestLoginPage as requestLoginPageAction } from 'models/user/actions'

import AuthMessage from 'components/dashboard/AuthMessage'
import { CONTEXT_DASHBOARD } from 'constants/contexts'

interface AuthMessageContainerProps {
    requestLoginPage: typeof requestLoginPageAction
}

const AuthMessageContainer = ({ requestLoginPage }: AuthMessageContainerProps) => {
    const onLogin = useCallback(() => requestLoginPage(false, CONTEXT_DASHBOARD), [requestLoginPage])
    const onSignup = useCallback(() => requestLoginPage(true, CONTEXT_DASHBOARD), [requestLoginPage])

    return <AuthMessage onLogin={onLogin} onSignup={onSignup} />
}

const mapDispatchToProps = {
    requestLoginPage: requestLoginPageAction,
}

export default connect(null, mapDispatchToProps)(AuthMessageContainer)
