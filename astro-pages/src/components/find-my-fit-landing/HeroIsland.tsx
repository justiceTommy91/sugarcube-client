import React, { useState, useRef } from 'react'
import * as Sentry from '@sentry/react'
import { AppProviders } from '@providers/AppProviders'
import { StatusProvider } from '@providers/StatusProvider'
import ErrorMessage from '@astro-components/common/ErrorMessage'
import { trackError, click } from '@utils/tracker'
import { useReferrerContent } from '@astro-hooks/useReferrerContent'
import { useTranslation } from 'react-i18next'
import { FlagsManager } from '@astro-components/FlagManager'
import type { Translations } from '@lib/static-paths-utils'
import { useFindMyFitSupportRedirect } from '@astro-hooks/useFindMyFitSupportRedirect'
import { useUserContext } from '@providers/UserProvider'
import { useImageUpload } from '@gatsby/hooks/useImageUpload'
import { UPLOAD_STATUS_IDLE } from '@gatsby/components/dashboard/UploadImageModal/types'
import { CAPTURE_LITE_TYPE_FMF } from '@gatsby/services/imageUpload'
import {
    FMF_FILE_SELECT,
    FMF_IMAGE_UPLOAD,
    GA_ACTION_FMF_FILE_SELECT,
    GA_ACTION_FMF_IMAGE_UPLOAD,
    MP_FIND_MY_FIT_LANDING_PHOTO_ACTION_CLICK,
    MP_FIND_MY_FIT_LANDING_TRY_SAMPLE_SPACE_CLICK,
} from '@lib/tracking/constants'
import HeroSection from './HeroSection'
import SampleSpacesModal from './SampleSpacesModal'
import './HeroIsland.scss'

interface HeroContentProps {
    market: string
}

const HeroContent = ({ market }: HeroContentProps) => {
    const { t } = useTranslation('find-my-fit')
    useFindMyFitSupportRedirect(market)
    const [isSampleSpacesModalOpen, setIsSampleSpacesModalOpen] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const photoFileInputRef = useRef<HTMLInputElement>(null)
    const { isLoggedIn } = useUserContext()

    const { handleFileSelect, uploadState } = useImageUpload({
        tracking: {
            fileSelectEvent: FMF_FILE_SELECT,
            gaAction: GA_ACTION_FMF_FILE_SELECT,
            imageUploadEvent: FMF_IMAGE_UPLOAD,
            gaActionImageUpload: GA_ACTION_FMF_IMAGE_UPLOAD,
        },
        redirectPath: `/${market}/home-design/find-my-fit/upload`,
        type: CAPTURE_LITE_TYPE_FMF,
    })

    const isUploading = uploadState.status !== UPLOAD_STATUS_IDLE

    const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = e.target.files?.[0]
        if (!file) return
        await handleFileSelect(file)
    }

    const trackPhotoAction = () => click(MP_FIND_MY_FIT_LANDING_PHOTO_ACTION_CLICK, { IsLoggedIn: isLoggedIn })

    const handleAddPhotoClick = () => {
        trackPhotoAction()
        fileInputRef.current?.click()
    }

    const handleTakePhotoClick = () => photoFileInputRef.current?.click()
    const handleUploadPhotoClick = () => fileInputRef.current?.click()

    const handleTrySampleSpaceClick = () => {
        click(MP_FIND_MY_FIT_LANDING_TRY_SAMPLE_SPACE_CLICK, { IsLoggedIn: isLoggedIn })
        setIsSampleSpacesModalOpen(true)
    }

    const {
        images: heroImages,
        subject,
        loading: heroImagesLoading,
        referrerContext,
        referrerContextLoading,
    } = useReferrerContent()
    const subjectTextLowerCased = subject
        ? subject.toLowerCase()
        : t('find-my-fit.landing.hero.genericCategory').toLowerCase()
    const heroSubtitle = t('find-my-fit.landing.hero.subtitle', { subject: subjectTextLowerCased })

    return (
        <>
            <HeroSection
                market={market}
                isUploading={isUploading}
                onAddPhotoClick={handleAddPhotoClick}
                onAddPhotoOpen={trackPhotoAction}
                onTakePhotoClick={handleTakePhotoClick}
                onUploadPhotoClick={handleUploadPhotoClick}
                onTrySampleSpaceClick={handleTrySampleSpaceClick}
                subtitle={heroSubtitle}
                heroImages={heroImages}
                heroImagesLoading={heroImagesLoading}
                referrerContext={referrerContext}
                referrerContextLoading={referrerContextLoading}
            />
            <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileCapture}
                disabled={isUploading}
                ref={photoFileInputRef}
                className="HeroIsland__hidden-input"
            />
            <input
                type="file"
                accept="image/*"
                onChange={handleFileCapture}
                disabled={isUploading}
                ref={fileInputRef}
                className="HeroIsland__hidden-input"
            />
            <SampleSpacesModal isOpen={isSampleSpacesModalOpen} onClose={() => setIsSampleSpacesModalOpen(false)} />
            <FlagsManager />
        </>
    )
}

interface HeroIslandProps {
    locale: string
    market: string
    translations: Translations
}

const HeroIsland = ({ locale, market, translations }: HeroIslandProps) => (
    <Sentry.ErrorBoundary fallback={<ErrorMessage />} onError={trackError}>
        <AppProviders locale={locale} market={market} translations={translations}>
            <StatusProvider>
                <HeroContent market={market} />
            </StatusProvider>
        </AppProviders>
    </Sentry.ErrorBoundary>
)

export default HeroIsland
