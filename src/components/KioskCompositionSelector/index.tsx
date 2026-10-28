import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import arrowLeft from '@ingka/ssr-icon/paths/arrow-left'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right'
import {
    FURNISHED,
    furnishedRoomsDev,
    emptyRoomsDev,
    furnishedRoomsProd,
    emptyRoomsProd,
    LIVING_ROOM,
    OFFICE,
    BEDROOM,
} from 'models/kiosk/constants'
import { isProd } from 'utils/environment'
import OpenCompositionTrackingType from 'models/tracking'
import classNames from 'classnames'
import { NEW_COMPOSITION_ID } from 'models/compositions/constants'

require('./styles.scss')

export interface KioskCompositionSelectorProps {
    closeModal: () => void
    roomType: string
    openComposition: (compositionId: string, trackingInfo?: OpenCompositionTrackingType) => void
    openScene: (sceneId: string, trackingInfo?: OpenCompositionTrackingType) => void
}

const KioskCompositionSelector = ({
    closeModal,
    roomType,
    openComposition,
    openScene,
}: KioskCompositionSelectorProps) => {
    const { t } = useTranslation()
    const [showroomType, setShowroomType] = useState('')

    const furnishedCompositions = isProd ? furnishedRoomsProd : furnishedRoomsDev
    const emptyCompositions = isProd ? emptyRoomsProd : emptyRoomsDev

    const compositions = roomType === FURNISHED ? furnishedCompositions : emptyCompositions

    const showroomTypes = new Set(compositions.map((composition) => composition.roomType))
    const showFilters = showroomTypes.size > 1
    const showLivingRoomFilter = showroomTypes.has(LIVING_ROOM)
    const showBedroomFilter = showroomTypes.has(BEDROOM)
    const showOfficeFilter = showroomTypes.has(OFFICE)

    let filteredCompositions = compositions
    if (showroomType) {
        filteredCompositions = compositions.filter((composition) => composition.roomType === showroomType)
    }

    const onCompositionSelect = (compositionId: string, sceneId: string, compositionName: string) => {
        const trackingInfo = {
            DesignName: compositionName,
            DesignId: compositionId,
            RoomId: sceneId,
        }
        if (compositionId === NEW_COMPOSITION_ID) {
            openScene(sceneId, trackingInfo)
        } else {
            openComposition(compositionId, trackingInfo)
        }
    }

    return (
        <div className="KioskCompositionSelector">
            <Button
                text={t('kiosk.go back')}
                type="secondary"
                onClick={closeModal}
                className="dismissButton"
                ssrIcon={arrowLeft}
            />

            {showFilters && (
                <div className="filterSection">
                    <div className="filterHeader">{t('kiosk.filter rooms by room type')}</div>
                    <div className="filterButtons">
                        <Button
                            text={t('kiosk.all room types')}
                            type="secondary"
                            className={classNames('filterButton', { isActive: showroomType === '' })}
                            onClick={() => setShowroomType('')}
                        />
                        {showLivingRoomFilter && (
                            <Button
                                text={t('kiosk.living room')}
                                type="secondary"
                                className={classNames('filterButton', { isActive: showroomType === LIVING_ROOM })}
                                onClick={() => setShowroomType(LIVING_ROOM)}
                            />
                        )}
                        {showBedroomFilter && (
                            <Button
                                text={t('kiosk.bedroom')}
                                type="secondary"
                                className={classNames('filterButton', { isActive: showroomType === BEDROOM })}
                                onClick={() => setShowroomType(BEDROOM)}
                            />
                        )}
                        {showOfficeFilter && (
                            <Button
                                text={t('kiosk.home office')}
                                type="secondary"
                                className={classNames('filterButton', { isActive: showroomType === OFFICE })}
                                onClick={() => setShowroomType(OFFICE)}
                            />
                        )}
                    </div>
                </div>
            )}
            <div className="compositionsGrid">
                <div className="gridInner">
                    {filteredCompositions.map((composition) => {
                        const { imageUrl, compositionId, sceneId, compositionTitle } = composition
                        const onClick = () =>
                            onCompositionSelect(compositionId.toString(), sceneId.toString(), compositionTitle)
                        return (
                            <div
                                key={`composition-selector-${compositionId}`}
                                className="compositionImageWrapper"
                                onClick={onClick}
                            >
                                <div className="compositionImage" style={{ backgroundImage: `url('${imageUrl}')` }} />

                                <div className="ctaSection">
                                    {compositionTitle && <div className="compositionTitle">{compositionTitle}</div>}
                                    <Button
                                        type="secondary"
                                        text={t('kiosk.start designing')}
                                        onClick={onClick}
                                        ssrIcon={arrowRight}
                                        iconPosition="trailing"
                                        className="startDesign"
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default KioskCompositionSelector
