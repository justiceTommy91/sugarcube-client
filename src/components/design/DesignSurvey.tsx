import React, { ChangeEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SelectedCompositionTrackingRoomInfo } from 'models/compositions'
import Modal, { Prompt, ModalFooter, ModalHeader } from '@ingka/modal'
import { IconPill } from '@ingka/pill'
import Button from '@ingka/button'
import feedbackSad from '@ingka/ssr-icon/paths/feedback-sad'
import feedbackDissatisfied from '@ingka/ssr-icon/paths/feedback-dissatisfied'
import feedbackNeutral from '@ingka/ssr-icon/paths/feedback-neutral'
import feedbackSatisfied from '@ingka/ssr-icon/paths/feedback-satisfied'
import feedbackHappy from '@ingka/ssr-icon/paths/feedback-happy'
import FormField from '@ingka/form-field'
import TextArea from '@ingka/text-area'
import { click } from 'utils/tracker'
import classNames from 'classnames'
import ModalWrapper from '../ModalWrapper'

require('./DesignSurvey.scss')

// Internal Mixpanel event names, not user-facing copy.
// eslint-disable-next-line i18next/no-literal-string
const DESIGN_FEEDBACK_SUBMIT_EVENT = 'DecorateRoom.DesignFeedback.Submit'
// eslint-disable-next-line i18next/no-literal-string
const BEAUTIFY_FEEDBACK_SUBMIT_EVENT = 'DecorateRoom.Beautify.DesignFeedback.Submit'
// eslint-disable-next-line i18next/no-literal-string
const DESIGN_WRITTEN_FEEDBACK_EVENT = 'DecorateRoom.DesignWrittenFeedback'
// eslint-disable-next-line i18next/no-literal-string
const BEAUTIFY_WRITTEN_FEEDBACK_EVENT = 'DecorateRoom.Beautify.DesignWrittenFeedback'

interface DesignSurveyProps {
    onSkip: () => void
    onComplete: () => void
    trackingInfo: SelectedCompositionTrackingRoomInfo
    onClose: () => void
    onSkipFirstTime: () => void
    hasSeenFeedbackFormOnce: boolean
    hasUsedEraser: boolean
    feedbackDelayData?: number
    feedbackSource?: 'design' | 'beautify'
}

