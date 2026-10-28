import React, { useEffect, useRef, useState } from 'react'
import { isAppleDevice } from '@utils/isMobile'
import { withPrefix } from 'gatsby'
import Button from '@ingka/button'
import SimpleVideo from '@ingka/simple-video'
import AspectRatioBox from '@ingka/aspect-ratio-box'
import cameraIcon from '@ingka/ssr-icon/paths/camera'
import Image from '@ingka/image'
import Skeleton from '@ingka/skeleton'
import { Trans, useTranslation } from 'react-i18next'
import { visit } from '@utils/tracker'
import { MP_FIND_MY_FIT_LANDING_SECTION_VIEWED } from '@lib/tracking/constants'
import SSRIcon from '@ingka/ssr-icon'
import uploadIcon from '@ingka/ssr-icon/paths/arrow-up-to-base'
import Dropdown from '@astro-components/common/Dropdown'
import './HeroSection.scss'

interface HeroSectionProps {
    market: string
    isUploading: boolean
    onAddPhotoClick: () => void
    onAddPhotoOpen: () => void
    onTakePhotoClick: () => void
    onUploadPhotoClick: () => void
    onTrySampleSpaceClick: () => void
    subtitle: string
    heroImages: string[] | null
    heroImagesLoading: boolean
    referrerContext: string | null
    referrerContextLoading: boolean
}

