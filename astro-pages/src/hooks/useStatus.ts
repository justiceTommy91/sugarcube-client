import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import * as Sentry from '@sentry/react'
import { fetchSupportStatus, type SupportStatus } from '@astro-services/statusService'

export const useStatus = (locale: string) => {
    const { data, error } = useQuery<SupportStatus>({
        queryKey: ['support-status'],
        queryFn: fetchSupportStatus,
        refetchInterval: 5 * 60 * 1000,
    })

    useEffect(() => {
        if (error) Sentry.captureException(error)
    }, [error])

    const lang = locale.split('-')[0].split('_')[0]
    const message = data?.messagesByLanguage[lang] ?? null

    return {
        hasOutage: error != null || (data?.outage ?? false),
        outageMessage: message,
    }
}
