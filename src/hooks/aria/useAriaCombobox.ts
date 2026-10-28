import React from 'react'

import type { HtmlAttributeBag, OverrideableHtmlAttributes, Labelled } from './common'
import { useAriaListbox } from './useAriaListbox'
import { useAriaOption } from './useAriaOption'

export type UseAriaComboboxResults = {
    comboboxProps(props?: OverrideableHtmlAttributes<HTMLInputElement>): HtmlAttributeBag<HTMLInputElement>
    listboxProps<T extends HTMLElement>(props?: OverrideableHtmlAttributes<T>): HtmlAttributeBag<T>
    optionProps<T extends HTMLElement>(index: number, props?: OverrideableHtmlAttributes<T>): HtmlAttributeBag<T>
    optionButtonProps<T extends HTMLElement>(index: number, props?: OverrideableHtmlAttributes<T>): HtmlAttributeBag<T>
}

type ComboboxState = {
    nOptions: number
    selectedOption: number
    isExpanded: boolean
    hasFocus: boolean
}

type OptionsChanged = {
    type: 'OptionsChanged'
    payload: {
        nOptions: number
    }
}

type InputChange = {
    type: 'InputChange'
}

type SelectOption = {
    type: 'SelectOption'
    payload: {
        option: number
    }
}

type SelectNextOption = {
    type: 'SelectNextOption'
}

type SelectPrevOption = {
    type: 'SelectPrevOption'
}

type ReceiveFocus = {
    type: 'ReceiveFocus'
}

type LoseFocus = {
    type: 'LoseFocus'
}

type ExpandListbox = {
    type: 'ExpandListbox'
}

type CollapseListbox = {
    type: 'CollapseListbox'
}

type Submit = {
    type: 'Submit'
}

type ComboboxAction =
    | OptionsChanged
    | InputChange
    | SelectOption
    | SelectNextOption
    | SelectPrevOption
    | ExpandListbox
    | CollapseListbox
    | ReceiveFocus
    | LoseFocus
    | Submit

const comboboxReducer = (state: ComboboxState, action: ComboboxAction): ComboboxState => {
    switch (action.type) {
        case 'OptionsChanged': {
            return {
                ...state,
                nOptions: action.payload.nOptions,
                isExpanded: state.hasFocus && action.payload.nOptions > 0,
            }
        }
        case 'InputChange':
        case 'ExpandListbox': {
            return { ...state, isExpanded: state.nOptions > 0 }
        }
        case 'CollapseListbox': {
            return { ...state, isExpanded: false, selectedOption: -1 }
        }
        case 'LoseFocus': {
            return { ...state, isExpanded: false, hasFocus: false }
        }
        case 'ReceiveFocus': {
            return { ...state, hasFocus: true, isExpanded: state.nOptions > 0 }
        }
        case 'SelectOption': {
            return { ...state, selectedOption: action.payload.option }
        }
        case 'SelectNextOption': {
            let selectedOption = state.selectedOption + 1
            if (selectedOption >= state.nOptions) {
                selectedOption = 0
            }
            return { ...state, selectedOption, isExpanded: true }
        }
        case 'SelectPrevOption': {
            let selectedOption = state.selectedOption - 1
            if (selectedOption < 0) {
                selectedOption = state.nOptions - 1
            }
            return { ...state, selectedOption, isExpanded: true }
        }
        case 'Submit': {
            return { ...state, selectedOption: -1, isExpanded: false }
        }
        default: {
            return state
        }
    }
}

export type UseAriaComboboxArgs = Labelled & {
    options: string[]
    onChange(value: string): void
    defaultValue?: string
    'aria-autocomplete'?: React.AriaAttributes['aria-autocomplete']
}

