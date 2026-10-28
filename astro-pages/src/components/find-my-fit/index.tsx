import React, { useState, useRef } from 'react'
import { withPrefix } from 'gatsby'
import Image from '@ingka/image'
import Button from '@ingka/button'
import cameraIcon from '@ingka/ssr-icon/paths/camera'
import uploadIcon from '@ingka/ssr-icon/paths/arrow-up-to-base'
import type { Translations } from '@lib/static-paths-utils'
import * as Sentry from '@sentry/react'
import { AppProviders } from '@providers/AppProviders'
import { StatusProvider } from '@providers/StatusProvider'
import ErrorMessage from '@astro-components/common/ErrorMessage'
import { useReferrer } from '@astro-hooks/useReferrer'
import { FlagsManager } from '@astro-components/FlagManager'
import { trackError } from '@utils/tracker'
import { useUserContext } from '@providers/UserProvider'
import { makeLoginUrl } from '@lib/location-selectors'
import { getOrigin } from '@utils/urlParams'
import { useImageUpload } from '@gatsby/hooks/useImageUpload'
import { FMF_FILE_SELECT, GA_ACTION_FMF_FILE_SELECT } from '@lib/tracking/constants'
import { UPLOAD_STATUS_IDLE } from '@gatsby/components/dashboard/UploadImageModal/types'
import type { APIScene } from 'models/scenes'
import { useTranslation } from 'react-i18next'
import { CAPTURE_LITE_TYPE_FMF } from '@gatsby/services/imageUpload'
import { useFindMyFitSupportRedirect } from '@astro-hooks/useFindMyFitSupportRedirect'
import ChooseSampleSpace from './ChooseSampleSpace'
import LoginPromptModal from './LoginPromptModal'
import './styles.scss'

interface FindMyFitPageProps {
    locale: string
    market: string
    translations: Translations
    scenes: (APIScene | null)[]
}

const FindMyFitContent = ({ scenes, market }: { scenes: (APIScene | null)[]; market: string }) => {
    const { t } = useTranslation('find-my-fit')
    const { isLoggedIn, isLoading: isAuthLoading } = useUserContext()
    useReferrer()
    useFindMyFitSupportRedirect(market)
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const photoFileInputRef = useRef<HTMLInputElement>(null)

    const { handleFileSelect, uploadState } = useImageUpload({
        tracking: {
            fileSelectEvent: FMF_FILE_SELECT,
            gaAction: GA_ACTION_FMF_FILE_SELECT,
        },
        // Astro always serves pages at /{market}/home-design/... in all environments,
        // so we construct the path directly rather than using withPrefix (which strips
        // the market in dev mode).
        redirectPath: `/${market}/home-design/find-my-fit/upload`,
        type: CAPTURE_LITE_TYPE_FMF,
    })

    const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = e.target.files?.[0]
        if (!file) return
        await handleFileSelect(file)
    }

    const isUploading = uploadState.status !== UPLOAD_STATUS_IDLE

    const handlePhotoClick = () => {
        if (isAuthLoading) return
        if (!isLoggedIn) {
            setIsLoginModalOpen(true)
            return
        }
        photoFileInputRef.current?.click()
    }

    const handleUploadClick = () => {
        if (isAuthLoading) return
        if (!isLoggedIn) {
            setIsLoginModalOpen(true)
            return
        }
        fileInputRef.current?.click()
    }

    return (
        <div className="FindMyFitPage">
            <div className="content">
                <div className="hero">
                    <div className="preview--image-container">
                        <Image
                            className="preview--image"
                            src={withPrefix('/images/graphics/findMyFit/products-storage.png')}
                            alt={t('find-my-fit.hero.imageAlt')}
                            loading="eager"
                        />
                    </div>

                    <div className="hero-text">
                        <h1 className="title">{t('find-my-fit.hero.title')}</h1>
                        <p className="subtitle">{t('find-my-fit.hero.subtitle')}</p>
                        <div className="actions">
                            <Button
                                ssrIcon={cameraIcon}
                                onClick={handlePhotoClick}
                                type="primary"
                                text={t('find-my-fit.actions.takePhoto')}
                                loading={isUploading}
                            />
                            <Button
                                ssrIcon={uploadIcon}
                                onClick={handleUploadClick}
                                type="secondary"
                                text={t('find-my-fit.actions.uploadPhoto')}
                                loading={isUploading}
                            />
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileCapture}
                                className="buttonCamera--input"
                                disabled={isUploading}
                                ref={photoFileInputRef}
                            />
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileCapture}
                                className="buttonGallery--input"
                                disabled={isUploading}
                                ref={fileInputRef}
                            />
                        </div>
                    </div>
                </div>

                <ChooseSampleSpace scenes={scenes} />
            </div>

            <FlagsManager />
            <LoginPromptModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onLogin={() => {
                    window.location.href = makeLoginUrl(window.location.href)
                }}
                onSignup={
                    getOrigin().includes('ikea')
                        ? () => {
                              window.location.href = makeLoginUrl(window.location.href, true)
                          }
                        : undefined
                }
            />
        </div>
    )
}

const FindMyFitPage = ({ locale, market, translations, scenes }: FindMyFitPageProps) => (
    <Sentry.ErrorBoundary fallback={<ErrorMessage />} onError={trackError}>
        <AppProviders locale={locale} market={market} translations={translations}>
            <StatusProvider>
                <FindMyFitContent scenes={scenes} market={market} />
            </StatusProvider>
        </AppProviders>
    </Sentry.ErrorBoundary>
)

export default FindMyFitPage
