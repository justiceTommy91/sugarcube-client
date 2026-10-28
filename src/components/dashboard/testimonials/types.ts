import { SVGProps } from 'react'
import { TranslationKey } from 'i18next'

export type MorpheusStoryTitleKeys = TranslationKey<
    'dashboard',
    | 'dashboard.stories.explore ikea products'
    | 'dashboard.stories.arrange items'
    | 'dashboard.stories.personalize your space'
    | 'dashboard.stories.share and remix room designs'
    | 'dashboard.stories.choose products easily'
>

export type MorpheusStoryDescriptionKeys = TranslationKey<
    'dashboard',
    | 'dashboard.stories.search browse and discover products'
    | 'dashboard.stories.get started fast with built in design assistance'
    | 'dashboard.stories.introduce your style with wall colors'
    | 'dashboard.stories.save time effort and street'
    | 'dashboard.stories.see how items look and fit before you buy'
>

export type ChoiceCard = {
    id: number
    title: MorpheusStoryTitleKeys
    description: MorpheusStoryDescriptionKeys
    icon?: (prefix?: string) => SVGProps<SVGElement>[]
    singleImage?: string
}
