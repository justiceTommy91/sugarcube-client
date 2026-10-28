import React from 'react'

import type { HtmlAttributeBag, Labelled, OverrideableHtmlAttributes } from './common'
import { useAriaTabs } from './useAriaTabs'

export type UseAriaTabCarouselArgs = Labelled & {
    nSlides: number
}

export type UseAriaTabCarouselResult = {
    selectedSlide: number
    isFirstSlideActive(): boolean
    isLastSlideActive(): boolean
    selectNextSlide(): void
    selectPrevSlide(): void
    selectSlide(slideN: number): void
    carouselProps<T extends HTMLElement>(props?: OverrideableHtmlAttributes<T>): HtmlAttributeBag<T>
    slidesContainerProps<T extends HTMLElement>(props?: OverrideableHtmlAttributes<T>): HtmlAttributeBag<T>
    slideProps<T extends HTMLElement>(slideN: number, props?: OverrideableHtmlAttributes<T>): HtmlAttributeBag<T>
    slidePickersContainerProps<T extends HTMLElement>(props?: OverrideableHtmlAttributes<T>): HtmlAttributeBag<T>
    slidePickerButtonProps(
        slideN: number,
        props?: OverrideableHtmlAttributes<HTMLButtonElement>,
    ): HtmlAttributeBag<HTMLButtonElement>
    prevButtonProps(props?: OverrideableHtmlAttributes<HTMLButtonElement>): HtmlAttributeBag<HTMLButtonElement>
    nextButtonProps(props?: OverrideableHtmlAttributes<HTMLButtonElement>): HtmlAttributeBag<HTMLButtonElement>
}

export const useAriaTabCarousel = ({ nSlides, ...labelProps }: UseAriaTabCarouselArgs): UseAriaTabCarouselResult => {
    const tabs = useAriaTabs({
        tabs: Array.from({ length: nSlides }, (v, k) => k),
        defaultTab: 0,
        ...labelProps,
    })
    const { 'aria-label': label, 'aria-labelledby': labelledBy } = labelProps
    const carouselId = React.useId()
    const slideContainerId = React.useId()
    return React.useMemo(() => {
        const selectedSlide = tabs.selectedTab
        const selectSlide = tabs.selectTab
        const selectNextSlide = tabs.selectNextTab
        const selectPrevSlide = tabs.selectPrevTab
        const isFirstSlideActive = () => selectedSlide === 0
        const isLastSlideActive = () => selectedSlide === nSlides - 1
        return {
            selectedSlide,
            isFirstSlideActive,
            isLastSlideActive,
            selectSlide,
            selectNextSlide,
            selectPrevSlide,
            carouselProps<T extends HTMLElement>(props?: OverrideableHtmlAttributes<T>) {
                return {
                    ...props,
                    id: carouselId,
                    'aria-roledescription': 'carousel',
                    'aria-label': label,
                    'aria-labelledby': labelledBy,
                    onKeyDown: tabs.tablistProps().onKeyDown,
                }
            },
            slidesContainerProps<T extends HTMLElement>(props?: OverrideableHtmlAttributes<T>) {
                return {
                    ...props,
                    id: slideContainerId,
                    'aria-live': 'off',
                }
            },
            slideProps<T extends HTMLElement>(slideN: number, props?: OverrideableHtmlAttributes<T>) {
                return {
                    ...tabs.tabpanelProps<T>(slideN, props),
                    'aria-roledescription': 'slide',
                    'aria-label': `${slideN + 1} of ${nSlides}`,
                }
            },
            slidePickersContainerProps<T extends HTMLElement>(props?: OverrideableHtmlAttributes<T>) {
                return {
                    ...tabs.tablistProps(props),
                    'aria-labelledby': carouselId,
                }
            },
            slidePickerButtonProps(slideN, props) {
                return {
                    ...tabs.tabProps(slideN, props),
                }
            },
            prevButtonProps(props) {
                return {
                    ...props,
                    'aria-hidden': true,
                    tabIndex: -1,
                    onPointerDown(event) {
                        // Don't take focus on click.
                        event.preventDefault()
                    },
                    onClick(event) {
                        selectPrevSlide()
                        props?.onClick?.(event)
                    },
                }
            },
            nextButtonProps(props) {
                return {
                    ...props,
                    'aria-hidden': true,
                    tabIndex: -1,
                    onPointerDown(event) {
                        // Don't take focus on click
                        event.preventDefault()
                    },
                    onClick(event) {
                        selectNextSlide()
                        props?.onClick?.(event)
                    },
                }
            },
        }
    }, [tabs, label, labelledBy, nSlides])
}
