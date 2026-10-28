import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector, useAppDispatch } from 'hooks'

import { useImageUpload } from 'hooks/useImageUpload'
import { CAPTURE_LITE_TYPE_KREATIVLITE } from 'services/imageUpload'
import { PARAM_OPEN_UPLOAD } from 'models/location/constants'
import { fetchShowrooms } from 'models/showrooms/actions'
import { getUnfurnishedShowrooms } from 'models/showrooms/selectors'
import {
    KREATIVLITE_FILE_SELECT,
    GA_ACTION_KREATIVLITE_FILE_SELECT,
    GA_CATEGORY_DYH_SUGARCUBE,
} from 'models/tracking/constants'
import ControlledToast from 'toasts/ControlledToast'

import { BeforeAfterCarousel } from './BeforeAfterCarousel'
import { FeaturesCarousel } from './FeaturesCarousel'
import { FullExperienceCarousel } from './FullExperienceCarousel'
import { Hero } from './Hero'
import { RoomTemplateCarousel } from './RoomTemplateCarousel'
import { UploadSection } from './UploadSection'
import './MobileDashboardV3.scss'

export const MobileDashboardV3: React.FunctionComponent = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const showrooms = useAppSelector(getUnfurnishedShowrooms)
    const uploadSectionRef = useRef<HTMLDivElement>(null)

    const {
        uploadState,
        errorToast,
        clearErrorToast,
        handleFileSelect: uploadFileSelect,
    } = useImageUpload({
        tracking: {
            fileSelectEvent: KREATIVLITE_FILE_SELECT,
            gaAction: GA_ACTION_KREATIVLITE_FILE_SELECT,
            gaCategory: GA_CATEGORY_DYH_SUGARCUBE,
        },
        type: CAPTURE_LITE_TYPE_KREATIVLITE,
    })

    useEffect(() => {
        dispatch(fetchShowrooms())
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined') return
        const params = new URLSearchParams(window.location.search)
        if (params.get(PARAM_OPEN_UPLOAD) === 'true') {
            uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
            params.delete(PARAM_OPEN_UPLOAD)
            const newSearch = params.toString()
            window.history.replaceState(null, '', newSearch ? `?${newSearch}` : window.location.pathname)
        }
    }, [])

    const handleFileSelect = (file: File): void => {
        if (!file) return
        uploadFileSelect(file)
    }

    return (
        <div id="MobileDashboardV3">
            <Hero />
            <UploadSection containerRef={uploadSectionRef} onFileSelect={handleFileSelect} uploadState={uploadState} />
            <RoomTemplateCarousel showrooms={showrooms} />
            <FullExperienceCarousel />
            <BeforeAfterCarousel />
            <FeaturesCarousel />
            {errorToast && (
                <ControlledToast
                    text={errorToast}
                    onDismiss={clearErrorToast}
                    ariaLabelCloseBtn={t('aria.dismiss notification')}
                />
            )}
        </div>
    )
}

export default MobileDashboardV3
