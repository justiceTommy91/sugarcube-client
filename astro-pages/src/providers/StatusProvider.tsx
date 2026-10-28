import React, { type ReactNode, useEffect } from 'react'
import ErrorMessage from '@astro-components/common/ErrorMessage'
import { useStatus } from '@astro-hooks/useStatus'
import { visit, trackGoogleAnalytics } from '@utils/tracker'
import {
    GA_CATEGORY_DYH_SUGARCUBE,
    GA_ACTION_ERROR_PAGE_VISIT,
    GA_ACTION_CRITICAL_ERROR,
    GA_LABEL_CRITICAL_ERROR,
} from '@models/tracking/constants'
import { useSugarcubeContext } from './SugarcubeContext'

export const StatusProvider = ({ children }: { children: ReactNode }) => {
    const { locale } = useSugarcubeContext()
    const { hasOutage, outageMessage } = useStatus(locale)

    useEffect(() => {
        if (!hasOutage) return
        trackGoogleAnalytics(GA_CATEGORY_DYH_SUGARCUBE, GA_ACTION_ERROR_PAGE_VISIT, GA_LABEL_CRITICAL_ERROR)
        visit('ErrorPage', { Action: GA_ACTION_CRITICAL_ERROR, ErrorMessage: GA_LABEL_CRITICAL_ERROR, Href: window.location.href })
    }, [hasOutage])

    if (hasOutage) {
        return <ErrorMessage message={outageMessage} />
    }
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{children}</>
}