export function useAriaCombobox({
    options,
    onChange,
    defaultValue,
    'aria-autocomplete': autocomplete,
    'aria-label': label,
    'aria-labelledby': labelledBy,
}: UseAriaComboboxArgs): UseAriaComboboxResults {
    const [state, dispatch] = React.useReducer(comboboxReducer, {
        nOptions: options.length,
        selectedOption: -1,
        isExpanded: false,
        hasFocus: false,
    })

    React.useEffect(() => {
        dispatch({ type: 'OptionsChanged', payload: { nOptions: options.length } })
    }, [options.length])

    const comboboxId = React.useId()
    const listboxId = React.useId()

    const { listboxProps } = useAriaListbox({ 'aria-labelledby': labelledBy || comboboxId })
    const { optionProps, optionButtonProps } = useAriaOption({ 'aria-controls': listboxId })

    const optionIdBase = React.useId()

    const comboboxRef = React.useRef<HTMLInputElement | null>(null)
    return React.useMemo(() => {
        const optionId = (index: number) => `${optionIdBase}${index}`

        const submit = (value: string): void => {
            dispatch({ type: 'Submit' })
            onChange(value)
        }

        const result: UseAriaComboboxResults = {
            comboboxProps(props = {}) {
                if (props.ref) {
                    props.ref.current = comboboxRef.current
                }
                return {
                    ...props,
                    ref: comboboxRef,
                    id: comboboxId,
                    role: 'combobox',
                    'aria-label': label,
                    'aria-labelledby': labelledBy,
                    'aria-autocomplete': autocomplete,
                    'aria-controls': listboxId,
                    'aria-expanded': state.isExpanded,
                    'aria-activedescendant': state.selectedOption >= 0 ? optionId(state.selectedOption) : undefined,
                    defaultValue,
                    onFocus(event) {
                        dispatch({ type: 'ReceiveFocus' })
                        props.onFocus?.(event)
                    },
                    onBlur(event) {
                        dispatch({ type: 'LoseFocus' })
                        if (defaultValue != null) {
                            event.currentTarget.value = defaultValue
                        }
                        props.onBlur?.(event)
                    },
                    onInput(event) {
                        dispatch({ type: 'InputChange' })
                        props.onInput?.(event)
                    },
                    onClick(event) {
                        dispatch({ type: 'ExpandListbox' })
                        props.onClick?.(event)
                    },
                    onKeyDown(event) {
                        if (event.key === 'ArrowUp') {
                            // Prevent the browser from moving the cursor or changing selection in the underlaying
                            // input.
                            event.preventDefault()
                            if (event.altKey) {
                                dispatch({ type: 'CollapseListbox' })
                            } else {
                                dispatch({ type: 'SelectPrevOption' })
                            }
                        } else if (event.key === 'ArrowDown') {
                            // Prevent the browser from moving the cursor or changing selection in the underlaying
                            // input.
                            event.preventDefault()
                            if (event.altKey) {
                                dispatch({ type: 'ExpandListbox' })
                            } else {
                                dispatch({ type: 'SelectNextOption' })
                            }
                        } else if (event.key === 'Escape') {
                            if (state.isExpanded) {
                                dispatch({ type: 'CollapseListbox' })
                            } else {
                                event.currentTarget.value = ''
                            }
                        } else if (event.key === 'Enter') {
                            event.preventDefault()
                            const optionValue = options[state.selectedOption]
                            if (optionValue) {
                                submit(optionValue)
                                event.currentTarget.value = optionValue
                            } else {
                                submit(event.currentTarget.value)
                            }
                        }

                        props.onKeyDown?.(event)
                    },
                }
            },
            listboxProps(props = {}) {
                return {
                    ...listboxProps(props),
                    id: listboxId,
                }
            },
            optionProps(index, props = {}) {
                return {
                    ...optionProps(props),
                    'aria-selected': index === state.selectedOption,
                    id: optionId(index),
                }
            },
            optionButtonProps(index, props = {}) {
                return {
                    ...optionButtonProps({
                        ...props,
                        onClick(event) {
                            const value = options[index]
                            if (!value) {
                                return
                            }

                            if (comboboxRef.current) {
                                comboboxRef.current.value = value
                            }

                            submit(value)
                            props.onClick?.(event)
                        },
                    }),
                    'aria-controls': listboxId,
                }
            },
        }
        return result
    }, [
        listboxProps,
        optionProps,
        optionButtonProps,
        options,
        onChange,
        defaultValue,
        autocomplete,
        label,
        labelledBy,
        state,
    ])
}
