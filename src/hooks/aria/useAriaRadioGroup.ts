import React from 'react'

import type { HtmlAttributeBag, Labelled, OverrideableHtmlAttributes } from './common'

export type UseAriaRadioGroupProps<Option extends string | number> = Labelled & {
    options: Option[]
    value: Option
    onChange(option: Option): void
}

export type UseAriaOptionResults<Option extends string | number> = {
    radioGroupProps<T extends HTMLElement>(props?: OverrideableHtmlAttributes<T> | undefined): HtmlAttributeBag<T>
    radioProps<T extends HTMLElement>(
        option: Option,
        props: Labelled & OverrideableHtmlAttributes<T>,
    ): HtmlAttributeBag<T>
}

export const useAriaRadioGroup = <Option extends string | number>({
    options,
    value,
    onChange,
    ...labels
}: UseAriaRadioGroupProps<Option>): UseAriaOptionResults<Option> => {
    const radioIdBase = React.useId()
    return React.useMemo(() => {
        const radioId = (option: Option) => `${radioIdBase}_${option}`

        const nOptions = options.length
        const selectOption = (optionIndex: number): void => {
            if (optionIndex >= nOptions) {
                optionIndex = 0
            }
            if (optionIndex < 0) {
                optionIndex = nOptions - 1
            }
            const option = options[optionIndex]
            const selectedElem = document.getElementById(radioId(option))
            selectedElem?.focus()

            onChange(option)
        }

        const selectedIndex = options.indexOf(value)
        const selectNextOption = () => {
            selectOption(selectedIndex + 1)
        }
        const selectPrevOption = () => {
            selectOption(selectedIndex - 1)
        }

        const result: UseAriaOptionResults<Option> = {
            radioGroupProps(props = {}) {
                return {
                    ...props,
                    ...labels,
                    role: 'radiogroup',
                    onKeyDown(event) {
                        switch (event.key) {
                            case 'ArrowLeft':
                            case 'ArrowUp': {
                                event.preventDefault()
                                selectPrevOption()
                                break
                            }
                            case 'ArrowRight':
                            case 'ArrowDown': {
                                event.preventDefault()
                                selectNextOption()
                                break
                            }
                            default:
                        }
                        props.onKeyDown?.(event)
                    },
                }
            },
            radioProps(option, props) {
                const isSelected = value === option
                return {
                    ...props,
                    id: radioId(option),
                    role: 'radio',
                    tabIndex: isSelected ? 0 : -1,
                    'aria-checked': isSelected,
                    onKeyDown(event) {
                        if (event.key === ' ') {
                            event.preventDefault()
                            onChange(option)
                        }
                        props.onKeyDown?.(event)
                    },
                    onClick(event) {
                        onChange(option)
                        props.onChange?.(event)
                    },
                }
            },
        }
        return result
    }, [JSON.stringify(options), value, onChange])
}
