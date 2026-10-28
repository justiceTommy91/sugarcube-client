import React from 'react'
import { useTranslation } from 'react-i18next'

import type { ColorOption } from 'models/compositions'

import { ArtOptionsGroup } from './ArtOptionsGroup'

import './ArtFrameColorOptions.scss'

export type ArtFrameColorOptionsProps = {
    options: ColorOption[]
    value: number
    onChange(colorId: number): void
}

export const ArtFrameColorOptions: React.FunctionComponent<ArtFrameColorOptionsProps> = ({
    options,
    value,
    onChange,
}) => {
    const { t } = useTranslation()
    const colorNames: Record<number, string> = {
        1: t('artCustomize.materialColors.white'),
        2: t('artCustomize.materialColors.brown'),
        3: t('artCustomize.materialColors.grey'),
    }
    return (
        <div className="ArtFrameColorOptions">
            <ArtOptionsGroup
                title={t('artCustomize.colors')}
                description={colorNames[value]}
                options={options.map((opt) => ({
                    label: colorNames[opt.id],
                    value: opt.id,
                }))}
                value={value}
                onChange={onChange}
            >
                {(cid) => (
                    <div
                        className="ArtFrameColorOptions__option"
                        style={{ backgroundColor: options.find((opt) => opt.id === cid)?.hex }}
                    />
                )}
            </ArtOptionsGroup>
        </div>
    )
}