const HeroSection = ({
    market,
    isUploading,
    onAddPhotoClick,
    onAddPhotoOpen,
    onTakePhotoClick,
    onUploadPhotoClick,
    onTrySampleSpaceClick,
    subtitle,
    heroImages,
    heroImagesLoading,
    referrerContext,
    referrerContextLoading,
}: HeroSectionProps) => {
    const { t } = useTranslation('find-my-fit')
    const { t: tDashboard } = useTranslation('dashboard')
    const videoSrc = `${process.env.GATSBY_ASSET_BUCKET}/videos/fmf_landing_hero.mp4`
    const posterSrc = withPrefix('/images/graphics/findMyFit/findMyFitHero.jpg', market)
    const videoRef = useRef<HTMLVideoElement>(null)
    const sectionRef = useRef<HTMLElement>(null)
    const addPhotoWrapperRef = useRef<HTMLDivElement>(null)
    const hasTracked = useRef(false)
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [isIOS, setIsIOS] = useState(false)

    useEffect(() => {
        setIsIOS(isAppleDevice())
    }, [])

    useEffect(() => {
        const video = videoRef.current
        if (!video) return undefined

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    video.play().catch(() => undefined)
                } else {
                    video.pause()
                    video.currentTime = 0
                }
            },
            { threshold: 0.3 },
        )

        observer.observe(video)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (referrerContextLoading) return undefined

        const el = sectionRef.current
        if (!el) return undefined

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasTracked.current) {
                    hasTracked.current = true
                    visit(MP_FIND_MY_FIT_LANDING_SECTION_VIEWED, { Section: 'hero', ReferrerContext: referrerContext })
                }
            },
            { threshold: 0.5 },
        )

        observer.observe(el)
        return () => observer.disconnect()
    }, [referrerContextLoading, referrerContext])

    useEffect(() => {
        if (!isDropdownOpen) return undefined

        const handleOutsideClick = (e: MouseEvent) => {
            if (addPhotoWrapperRef.current && !addPhotoWrapperRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false)
            }
        }

        document.addEventListener('mousedown', handleOutsideClick)
        return () => document.removeEventListener('mousedown', handleOutsideClick)
    }, [isDropdownOpen])

    return (
        <section className="HeroSection" data-section="hero" ref={sectionRef}>
            <div className="HeroSection__content">
                <div className="HeroSection__image-container">
                    {heroImagesLoading ? (
                        <>
                            <div className="HeroSection__product-wrapper">
                                <Skeleton aria-busy height="96px" width="96px" tagName="div" />
                            </div>
                            <div className="HeroSection__product-wrapper">
                                <Skeleton aria-busy height="96px" width="96px" tagName="div" />
                            </div>
                        </>
                    ) : heroImages?.length ? (
                        heroImages.map((src) => (
                            <div key={src} className="HeroSection__product-wrapper">
                                <img className="HeroSection__product-image" src={src} alt="" />
                            </div>
                        ))
                    ) : (
                        <Image
                            className="HeroSection__image"
                            src={withPrefix('/images/graphics/findMyFit/products-storage.png')}
                            alt={t('find-my-fit.landing.hero.imageAlt')}
                            loading="eager"
                        />
                    )}
                </div>
                <div className="HeroSection__text">
                    <h1 className="HeroSection__title">{t('find-my-fit.landing.hero.title')}</h1>
                    <p className="HeroSection__subtitle">{subtitle}</p>
                </div>
                <div className="HeroSection__actions">
                    {isIOS ? (
                        <Button
                            ssrIcon={cameraIcon}
                            type="primary"
                            text={t('find-my-fit.landing.actions.addPhoto')}
                            onClick={onAddPhotoClick}
                            loading={isUploading}
                        />
                    ) : (
                        <div className="HeroSection__add-photo-wrapper" ref={addPhotoWrapperRef}>
                            <Button
                                id="fmf-add-photo-trigger"
                                ssrIcon={cameraIcon}
                                type="primary"
                                text={t('find-my-fit.landing.actions.addPhoto')}
                                onClick={() => {
                                    if (!isDropdownOpen) onAddPhotoOpen()
                                    setIsDropdownOpen((o) => !o)
                                }}
                                loading={isUploading}
                                aria-haspopup="menu"
                                aria-expanded={isDropdownOpen}
                            />
                            {isDropdownOpen && (
                                <Dropdown
                                    triggerId="fmf-add-photo-trigger"
                                    ariaLabel={t('find-my-fit.landing.actions.addPhoto')}
                                    onClose={() => setIsDropdownOpen(false)}
                                    className="HeroSection__add-photo-dropdown"
                                    items={[
                                        {
                                            id: 'take-photo',
                                            label: t('find-my-fit.landing.actions.takePhoto'),
                                            icon: <SSRIcon paths={cameraIcon} />,
                                            onClick: () => {
                                                setIsDropdownOpen(false)
                                                onTakePhotoClick()
                                            },
                                        },
                                        {
                                            id: 'upload-photo',
                                            label: t('find-my-fit.landing.actions.uploadPhoto'),
                                            icon: <SSRIcon paths={uploadIcon} />,
                                            onClick: () => {
                                                setIsDropdownOpen(false)
                                                onUploadPhotoClick()
                                            },
                                        },
                                    ]}
                                />
                            )}
                        </div>
                    )}
                    <Button
                        type="secondary"
                        text={t('find-my-fit.landing.actions.trySampleSpace')}
                        onClick={onTrySampleSpaceClick}
                    />
                </div>
                <div className="HeroSection__privacy-note">
                    <Trans i18nKey="landing.hero.privacyNote" ns="find-my-fit">
                        Please don&apos;t upload images with people, personal data or private items. Learn more in our{' '}
                        <a
                            href={`https://www.ikea.com/${market}/customer-service/privacy-policy/`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            privacy policy
                        </a>
                        .
                    </Trans>
                </div>
            </div>
            <div className="HeroSection__video-section">
                <div className="HeroSection__video-container">
                    <AspectRatioBox ratio="9:16">
                        <SimpleVideo
                            ref={videoRef}
                            className="HeroSection__video"
                            autoPlay
                            muted
                            loop
                            playsInline
                            poster={posterSrc}
                            src={videoSrc}
                            type="video/mp4"
                            descriptionId="fmf-landing-hero-video"
                            descriptionBody={t('find-my-fit.landing.hero.videoAlt')}
                            playAriaLabel={tDashboard('play')}
                            pauseAriaLabel={tDashboard('pause')}
                            emphasised={false}
                            additionalControls="bottomTrailing"
                        />
                    </AspectRatioBox>
                </div>
            </div>
        </section>
    )
}

export default HeroSection
