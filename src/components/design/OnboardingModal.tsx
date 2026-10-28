import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal, { Theatre } from '@ingka/modal'
import Button from '@ingka/button'

import type { Composition, SelectedCompositionTrackingRoomInfo } from 'models/compositions'
import { workflow } from 'utils/tracker'
import { withPrefix } from 'gatsby'
import { allScenesAreStandard3D } from 'models/scenes/utils'

require('./OnboardingModal.scss')

interface OnboardingModalProps {
    composition: Composition
    onSkip: () => void
    onComplete: () => void
    trackingInfo: SelectedCompositionTrackingRoomInfo
}

/* eslint-disable i18next/no-literal-string */
// const galleryMagicWindow = ['MW_01.png', 'MW_02.png', 'MW_03.png']
// const galleryMagicWindowEmpty = ['MWE_01.png', 'MWE_02.png', 'MWE_03.png']
const galleryShowroom = ['SR_01.jpg', 'SR_02.jpg', 'SR_03.jpg']
const galleryShowroomEmpty = ['SRE_01.jpg', 'SRE_02.jpg', 'SRE_03.jpg']
const galleryOwnRoom = ['OR_01.jpg', 'OR_02.jpg', 'OR_03.jpg', 'OR_04.jpg']
const helaRoom = ['HEL_01.jpg', 'HEL_02.jpg', 'HEL_03.jpg']
/* eslint-enable i18next/no-literal-string */

const OnboardingModal = ({ onSkip, onComplete, composition, trackingInfo }: OnboardingModalProps) => {
    const { t } = useTranslation()
    const [step, setStep] = useState(0)

    useEffect(() => {
        workflow('DecorateRoom.Onboarding', trackingInfo)
    }, [trackingInfo])

    let gallery: string[]

    // Check if this is a hela room (Standard3D scene type)
    if (allScenesAreStandard3D(composition.scene)) {
        gallery = helaRoom
    } else if (composition.isStock) {
        if (composition.renderItems.length) {
            gallery = galleryShowroom
        } else {
            gallery = galleryShowroomEmpty
        }
    } else {
        gallery = galleryOwnRoom
    }

    const isFinalStep = step === gallery.length - 1

    const nextText = isFinalStep ? t('design.lets go') : t('design.next')

    const onNext = () => {
        if (isFinalStep) {
            // Finished
            onComplete()
        } else {
            // Next slide
            setStep(step + 1)
            workflow('DecorateRoom.OnboardingNext', trackingInfo)
        }
    }

    return (
        <Modal className="OnboardingModal" visible handleCloseBtn={onSkip}>
            <Theatre header={null}>
                <div className="onboardingHeader">
                    <h3 className="obTitle">{t('design.tips title')}</h3>
                    <span>{`${step + 1}/${gallery.length}`}</span>
                </div>
                <img src={withPrefix(`/images/graphics/onboarding/${gallery[step]}`)} alt="" />
                <div className="onboardingFooter">
                    <Button text={nextText} type="emphasised" onClick={onNext} />
                    <Button text={t('design.skip tips')} onClick={onSkip} />
                </div>
            </Theatre>
        </Modal>
    )
}

export default OnboardingModal
