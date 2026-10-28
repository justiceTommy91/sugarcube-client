import { useEffect } from 'react'

/**
 * This should only be used in select contexts where we can legally hide the cookie consent and chat elements.
 * (e.g. Upptacka, an in-store only experience that does not collect user data)
 */
export const useHideCookieAndChatElements = () => {
    useEffect(() => {
        if (document?.body) {
            document.body.style.overflow = `hidden`
            // There can be multiple cookie consent/chatbot elements if our app is rendered in an iframe on an Ingka page
            const cookieConsents = document.querySelectorAll('.ot-sdk-container') as NodeListOf<HTMLDivElement>
            const chatBots = document.querySelectorAll(
                'div#syndeo-chatbot-start-chat-button',
            ) as NodeListOf<HTMLDivElement>
            cookieConsents.forEach((element) => {
                element.style.display = `none`
            })
            chatBots.forEach((element) => {
                element.style.display = `none`
            })
        }
    }, [])
}
