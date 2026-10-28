import Toggle from '@ingka/toggle'
import { useAppDispatch, useAppSelector } from 'hooks'
import { ROOM_BUILDER_DIMENSION_TIP } from 'models/scenes/constants'
import { showImperialMeasurements } from 'models/ui/actions'
import { getShouldShowImperialMeasurements } from 'models/ui/selectors'
import { usePlannerTrackingInfo } from 'hooks/editor/usePlannerTrackingInfo'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { click } from 'utils/tracker'

require('./DimensionsSelect.scss')

export const DimensionsSelect = () => {
    const { t } = useTranslation('dashboard')
    const dispatch = useAppDispatch()
    const plannerTrackingInfo = usePlannerTrackingInfo()
    const shouldShowImperialMeasurements = useAppSelector(getShouldShowImperialMeasurements)

    const handleUnitToggle = () => {
        click('RoomBuilder.Unit', {
            ...plannerTrackingInfo,
            Unit: !shouldShowImperialMeasurements ? 'Imperial' : 'Metric',
        })
        dispatch(showImperialMeasurements())
    }

    return (
        <div className="DimensionsSelect">
            <div className="DimensionsSelect__text">
                <p>{t('dashboard.planner.edit the floor plan on the right')}</p>
            </div>

            <img
                src={ROOM_BUILDER_DIMENSION_TIP}
                alt={t('dashboard.alt.room builder dimension tip')}
                width={363}
                height={186}
            />

            <Toggle
                id="unit-toggle-id"
                className="DimensionsSelect__unitToggle"
                buttons={[{ text: t('dashboard.planner.feet') }, { text: t('dashboard.planner.centimeters') }]}
                onClick={handleUnitToggle}
                activeIndex={shouldShowImperialMeasurements ? 0 : 1}
            />
        </div>
    )
}
