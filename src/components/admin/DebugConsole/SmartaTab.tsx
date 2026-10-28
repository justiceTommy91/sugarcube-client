/* eslint-disable i18next/no-literal-string */

import { useAppDispatch, useAppSelector, useLocalStorageState } from 'hooks'
import { getDebugConsoleMessages } from 'models/admin/selectors'
import { clickPlaceMultipleRenderItems } from 'models/compositions/actions'
import { getSelectedCompositionId } from 'models/compositions/selectors'
import { requestFurnitureByLocalItemNos } from 'models/furniture/actions'
import React, { KeyboardEventHandler } from 'react'
import { splitByCommonDelimiters } from 'utils/string'
import { MiniToggle } from './MiniToggle'

import './SmartaTab.scss'

export const SmartaTab = () => {
    const dispatch = useAppDispatch()

    const [lins, setLins] = useLocalStorageState('smartaMultiLINs', '')
    const [ignoreCamera, setIgnoreCamera] = useLocalStorageState('smartaIgnoreCamera', false)

    const selectedCompositionId = useAppSelector(getSelectedCompositionId)
    const messages = useAppSelector(getDebugConsoleMessages)

    const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === 'Enter') {
            const localItemNumbers = splitByCommonDelimiters(lins)

            dispatch(requestFurnitureByLocalItemNos(localItemNumbers))

            dispatch(
                clickPlaceMultipleRenderItems({
                    compositionId: selectedCompositionId,
                    localItemNumbers,
                    ignoreCamera,
                    trackingInfo: {},
                }),
            )

            setLins(localItemNumbers.join(','))
        }
    }

    return (
        <div className="SmartaTab">
            <div className="title">
                <p>Smarta multi-place</p>
                <MiniToggle value={ignoreCamera} onChange={setIgnoreCamera} label="ignore camera" />
            </div>
            <input
                type="text"
                placeholder="Local item numbers"
                value={lins}
                onChange={(e) => {
                    setLins(e.target.value)
                }}
                onKeyDown={handleKeyDown}
            />
            <div className="log">
                {messages
                    .filter((m) => m.tag === 'smarta-multi')
                    .map((m) => (
                        <p key={m.id}>{m.message}</p>
                    ))}
            </div>
        </div>
    )
}
