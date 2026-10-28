import React from 'react'
import { withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'

import Image from '@ingka/image'
import Badge from '@ingka/badge'

import { DashboardKeys } from 'types/i18next'

import './HowItWorksGrid.scss'

type HowItWorksItem = {
    id: string
    image: string
    badgeKey: string
    altKey: string
}

const HOW_IT_WORKS_ITEMS: HowItWorksItem[] = [
    {
        id: 'photo-scan',
        image: 'how-it-works-grid-1.jpg',
        badgeKey: 'dashboard.how it works.photo scan',
        altKey: 'dashboard.how it works.alt.photo scan',
    },
    {
        id: 'room-builder',
        image: 'how-it-works-grid-2.jpg',
        badgeKey: 'dashboard.how it works.room builder',
        altKey: 'dashboard.how it works.alt.room builder',
    },
    {
        id: 'whole-room-scan',
        image: 'how-it-works-grid-3.jpg',
        badgeKey: 'dashboard.how it works.whole room scan',
        altKey: 'dashboard.how it works.alt.whole room scan',
    },
    {
        id: 'ready-made-room',
        image: 'how-it-works-grid-4.jpg',
        badgeKey: 'dashboard.how it works.ready-made room',
        altKey: 'dashboard.how it works.alt.ready-made room',
    },
]

export const HowItWorksGrid: React.FC = () => {
    const { t } = useTranslation('dashboard')

    return (
        <div className="HowItWorksGrid">
            <div className="gridContainer">
                {HOW_IT_WORKS_ITEMS.map((item) => (
                    <div key={item.id} className="gridItem">
                        <div className="imageWrapper">
                            <Image
                                src={withPrefix(`/images/graphics/dashboard/${item.image}`)}
                                alt={t(item.altKey as DashboardKeys).toString()}
                                className="gridImage"
                            />
                            <div className="badgeOverlay">
                                <Badge
                                    label={t(item.badgeKey as DashboardKeys).toString()}
                                    // eslint-disable-next-line i18next/no-literal-string
                                    colour="grey"
                                    // eslint-disable-next-line i18next/no-literal-string
                                    size="medium"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
