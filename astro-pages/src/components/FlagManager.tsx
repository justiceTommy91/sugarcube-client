/* eslint-disable i18next/no-literal-string */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState } from 'react'
import Button from '@ingka/button'
import Modal, { ModalFooter, ModalHeader, Prompt } from '@ingka/modal'
import Toggle from '@ingka/toggle'
import { isProd } from '@utils/environment'
import { experimentsService } from '@services/experiments'
import type { Experiment, Variation } from 'services/experiments'
import { useFlags } from '@hooks/useFlags'
import { useExperiments } from '@hooks/useExperiments'
import { useReferrer, useSetReferrer } from '@astro-hooks/useReferrer'
import { useLods, useSetLods } from '@astro-hooks/useLods'
import { useFurnitureSearch } from '@astro-hooks/useFurnitureSearch'
import type { FurnitureSearchParams } from '@astro-services/furnitureService'

// Import the same styles as Gatsby version
import '@components/admin/FlagsManager/FlagsManager.scss'
import './FlagManager.scss'

const INITIAL_SHARE_BUTTON_TEXT = 'Copy share link'

export const FlagsManager: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [shareUrlButtonText, setShareUrlButtonText] = useState(INITIAL_SHARE_BUTTON_TEXT)
    const [referrerValue, setReferrerValue] = useState('')
    const [testSearchParams, setTestSearchParams] = useState<FurnitureSearchParams | null>(null)
    const [dimensions, setDimensions] = useState({
        length: { min: 0, max: 5000 },
        width: { min: 0, max: 5000 },
        height: { min: 0, max: 5000 },
    })
    const { flags } = useFlags()
    const { variations: chosenVariations } = useExperiments()
    const setReferrer = useSetReferrer()
    const referrer = useReferrer()
    const lods = useLods()
    const setLods = useSetLods()
    const { data: searchData, loading: searchLoading } = useFurnitureSearch(testSearchParams)

    const isInternalEnv =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
            window.location.hostname.includes('sugarcube-client') ||
            window.location.hostname.includes('ikeadt.com'))

    if (isProd || !isInternalEnv) {
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

    return (
        <div className="FlagsManagerContainer">
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
                        <div className="experimentsRow" key={experiment}>
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
                                    <option key={variation} value={variation}>
                                        {variation}
                                    </option>
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
                            onClick={() => setReferrer(referrerValue)}
                        />
                        <p>
                            Parsed: queryTerm=<strong>{referrer.queryTerm ?? 'null'}</strong>{' '}
                            categoryId=<strong>{referrer.categoryId ?? 'null'}</strong>{' '}
                            lods=<strong>{lods ?? 'null'}</strong>
                        </p>
                        <div className="flagsRow">
                            <Toggle
                                id="lods-toggle"
                                buttons={[{ text: 'off' }, { text: 'on' }]}
                                onClick={() => setLods(lods ? null : 'lite')}
                                activeIndex={lods ? 1 : 0}
                                className="toggle"
                            />
                            <p className="feature">Request LODs ({lods || 'none'})</p>
                        </div>
                        <div className="dimensionsContainer">
                            {(['length', 'width', 'height'] as const).map((dim) => (
                                <div className="dimensionRow" key={dim}>
                                    <span className="dimensionLabel">{dim}:</span>
                                    <input
                                        type="number"
                                        className="dimensionInput"
                                        value={dimensions[dim].min}
                                        onChange={(e) =>
                                            setDimensions((prev) => ({
                                                ...prev,
                                                [dim]: { ...prev[dim], min: Number(e.target.value) },
                                            }))
                                        }
                                        placeholder="min"
                                    />
                                    <span>–</span>
                                    <input
                                        type="number"
                                        className="dimensionInput"
                                        value={dimensions[dim].max}
                                        onChange={(e) =>
                                            setDimensions((prev) => ({
                                                ...prev,
                                                [dim]: { ...prev[dim], max: Number(e.target.value) },
                                            }))
                                        }
                                        placeholder="max"
                                    />
                                    <span>mm</span>
                                </div>
                            ))}
                        </div>
                        <Button
                            className="updateButton"
                            size="xsmall"
                            text="Test Furniture Search"
                            onClick={() =>
                                setTestSearchParams({
                                    queryTerm: referrer.queryTerm,
                                    categoryId: referrer.categoryId,
                                    measurementsWidth: dimensions.width,
                                    measurementsDepth: dimensions.length,
                                    measurementsHeight: dimensions.height,
                                    lods,
                                })
                            }
                        />
                        {searchLoading && <p>Loading...</p>}
                        {searchData && searchData.products.length > 0 && (
                            <p>
                                Got <strong>{searchData.products.length}</strong> results —{' '}
                                {searchData.products.map((p) => p.name).join(', ')}
                            </p>
                        )}
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
        </div>
    )
}
