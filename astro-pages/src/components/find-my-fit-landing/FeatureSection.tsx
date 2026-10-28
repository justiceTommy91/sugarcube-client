import React from 'react'
import './FeatureSection.scss'
import Image from '@ingka/image'

interface FeatureSectionProps {
    imageSrc: string
    title: string
    sectionId: string
    sectionRef: (el: HTMLElement | null) => void
}

const FeatureSection = ({ imageSrc, title, sectionId, sectionRef }: FeatureSectionProps) => (
    <div
        className="FeatureSection"
        data-section={sectionId}
        ref={sectionRef}
    >
        <Image
            className="FeatureSection__image"
            src={imageSrc}
            alt={title}
        />
        <p className="FeatureSection__title">{title}</p>
    </div>
)

export default FeatureSection
