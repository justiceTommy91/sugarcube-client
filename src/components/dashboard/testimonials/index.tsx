import { navigate, withPrefix } from 'gatsby'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import Image from '@ingka/image'
import Button from '@ingka/button'
import Choice, { ChoiceItem } from '@ingka/choice'

import { track, trackGoogleAnalytics } from 'utils/tracker'
import {
    ACCESS_FROM_SHOWCASE,
    GA_ACTION_LEARN_MORE_GO_TO_ROOMS,
    GA_ACTION_LEARN_MORE_SHOW_CASE_CLICK,
    GA_CATEGORY_DYH_SUGARCUBE,
    GA_SHOWCASE_LABEL,
} from 'models/tracking/constants'
import { getSearch } from 'models/location/selectors'

import { ChoiceCard } from './types'
import { MORPHEUS_KREATIV_SPACE_CHOICES } from './constants'
import './styles.scss'

type TestimonialsProps = {
    customButtonText?: string
}

export const Testimonials: React.FunctionComponent<TestimonialsProps> = ({ customButtonText }) => {
    const testimonialsData = MORPHEUS_KREATIV_SPACE_CHOICES
    const [selectedCard, setSelectedCard] = useState<ChoiceCard>(testimonialsData[0])
    const [isContainerFocused, setIsContainerFocused] = useState(false)
    const [isHovering, setIsHovering] = useState<boolean>(false)

    const containerRef = useRef<HTMLDivElement>(null)

    const { t } = useTranslation('dashboard')
    const imgSrc = (image?: string) => withPrefix(`/images/graphics/dashboard/${image}`)

    const onCaseClick = (card: ChoiceCard, position: number) => {
        setSelectedCard(card)

        const morpheusTrackingInfo = {
            ShowCaseIndex: position,
        }
        trackGoogleAnalytics(
            GA_CATEGORY_DYH_SUGARCUBE,
            GA_ACTION_LEARN_MORE_SHOW_CASE_CLICK,
            `${morpheusTrackingInfo.ShowCaseIndex}`,
        )
        track('LearnMore.ShowCaseClick', morpheusTrackingInfo)
    }

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && isContainerFocused) {
                event.preventDefault()
                const currentIndex = testimonialsData.findIndex((choice) => choice.id === selectedCard.id)
                let nextIndex
                if (event.key === 'ArrowUp') {
                    nextIndex = currentIndex - 1 < 0 ? testimonialsData.length - 1 : currentIndex - 1
                } else {
                    nextIndex = (currentIndex + 1) % testimonialsData.length
                }
                onCaseClick(testimonialsData[nextIndex], nextIndex)
            }
        },
        [isContainerFocused, selectedCard],
    )

    const goToRooms = () => {
        trackGoogleAnalytics(GA_CATEGORY_DYH_SUGARCUBE, GA_ACTION_LEARN_MORE_GO_TO_ROOMS, GA_SHOWCASE_LABEL)
        track('LearnMore.GoToRooms', { UseCaseIndex: selectedCard.id, AccessFrom: ACCESS_FROM_SHOWCASE })
        navigate(`?${getSearch()}#tryBedroom`)
    }

    const isElementInViewport = (element: HTMLDivElement) => {
        const rect = element.getBoundingClientRect()

        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        )
    }

    useEffect(() => {
        if (!isHovering) {
            const interval = setInterval(() => {
                if (containerRef.current && isElementInViewport(containerRef.current)) {
                    setSelectedCard((prevChoice) => {
                        const nextIndex = testimonialsData.findIndex((choice) => choice.id === prevChoice.id) + 1
                        return testimonialsData[nextIndex % testimonialsData.length]
                    })
                }
            }, 7000)
            return () => clearInterval(interval)
        }

        return () => undefined
    }, [])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [selectedCard, handleKeyDown])

    return (
        <div
            className="Testimonials"
            id="value-prop"
            /* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */
            tabIndex={0}
            onFocus={() => setIsContainerFocused(true)}
            onBlur={() => setIsContainerFocused(false)}
        >
            <div className="content">
                <div
                    className="container"
                    onKeyDown={() => onCaseClick(testimonialsData[selectedCard.id - 1], selectedCard.id)}
                    ref={containerRef}
                >
                    <div className="choiceContainer">
                        <Choice className="choices" size="medium" deselectable>
                            {testimonialsData.map((card, index) => {
                                const isSelected = selectedCard?.id === card.id
                                return (
                                    <ChoiceItem
                                        title={t(card.title)}
                                        caption={isSelected ? t(card.description) : undefined}
                                        id={String(card.id)}
                                        ssrIcon={!isSelected ? card.icon : undefined}
                                        imageAlignment="center"
                                        imagePosition="trailing"
                                        size="large"
                                        className={classNames('choice', { selected: isSelected })}
                                        subtle={!isSelected}
                                        onClick={() => onCaseClick(card, index)}
                                        onMouseEnter={() => setIsHovering(true)}
                                        onMouseLeave={() => setIsHovering(false)}
                                    />
                                )
                            })}
                        </Choice>
                    </div>
                    <div
                        className="testimonialContainer"
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                    >
                        <div className="imageContainer">
                            <Image src={imgSrc(selectedCard.singleImage)} className="room" />
                        </div>

                        <div className="row">
                            <div className="morpheusInfo">
                                <div className="infoTitle">
                                    {t('dashboard.stories.ikea kreativ for bedroom is here')}
                                </div>
                                <div className="actions">
                                    <Button
                                        text={customButtonText ?? t('dashboard.go to rooms')}
                                        size="small"
                                        type="primary"
                                        onClick={goToRooms}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
