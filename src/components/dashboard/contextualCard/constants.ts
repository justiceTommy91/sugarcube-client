import { TranslationKey } from 'i18next'

export enum ContextualCardType {
    'showroom',
    'roomBuilder',
    'appDownload',
    'kreativLite',
}

export type ContextualCardTitleKeys = TranslationKey<
    'dashboard',
    'dashboard.try a starter room' | 'dashboard.build a room' | 'dashboard.scan your room' | 'dashboard.upload an image'
>

export type ContextualCardBodyKeys = TranslationKey<
    'dashboard',
    | 'dashboard.jump into a space to try product'
    | 'dashboard.choose a shape and set precise dimensions'
    | 'dashboard.see how products look and fit in your own home'
    | 'dashboard.erase existing furniture in your photo'
>

export type ContextualCardAltKeys = TranslationKey<
    'dashboard',
    | 'dashboard.contextual.alt.an empty room with light colored walls'
    | 'dashboard.contextual.alt.a digital room layout shows wall measurements'
    | 'dashboard.contextual.alt.a hand holding a mobile device showing a scanned room'
    | 'dashboard.contextual.upload an image to see how products fit in your space'
>

export type ContextualCardBadgeKeys = TranslationKey<
    'dashboard',
    | 'dashboard.contextual.quick start'
    | 'dashboard.contextual.customizable'
    | 'dashboard.contextual.most personalized'
    | 'dashboard.contextual.best fit'
>

export type ContextualCardCtaTextKeys = TranslationKey<
    'dashboard',
    'dashboard.choose a room' | 'dashboard.build a room' | 'dashboard.scan your room' | 'dashboard.upload an image'
>

export type ContextualCardAlternateTitleKeys = TranslationKey<
    'dashboard',
    | 'dashboard.contextual.test ideas in an empty or furnished space'
    | 'dashboard.contextual.build a room to match your layout at home'
    | 'dashboard.contextual.visualize products together in your home'
    | 'dashboard.contextual.upload an image to see how products fit in your space'
>

export type ContextualHeaderTitleKeys = TranslationKey<
    'dashboard',
    | 'dashboard.contextual.get started below to try it in a room'
    | 'dashboard.contextual.it looks like you were exploring products'
    | 'dashboard.contextual.get started below to try product in a room'
    | 'dashboard.contextual.it looks like you were exploring'
>

export const CONTEXTUAL_CARDS: {
    id: ContextualCardType
    alternateTitle: ContextualCardAlternateTitleKeys
    body: ContextualCardBodyKeys
    title: ContextualCardTitleKeys
    image: string
    alt: ContextualCardAltKeys
    badge: ContextualCardBadgeKeys
    ctaText: ContextualCardCtaTextKeys
}[] = [
    {
        id: ContextualCardType.kreativLite,
        title: 'dashboard.upload an image',
        alternateTitle: 'dashboard.contextual.upload an image to see how products fit in your space',
        body: 'dashboard.erase existing furniture in your photo',
        image: '../kreativLite/dashboardCard.jpg',
        alt: 'dashboard.contextual.alt.a hand holding a mobile device showing a scanned room',
        badge: 'dashboard.contextual.best fit',
        ctaText: 'dashboard.upload an image',
    },
    {
        id: ContextualCardType.showroom,
        alternateTitle: 'dashboard.contextual.test ideas in an empty or furnished space',
        body: 'dashboard.jump into a space to try product',
        title: 'dashboard.try a starter room',
        image: 'contextual-choose-a-room.png',
        alt: 'dashboard.contextual.alt.an empty room with light colored walls',
        badge: 'dashboard.contextual.quick start',
        ctaText: 'dashboard.choose a room',
    },
    {
        id: ContextualCardType.roomBuilder,
        alternateTitle: 'dashboard.contextual.build a room to match your layout at home',
        body: 'dashboard.choose a shape and set precise dimensions',
        title: 'dashboard.build a room',
        image: 'contextual-build-a-room.jpg',
        alt: 'dashboard.contextual.alt.a digital room layout shows wall measurements',
        badge: 'dashboard.contextual.customizable',
        ctaText: 'dashboard.build a room',
    },
    {
        id: ContextualCardType.appDownload,
        title: 'dashboard.scan your room',
        alternateTitle: 'dashboard.contextual.visualize products together in your home',
        body: 'dashboard.see how products look and fit in your own home',
        image: 'contextual-scan-your-room.png',
        alt: 'dashboard.contextual.alt.a hand holding a mobile device showing a scanned room',
        badge: 'dashboard.contextual.most personalized',
        ctaText: 'dashboard.scan your room',
    },
]
