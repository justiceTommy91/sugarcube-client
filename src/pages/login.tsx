import React, { useEffect } from 'react'
import { HeadFC, graphql } from 'gatsby'

import PageMetadata from 'components/PageMetadata'
import RenderProvider from 'apps/RendererProvider'
import { visit } from 'utils/tracker'
import SignupForm from 'features/login/SignupForm'

require('./login.scss')

const WARNING = `For internal use only. Password login is not supported in prod.`

const LoginPage = () => {
    useEffect(() => {
        // Trigger visit on isLogin change
        visit('Login')
    }, []) // Runs whenever isLogin changes
    return (
        <div className="LoginPage">
            <div className="accountAccessFormContainer">
                <div className="form">
                    <RenderProvider>
                        <div className="SignupLogin">
                            <div className="signupForm">
                                <p>{WARNING}</p>
                                <SignupForm isLogin />
                            </div>
                        </div>
                    </RenderProvider>
                </div>
            </div>
        </div>
    )
}

export const Head: HeadFC = () => <PageMetadata page="Login" />

export const query = graphql`
    query ($language: String!) {
        locales: allLocale(filter: { language: { eq: $language } }) {
            edges {
                node {
                    ns
                    data
                    language
                }
            }
        }
    }
`

export default LoginPage
