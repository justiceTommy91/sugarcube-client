/* eslint-disable i18next/no-literal-string */
/* eslint-disable jsx-a11y/label-has-associated-control */
import Button from '@ingka/button'
import Modal, { ModalFooter, ModalHeader, Prompt } from '@ingka/modal'
import Toggle from '@ingka/toggle'
import { useAppDispatch, useAppSelector } from 'hooks'
import { useExperiments } from 'hooks/useExperiments'
import { useFlags } from 'hooks/useFlags'
import { clearReferrer, setReferrerUrl } from 'models/referrer/slice'
import { getAreDebugFeaturesEnabled } from 'models/user/selectors'
import React, { useState } from 'react'
import { Experiment, experimentsService, Variation } from 'services/experiments'

require('./FlagsManager.scss')

const INITIAL_SHARE_BUTTON_TEXT = 'Copy share link'

export const FlagsManager: React.FC = () => {
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState(false)
    const [shareUrlButtonText, setShareUrlButtonText] = useState(INITIAL_SHARE_BUTTON_TEXT)
    const [referrerValue, setReferrerValue] = useState('')
    const areDebugFeaturesEnabled = useAppSelector(getAreDebugFeaturesEnabled)
    const { flags } = useFlags()
    const { variations: chosenVariations } = useExperiments()
    if (!areDebugFeaturesEnabled) {
        return null
    }
    const copyShareUrl = () => {
        const url = new URL(window.location.href)
        experimentsService.flags.forEach((flag) => {
            url.searchParams.set(`_flags[${flag}]`, flags[flag].toString())
        })
        Object.entries(chosenVariations).forEach(([experiment, variation]) => {
            url.searchParams.set(`_experiments[${experiment}]`, variation)
        })
        navigator.clipboard.writeText(url.href)
        setShareUrlButtonText('Copied!')
        setTimeout(() => {
            setShareUrlButtonText(INITIAL_SHARE_BUTTON_TEXT)
        }, 2000)
    }

    const onUpdateContextual = (text: string) => {
        dispatch(clearReferrer())
        dispatch(setReferrerUrl(text))
    }

    return (
        <>
            <Modal className="FlagsManagerModal" visible={isOpen} escapable handleCloseBtn={() => setIsOpen(false)}>
                <Prompt
                    title="Feature Flags Manager"
                    footer={
                        <ModalFooter renderBorder>
                            <Button type="primary" onClick={() => copyShareUrl()} text={shareUrlButtonText} />
                        </ModalFooter>
                    }
                    header={<ModalHeader ariaCloseTxt="Close modal" />}
                    titleId="FlagsManagerModal"
                    open={isOpen}
                    className="FlagsManagerPrompt"
                >
                    <h2 className="title">Feature Flags</h2>
                    {experimentsService.flags.map((flag) => (
                        <div className="flagsRow" key={flag}>
                            <Toggle
                                id={flag}
                                buttons={[{ text: 'off' }, { text: 'on' }]}
                                onClick={() => experimentsService.toggleFlag(flag)}
                                activeIndex={flags[flag] ? 1 : 0}
                                className="toggle"
                            />
                            <p className="feature">{flag}</p>
                        </div>
                    ))}
                    <Button
                        className="resetFlags"
                        type="secondary"
                        onClick={() => experimentsService.resetFlags()}
                        text="Reset Feature Flags"
                    />
                    <h2 className="title">Experiments</h2>
                    {Object.entries(experimentsService.experimentDefinitions)?.map(([experiment, definition]) => (
                        <div className="experimentsRow">
                            <p className="experiment">{experiment}: </p>
                            <select
                                value={chosenVariations[experiment as Experiment]}
                                onChange={(e) =>
                                    experimentsService.setExperiment(
                                        experiment as Experiment,
                                        e.target.value as Variation<Experiment>,
                                    )
                                }
                            >
                                {definition.variations.map((variation) => (
                                    <option value={variation}>{variation}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                    <Button
                        type="secondary"
                        className="resetExperiments"
                        onClick={() => experimentsService.resetExperiments()}
                        text="Reset Experiments"
                    />

                    <h2 className="title">Contextual UX</h2>
                    <div className="referrerContainer">
                        <p>Referrer URL:</p>
                        <input
                            value={referrerValue}
                            onChange={(e) => setReferrerValue(e.target.value)}
                            className="referrerInput"
                            placeholder="https://www.ikea.com/us/en/cat/sofas-sectionals-700676/"
                        />
                        <Button
                            className="updateButton"
                            size="xsmall"
                            text="Update"
                            onClick={() => onUpdateContextual(referrerValue)}
                        />
                    </div>
                </Prompt>
            </Modal>
            <Button
                size="small"
                type="secondary"
                className="FlagsManagerButton"
                onClick={() => setIsOpen(true)}
                text="Open Flags Manager"
            />
        </>
    )
}
