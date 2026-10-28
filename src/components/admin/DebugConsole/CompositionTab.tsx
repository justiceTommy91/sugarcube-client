/* eslint-disable i18next/no-literal-string */
import React from 'react'

import { useAppDispatch, useAppSelector } from 'hooks'
import { removeRenderItems } from 'models/compositions/actions'
import { getSelectedComposition } from 'models/compositions/selectors'

import './CompositionTab.scss'

export const CompositionTab = () => {
    const dispatch = useAppDispatch()
    const selectedComposition = useAppSelector(getSelectedComposition)

    const handleClearComp = () => {
        if (selectedComposition) {
            dispatch(removeRenderItems(selectedComposition.id))
        }
    }

    const handleCopyLIN = () => {
        if (selectedComposition) {
            const lins = selectedComposition.renderItems.reduce<string[]>((acc, curr) => {
                acc.push(curr.localItemNumber)
                return acc
            }, [])
            navigator.clipboard.writeText(lins.join(', '))
        }
    }

    return (
        <div className="CompositionTab">
            <button onClick={handleClearComp} title="remove all products">empty</button>
            <button onClick={handleCopyLIN} title="copy list of local item numbers">copy LINs</button>
        </div>
    )
}
