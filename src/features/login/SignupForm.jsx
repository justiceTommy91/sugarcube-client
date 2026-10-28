import React, { useEffect, useState } from 'react'
import { bool } from 'prop-types'
import { withPrefix, Link } from 'gatsby'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import { isEmail, isPassword } from 'utils/validate'

import { getLoginStatusMessage, getSignupStatusMessage } from 'utils/login'
import { Input } from 'components/FormElements'
import ActionButton from 'components/uiElements/ActionButton'
import { loginUser, logoutUser, signupUser } from 'models/user/actions'
import { useAppDispatch, useAppSelector } from 'hooks'
import { getCurrentUser } from 'models/user/selectors'
import { getFromParam } from 'models/location/selectors'

require('./SignupForm.scss')

const SignupForm = ({ isLogin }) => {
    const dispatch = useAppDispatch()
    const logout = () => {
        dispatch(logoutUser())
    }
    const { t } = useTranslation()
    const currentUser = useAppSelector(getCurrentUser)
    const fromUrlParam = useAppSelector(getFromParam)
    const [fieldErrors, setFieldErrors] = useState({})

    /** @type {React.FormEventHandler<HTMLFormElement>} */
    const submit = (e) => {
        e.preventDefault()

        const data = new FormData(e.currentTarget)
        const email = data.get('email')
        const password = data.get('password')
        const passwordConfirm = data.get('passwordConfirm')

        const errors = {}
        if (!isEmail(email)) {
            errors.email = 'invalid email'
        }

        if (!isPassword(password)) {
            errors.password = 'invalid password'
        }

        if (!isLogin && password !== passwordConfirm) {
            errors.passwordConfirm = "passwords don't match"
        }

        setFieldErrors(errors)

        const valid = Object.keys(errors).length === 0
        if (!valid) {
            return
        }

        const userData = { email, password }
        if (isLogin) {
            dispatch(loginUser(userData))
        } else {
            dispatch(signupUser(userData))
        }
    }

    const [disabled, setDisabled] = useState(true)
    useEffect(() => {
        setDisabled(false)
    }, [])

    const showContinueToDesign = isLogin && !!fromUrlParam && currentUser.signupLoginStatus

    return (
        <form className="SignupForm" method="POST" onSubmit={submit}>
            <Input type="text" placeholder={t('common.email')} name="email" error={fieldErrors.email} />

            <Input type="password" placeholder={t('login.password')} name="password" error={fieldErrors.password} />

            {!isLogin && (
                <Input
                    type="password"
                    placeholder={t('login.confirm password')}
                    name="passwordConfirm"
                    error={fieldErrors.passwordConfirm}
                />
            )}

            {currentUser.signupLoginStatus && (
                <p
                    className={classNames('slMessage', {
                        error: currentUser.signupLoginStatus !== 200,
                    })}
                >
                    {isLogin
                        ? getLoginStatusMessage(t, currentUser.signupLoginStatus)
                        : getSignupStatusMessage(t, currentUser.signupLoginStatus)}
                </p>
            )}

            {!isLogin && <p className="slMessage reqs">{t('login.requirements')}</p>}

            <div className="buttonContainer">
                <ActionButton type="submit" disabled={disabled}>
                    {isLogin ? t('login.log in') : t('login.create account')}
                </ActionButton>
            </div>

            <a className="dashLink" href={withPrefix('/')}>
                Go to dashboard
            </a>

            {showContinueToDesign && (
                <div className="dashLink">
                    <Link to={fromUrlParam}>Continue to design</Link>
                </div>
            )}

            {currentUser.email && (
                <div className="currentAccount">
                    <div>{currentUser.email}</div>
                    <button className="logout" onClick={logout}>
                        Logout
                    </button>
                </div>
            )}
        </form>
    )
}

SignupForm.defaultProps = {
    isLogin: false,
}

SignupForm.propTypes = {
    isLogin: bool,
}

export default SignupForm
