import type { TFunction } from 'i18next'

export const formatTime = (totalSeconds: number, t: TFunction): string => {
    if (totalSeconds <= 0) {
        return t('design.kreativLite.progress.almost done')
    }

    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const minuteLabel = minutes === 1 ? t('common.time.minute') : t('common.time.minutes')
    const secondLabel = seconds === 1 ? t('common.time.second') : t('common.time.seconds')

    const timeString =
        minutes > 0
            ? `${minutes} ${minuteLabel} ${seconds} ${secondLabel}`
            : `${seconds} ${secondLabel}`
    return t('design.kreativLite.progress.estimated time remaining', { time: timeString })
}
