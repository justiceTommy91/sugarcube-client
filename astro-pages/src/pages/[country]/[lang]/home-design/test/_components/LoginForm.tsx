/* eslint-disable i18next/no-literal-string */
import React, { useState } from 'react'
import { loginUser, logoutUser } from '@astro-services/userService'
import './LoginForm.scss'
import { useUserContext } from '@providers/UserProvider'
import { AppProviders } from '@providers/AppProviders'
import type { PartialTranslations, Translations } from '@lib/static-paths-utils'

const WARNING = 'For internal use only. Password login is not supported in prod.'

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const isPassword = (value: string) => value.length >= 8 && value.length <= 128

const getSafeRedirectUrl = (param: string): string | null => {
    try {
        const url = new URL(decodeURIComponent(param), window.location.origin)
        return url.origin === window.location.origin ? url.href : null
    } catch {
        return null
    }
}

const getStatusMessage = (status: number): string => {
    switch (status) {
        case 200:
        case 201:
            return 'Welcome!'
        case 400:
        case 401:
        case 403:
            return "Email and password don't match."
        case 422:
            return 'Email address or password is invalid.'
        case 500:
            return 'Something went wrong on our end, please try again later.'
        default:
            return 'An unexpected error occurred.'
    }
}

const LoginFormContent = () => {
    const { user, isLoggedIn, isLoading } = useUserContext()
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [statusMessage, setStatusMessage] = useState('')
    const [isError, setIsError] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const fromParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('from') : null
    const fromUrl = fromParam ? getSafeRedirectUrl(fromParam) : null

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        const email = data.get('email') as string
        const password = data.get('password') as string

        const errors: Record<string, string> = {}
        if (!isEmail(email)) errors.email = 'Invalid email'
        if (!isPassword(password)) errors.password = 'Password must be 8–128 characters'
        setFieldErrors(errors)
        if (Object.keys(errors).length > 0) return

        setIsSubmitting(true)
        setStatusMessage('')

        try {
            await loginUser({ email, password })
            setIsError(false)
            setStatusMessage(getStatusMessage(200))
            if (fromUrl) window.location.assign(fromUrl)

        } catch (err: unknown) {
            const status = (err as { status?: number })?.status ?? 500
            setIsError(true)
            setStatusMessage(getStatusMessage(status))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="LoginPage">
                <div className="accountAccessFormContainer">
                    <p className="warning">{WARNING}</p>
                    <p>Loading…</p>
                </div>
            </div>
        )
    }

    if (isLoggedIn) {
        return (
            <div className="LoginPage">
                <div className="accountAccessFormContainer">
                    <p className="warning">{WARNING}</p>
                    <div className="currentAccount">
                        <p>
                            Logged in as <strong>{user?.email}</strong>
                        </p>
                        {fromUrl && <a href={fromUrl}>Continue →</a>}
                        <button
                            onClick={async () => {
                                await logoutUser()
                                window.location.reload()
                            }}
                        >
                            Log out
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="LoginPage">
            <div className="accountAccessFormContainer">
                <p className="warning">{WARNING}</p>
                <form className="LoginForm" onSubmit={handleSubmit}>
                    <div className="field">
                        <input type="text" name="email" placeholder="Email" autoComplete="email" />
                        {fieldErrors.email && <span className="fieldError">{fieldErrors.email}</span>}
                    </div>
                    <div className="field">
                        <input type="password" name="password" placeholder="Password" autoComplete="current-password" />
                        {fieldErrors.password && <span className="fieldError">{fieldErrors.password}</span>}
                    </div>
                    {statusMessage && (
                        <p className={isError ? 'statusMessage error' : 'statusMessage'}>{statusMessage}</p>
                    )}
                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Logging in…' : 'Log in'}
                    </button>
                    {fromUrl && <a href={fromUrl}>Skip to page →</a>}
                </form>
            </div>
        </div>
    )
}

interface LoginFormProps {
    locale: string
    market: string
    translations: PartialTranslations
}

const LoginForm = ({ locale, market, translations }: LoginFormProps) => (
    <AppProviders locale={locale} market={market} translations={translations as Translations}>
        <LoginFormContent />
    </AppProviders>
)

export default LoginForm
