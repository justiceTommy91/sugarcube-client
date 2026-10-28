import React from 'react'
import { useTranslation } from 'react-i18next'

import { ART_FRAMES } from 'models/furniture/artConstants'

import { ArtOptionsGroup } from './ArtOptionsGroup'

import './ArtFrameStyleOptions.scss'

export type ArtFrameOptionsProps = {
    value: number
    onChange(frameId: number): void
}

export const ArtFrameStyleOptions: React.FunctionComponent<ArtFrameOptionsProps> = ({ value, onChange }) => {
    const { t } = useTranslation()
    const frameNames: Record<number, string> = {
        1: t('artCustomize.frameTypes.canvas'),
        2: t('artCustomize.frameTypes.gallery wide'),
        3: t('artCustomize.frameTypes.gallery'),
        4: t('artCustomize.frameTypes.traditional'),
    }
    return (
        <div className="ArtFrameStyleOptions">
            <ArtOptionsGroup
                title={t('artCustomize.frames')}
                description={frameNames[value]}
                options={Object.keys(ART_FRAMES).map((fid) => ({
                    label: frameNames[Number(fid)],
                    value: Number(fid),
                }))}
                value={value}
                onChange={onChange}
            >
                {(fid) => {
                    const frameData = ART_FRAMES[fid as keyof typeof ART_FRAMES]
                    return (
                        <img
                            className="ArtFrameStyleOptions__option"
                            alt={frameNames[fid]}
                            width={96}
                            height={96}
                            src={frameData?.thumbUrl}
                        />
                    )
                }}
            </ArtOptionsGroup>
        </div>
    )
}