const DesignSurvey = ({
    onSkip,
    onSkipFirstTime,
    onComplete,
    trackingInfo,
    onClose,
    hasSeenFeedbackFormOnce,
    hasUsedEraser,
    feedbackDelayData,
    feedbackSource = 'design',
}: DesignSurveyProps) => {
    const { t } = useTranslation()
    const isBeautifyMode = feedbackSource === 'beautify'
    const surveyTitle = isBeautifyMode
        ? t('survey.beautify experience', {
            defaultValue: t('survey.design experience'),
        })
        : t('survey.design experience')
    const defaultDescription = isBeautifyMode
        ? t("survey.we'd love to hear beautify", {
            defaultValue: t("survey.we'd love to hear"),
        })
        : t("survey.we'd love to hear")
    const lowLabel = isBeautifyMode
        ? t('survey.beautify not at all', { defaultValue: t('survey.bad') })
        : t('survey.bad')
    const highLabel = isBeautifyMode
        ? t('survey.beautify super helpful', { defaultValue: t('survey.good') })
        : t('survey.good')
    const feedbackSubmitEventName = isBeautifyMode
        ? BEAUTIFY_FEEDBACK_SUBMIT_EVENT
        : DESIGN_FEEDBACK_SUBMIT_EVENT
    const writtenFeedbackEventName = isBeautifyMode
        ? BEAUTIFY_WRITTEN_FEEDBACK_EVENT
        : DESIGN_WRITTEN_FEEDBACK_EVENT
    const [screenIndex, setScreenIndex] = useState(0)
    const [description, setDescription] = useState('')
    const [rating, setRating] = useState<number | null>(null)
    const [characterCount, setCharacterCount] = useState(0)
    const isMagicEraseMode = hasUsedEraser && !isBeautifyMode

    const onRate = (rate: number) => {
        setRating(rate)
        setScreenIndex(1)
    }

    const handleDescriptionChange = (event: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => {
        const {
            target: { value },
        } = event

        setDescription(value)
        setCharacterCount(value.length)
    }

    const onSend = () => {
        click(feedbackSubmitEventName, {
            Rating: rating,
            'time-delay': feedbackDelayData,
            ...trackingInfo,
        })
        if (description !== '') {
            const updatedTrackingInfo = { ...trackingInfo, Feedback: description, 'time-delay': feedbackDelayData }
            click(`${writtenFeedbackEventName}.Submit`, updatedTrackingInfo)
        }
        onComplete()
        setScreenIndex(2)
    }

    const closeSurvey = () => {
        if (rating !== null) {
            click(feedbackSubmitEventName, {
                Rating: rating,
                'time-delay': feedbackDelayData,
                ...trackingInfo,
            })
        }

        if (screenIndex === 0) {
            click('DecorateRoom.DesignFeedback.Dismiss', trackingInfo)
        } else if (screenIndex === 1) {
            click(`${writtenFeedbackEventName}.Dismiss`, trackingInfo)
        }

        if (rating !== null) {
            onComplete()
        } else if (hasSeenFeedbackFormOnce) {
            onSkip()
        } else {
            onSkipFirstTime()
        }

        onClose()
    }
    const showFirstScreen = screenIndex === 0
    const showSecondScreen = screenIndex === 1
    const showThirdScreen = screenIndex === 2

    return (
        <div className={classNames('DesignSurvey', { showSecondScreen, showThirdScreen })}>
            {showFirstScreen && (
                <ModalWrapper visible handleCloseBtn={closeSurvey} className="modalContainer">
                    <Prompt
                        title={isMagicEraseMode ? t('survey.eraser') : surveyTitle}
                        footer={null}
                        header={<ModalHeader ariaCloseTxt={t('design.cancel')} />}
                        titleId="DesignSurvey-1"
                    >
                        {!isBeautifyMode && <div className="modalCopy">{defaultDescription}</div>}
                        <div className="modalContent">
                            <div className="rating">
                                <IconPill
                                    onClick={() => onRate(1)}
                                    ssrIcon={feedbackSad}
                                    className={rating === 1 ? 'selected' : ''}
                                    ariaLabel={lowLabel}
                                />
                                {lowLabel}
                            </div>
                            <div className="rating">
                                <IconPill
                                    onClick={() => onRate(2)}
                                    ssrIcon={feedbackDissatisfied}
                                    className={rating === 2 ? 'selected' : ''}
                                    ariaLabel={t('survey.dissatisfied')}
                                />
                            </div>
                            <div className="rating">
                                <IconPill
                                    onClick={() => onRate(3)}
                                    ssrIcon={feedbackNeutral}
                                    className={rating === 3 ? 'selected' : ''}
                                    ariaLabel={t('survey.neutral')}
                                />
                            </div>
                            <div className="rating">
                                <IconPill
                                    onClick={() => onRate(4)}
                                    ssrIcon={feedbackSatisfied}
                                    className={rating === 4 ? 'selected' : ''}
                                    ariaLabel={t('survey.satisfied')}
                                />
                            </div>
                            <div className="rating">
                                <IconPill
                                    onClick={() => onRate(5)}
                                    ssrIcon={feedbackHappy}
                                    className={rating === 5 ? 'selected' : ''}
                                    ariaLabel={highLabel}
                                />
                                {highLabel}
                            </div>
                        </div>
                    </Prompt>
                </ModalWrapper>
            )}
            {showSecondScreen && (
                <Modal visible handleCloseBtn={closeSurvey} className="modalContainer">
                    <Prompt
                        title={isMagicEraseMode ? t('survey.eraser') : surveyTitle}
                        footer={
                            <ModalFooter className="tutorialFooter">
                                <Button
                                    text={t('design.share')}
                                    type="primary"
                                    onClick={onSend}
                                    disabled={description === '' || characterCount > 300}
                                />
                            </ModalFooter>
                        }
                        header={<ModalHeader ariaCloseTxt={t('design.cancel')} />}
                        titleId="DesignSurvey-2"
                    >
                        <div className="modalContent">
                            <div className="rating">
                                <IconPill
                                    onClick={() => onRate(1)}
                                    ssrIcon={feedbackSad}
                                    className={rating === 1 ? 'selected' : ''}
                                    ariaLabel={lowLabel}
                                />
                                {lowLabel}
                            </div>
                            <div className="rating">
                                <IconPill
                                    onClick={() => onRate(2)}
                                    ssrIcon={feedbackDissatisfied}
                                    className={rating === 2 ? 'selected' : ''}
                                    ariaLabel={t('survey.dissatisfied')}
                                />
                            </div>
                            <div className="rating">
                                <IconPill
                                    onClick={() => onRate(3)}
                                    ssrIcon={feedbackNeutral}
                                    className={rating === 3 ? 'selected' : ''}
                                    ariaLabel={t('survey.neutral')}
                                />
                            </div>
                            <div className="rating">
                                <IconPill
                                    onClick={() => onRate(4)}
                                    ssrIcon={feedbackSatisfied}
                                    className={rating === 4 ? 'selected' : ''}
                                    ariaLabel={t('survey.satisfied')}
                                />
                            </div>
                            <div className="rating">
                                <IconPill
                                    onClick={() => onRate(5)}
                                    ssrIcon={feedbackHappy}
                                    className={rating === 5 ? 'selected' : ''}
                                    ariaLabel={highLabel}
                                />
                                {highLabel}
                            </div>
                        </div>

                        <div className="formTitle">{t('survey.anything else')}</div>
                        <div>
                            <FormField
                                characterLimit={300}
                                className="formField"
                                shouldValidate={characterCount > 0}
                                valid={characterCount > 0 && characterCount <= 300}
                                onKeyDown={(e) => e.stopPropagation()}
                            >
                                <TextArea
                                    label={defaultDescription}
                                    value={description}
                                    onChange={handleDescriptionChange}
                                />
                                <p className="characterCount">{characterCount}/300</p>
                            </FormField>
                        </div>
                    </Prompt>
                </Modal>
            )}
            {showThirdScreen && (
                <Modal visible handleCloseBtn={closeSurvey} className="modalContainer">
                    <Prompt
                        title={t('survey.raising hands emoji')}
                        footer={null}
                        header={<ModalHeader ariaCloseTxt={t('design.cancel')} />}
                        titleId="DesignSurvey-3"
                    >
                        <div className="modalContent">
                            <div className="thankYouScreen">
                                <div className="thankYouTitle">{t('survey.you are awesome')}</div>
                                <div>{t('survey.thank you for your feedback')}</div>
                                <div>
                                    {t('survey.changed your mind')}
                                    <button className="edit" onClick={() => setScreenIndex(1)}>
                                        {t('survey.edit reply')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Prompt>
                </Modal>
            )}
        </div>
    )
}

export default DesignSurvey
