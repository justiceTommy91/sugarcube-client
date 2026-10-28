import React, { type ChangeEvent, useState } from 'react'
import Modal, { Prompt, ModalFooter, ModalHeader } from '@ingka/modal'
import { IconPill } from '@ingka/pill'
import Button from '@ingka/button'
import FormField from '@ingka/form-field'
import TextArea from '@ingka/text-area'
import feedbackSad from '@ingka/ssr-icon/paths/feedback-sad'
import feedbackDissatisfied from '@ingka/ssr-icon/paths/feedback-dissatisfied'
import feedbackNeutral from '@ingka/ssr-icon/paths/feedback-neutral'
import feedbackSatisfied from '@ingka/ssr-icon/paths/feedback-satisfied'
import feedbackHappy from '@ingka/ssr-icon/paths/feedback-happy'
import './CsatSurvey.scss'

const CHARACTER_LIMIT = 300

export interface CsatSurveyLabels {
    title: string
    cancel: string
    ratingLabels: {
        bad: string
        dissatisfied: string
        neutral: string
        satisfied: string
        good: string
    }
    goodOrBad: string
    feedbackPlaceholder: string
    submitLabel: string
    ratingDescription: string
}

interface CsatSurveyProps {
    labels: CsatSurveyLabels
    onSubmit: (rating: number, description: string) => void
    onDismiss: (screenIndex: number, rating: number | null) => void
    onClose: () => void
}

const RATING_ICONS = [feedbackSad, feedbackDissatisfied, feedbackNeutral, feedbackSatisfied, feedbackHappy]

const CsatSurvey = ({ labels, onSubmit, onDismiss, onClose }: CsatSurveyProps) => {
    const [screenIndex, setScreenIndex] = useState(0)
    const [rating, setRating] = useState<number | null>(null)
    const [description, setDescription] = useState('')
    const [characterCount, setCharacterCount] = useState(0)

    const ratingLabelList = [
        labels.ratingLabels.bad,
        labels.ratingLabels.dissatisfied,
        labels.ratingLabels.neutral,
        labels.ratingLabels.satisfied,
        labels.ratingLabels.good,
    ]

    const handleRate = (rate: number) => {
        setRating(rate)
        setScreenIndex(1)
    }

    const handleDescriptionChange = (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(e.target.value)
        setCharacterCount(e.target.value.length)
    }

    const handleSend = () => {
        if (rating === null) return
        onSubmit(rating, description)
        onClose()
    }

    const handleClose = () => {
        onDismiss(screenIndex, rating)
        onClose()
    }

    const ratingPills = (
        <div className="CsatSurvey__rating">
            {RATING_ICONS.map((icon, i) => {
                const value = i + 1
                return (
                    <div key={value} className="CsatSurvey__rating-item">
                        <IconPill
                            onClick={() => handleRate(value)}
                            ssrIcon={icon}
                            selected={rating === value}
                            ariaLabel={ratingLabelList[i]}
                        />
                    </div>
                )
            })}
        </div>
    )

    return (
        <div className="CsatSurvey">
            {screenIndex === 0 && (
                <Modal visible handleCloseBtn={handleClose} className="CsatSurvey__modal">
                    <Prompt
                        title={labels.title}
                        titleId="csat-survey-1"
                        footer={null}
                        header={<ModalHeader ariaCloseTxt={labels.cancel} />}
                    >
                        <p className="CsatSurvey__rating-instruction">{labels.ratingDescription}</p>
                        {ratingPills}
                    </Prompt>
                </Modal>
            )}

            {screenIndex === 1 && (
                <Modal visible handleCloseBtn={handleClose} className="CsatSurvey__modal">
                    <Prompt
                        title={labels.title}
                        titleId="csat-survey-2"
                        footer={
                            <ModalFooter>
                                <Button
                                    text={labels.submitLabel}
                                    type="primary"
                                    onClick={handleSend}
                                    disabled={description === '' || characterCount > CHARACTER_LIMIT}
                                />
                            </ModalFooter>
                        }
                        header={<ModalHeader ariaCloseTxt={labels.cancel} />}
                    >
                        {ratingPills}
                        <p className="CsatSurvey__anything-else">
                            <div>{labels.goodOrBad}</div>
                        </p>
                        <FormField fieldHelper={{ msg: labels.feedbackPlaceholder }}>
                            <TextArea
                                label=""
                                value={description}
                                onChange={handleDescriptionChange}
                                onKeyDown={(e) => e.stopPropagation()}
                            />
                        </FormField>
                        <p className="CsatSurvey__char-count">
                            {characterCount}/{CHARACTER_LIMIT}
                        </p>
                    </Prompt>
                </Modal>
            )}
        </div>
    )
}

export default CsatSurvey
