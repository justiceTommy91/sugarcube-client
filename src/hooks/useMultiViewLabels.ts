import { useTranslation } from 'react-i18next'
import { getUpptackaCompositionName } from 'components/upptackaDesignTips/utils'
import { getRouteCompositionIds } from 'models/location/selectors'

export const useMultiViewLabels = (showDollhouseViews?: boolean) => {
    const { t } = useTranslation()
    const { compositionId } = getRouteCompositionIds()
    // Due to how the EPA showrooms are set up, the arrangement of their views have been changed with the top view at the end
    const epaShowroomCompositionNames = ['palo_alto_cozy_organized', 'palo_alto_multipurpose', 'palo_alto_starter_set']
    const isEpaShowroomComposition = epaShowroomCompositionNames.includes(
        getUpptackaCompositionName(compositionId || ''),
    )
    if (isEpaShowroomComposition)
        return [
            t('design.multiView.front'),
            t('design.right'),
            t('design.multiView.back'),
            t('design.left'),
            t('design.multiView.dollhouse front'),
            t('design.multiView.dollhouse back'),
            t('design.multiView.top'),
        ]
    if (showDollhouseViews) return [t('design.multiView.front'), t('design.multiView.back')]

    return [
        t('design.multiView.front'),
        t('design.right'),
        t('design.multiView.back'),
        t('design.left'),
        t('design.multiView.top'),
        t('design.multiView.dollhouse front'),
        t('design.multiView.dollhouse back'),
    ]
}
