import React, { useRef, useState } from 'react'
import SSRIcon from '@ingka/ssr-icon'
import chevronLeftSmall from '@ingka/ssr-icon/paths/chevron-left-small'
import chevronRightSmall from '@ingka/ssr-icon/paths/chevron-right-small'

import { isSafari } from 'utils/browser'

import './RotateSlider.scss'

interface RotateSliderProps {
    onChange: (heading: number) => void
    onPointerDown: () => void
    onPointerUp: () => void
    initialHeading: number
}

export const RotateSlider = React.forwardRef<HTMLInputElement, RotateSliderProps>(
    ({ initialHeading, onChange, onPointerDown, onPointerUp }, ref) => {
        const [sliderValue, setSliderValue] = useState(initialHeading)

        const sliderRef = useRef<HTMLInputElement | null>(null)

        const updateHeading = (heading: number | ((old: number) => number)) => {
            setSliderValue((old) => {
                const newHeading = typeof heading === 'number' ? heading : heading(old)
                onChange(newHeading)
                return newHeading
            })
        }
        const handleRotateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            const heading = parseInt(event.target.value, 10)
            updateHeading(heading)
        }
        const handleStepClick = (step: number) => {
            updateHeading(step)
            // Ensure that focus remains on the input after clicking on a tick option for accessibility.
            sliderRef.current?.focus()
        }
        const incrementRotation = () => updateHeading((old) => old + 1)
        const decrementRotation = () => updateHeading((old) => old - 1)
        const isSafariBrowser = isSafari()

        return (
            <div className="RotateSlider">
                <div className="degreeInputWrapper">
                    <button className="spinnerButton" onClick={decrementRotation} tabIndex={-1} aria-hidden>
                        <SSRIcon paths={chevronLeftSmall} />
                    </button>
                    <input
                        className="degreeInput"
                        type="number"
                        value={sliderValue}
                        onChange={handleRotateChange}
                        min={-180}
                        max={180}
                        aria-label="Rotate selected furniture via number input"
                    />
                    <button className="spinnerButton" onClick={incrementRotation} tabIndex={-1} aria-hidden>
                        <SSRIcon paths={chevronRightSmall} />
                    </button>
                </div>
                <div className="sliderWrapper">
                    {!isSafariBrowser ? (
                        <datalist className="sliderSteps" id="slider-steps">
                            {[-180, -90, 0, 90, 180].map((step) => (
                                <option key={step} value={step} onClick={() => handleStepClick(step)} />
                            ))}
                        </datalist>
                    ) : (
                        <div className="sliderSteps">
                            {[-180, -90, 0, 90, 180].map((step) => (
                                <button
                                    key={step}
                                    onClick={() => handleStepClick(step)}
                                    className="stepTick"
                                    tabIndex={0}
                                />
                            ))}
                        </div>
                    )}

                    <input
                        ref={(elem) => {
                            sliderRef.current = elem

                            if (!ref) {
                                return
                            }
                            if (typeof ref === 'function') {
                                ref(elem)
                            } else {
                                // eslint-disable-next-line no-param-reassign
                                ref.current = elem
                            }
                        }}
                        type="range"
                        min={-180}
                        max={180}
                        step={1}
                        value={sliderValue}
                        onChange={handleRotateChange}
                        className="customSlider"
                        onPointerDown={onPointerDown}
                        onPointerUp={onPointerUp}
                        id="product-rotate-id"
                        list="slider-steps"
                        aria-label="Rotate selected furniture via slider"
                    />
                </div>
            </div>
        )
    },
)
