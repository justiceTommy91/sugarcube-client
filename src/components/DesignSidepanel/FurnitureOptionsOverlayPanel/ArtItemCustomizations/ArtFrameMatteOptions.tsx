import React from 'react'
import { useTranslation } from 'react-i18next'

import type { MatteOption } from 'models/compositions'

import { ArtOptionsGroup } from './ArtOptionsGroup'

import './ArtFrameMatteOptions.scss'

export type ArtFrameMatteOptionsProps = {
    options: MatteOption[]
    value: number
    onChange(matteId: number): void
}

export const ArtFrameMatteOptions: React.FunctionComponent<ArtFrameMatteOptionsProps> = ({
    options,
    value,
    onChange,
}) => {
    const { t } = useTranslation()
    const iconLabelId = React.useId()
    const matteNames: Record<number, { label: string; icon?: React.ReactElement; innerColor?: string }> = {
        1: {
            label: t('artCustomize.no matt'),
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" role="img" aria-labelledby={iconLabelId}>
                    <title id={iconLabelId}>{t('artCustomize.no matt')}</title>
                    <line x1="0" y1="0" x2="500" y2="500" stroke="#F00" strokeWidth={30} />
                    <rect width="500" height="500" strokeWidth={2} stroke="#000" fillOpacity={0} />
                    <rect width="300" height="300" strokeWidth={2} stroke="#000" fill="transparent" x="100" y="100" />
                </svg>
            ),
        },
        10: {
            label: t('artCustomize.mats.white mat'),
        },
        11: {
            label: t('artCustomize.mats.white mat with black core'),
            innerColor: '#000',
        },
        12: {
            label: t('artCustomize.mats.grey mat'),
        },
    }
    return (
        <div className="ArtFrameMatteOptions">
            <ArtOptionsGroup
                title={t('artCustomize.mats.mats')}
                description={matteNames[value]?.label}
                options={options.map((opt) => ({
                    label: matteNames[opt.id]?.label ?? 'unknown',
                    value: opt.id,
                }))}
                value={value}
                onChange={onChange}
            >
                {(mid) => {
                    const option = options.find((opt) => opt.id === mid)
                    // eslint-disable-next-line i18next/no-literal-string
                    const color = option?.hex ?? '#fff'
                    // eslint-disable-next-line i18next/no-literal-string
                    const { innerColor = 'transparent', icon } = matteNames[mid] ?? {}
                    return (
                        <div className="ArtFrameMatteOptions__option">
                            {icon ?? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" role="img" aria-labelledby={iconLabelId}>
                                    <title id={iconLabelId}>{matteNames[mid]?.label}</title>
                                    <rect width="500" height="100" fill={color} />
                                    <rect width="100" height="300" fill={color} y="100" x="400" />
                                    <rect width="500" height="100" fill={color} y="400" />
                                    <rect width="100" height="300" fill={color} y="100" />
                                    <rect width="500" height="500" strokeWidth={2} stroke="#000" fillOpacity={0} />
                                    <rect
                                        width="300"
                                        height="300"
                                        strokeWidth={2}
                                        stroke="#000"
                                        fill={innerColor}
                                        x="100"
                                        y="100"
                                    />
                                </svg>
                            )}
                        </div>
                    )
                }}
            </ArtOptionsGroup>
        </div>
    )
}
