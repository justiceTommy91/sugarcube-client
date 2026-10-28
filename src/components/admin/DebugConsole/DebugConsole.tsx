/* eslint-disable i18next/no-literal-string */

import React, { useRef } from 'react'
import SSRIcon from '@ingka/ssr-icon'
import expand from '@ingka/ssr-icon/paths/expand'
import contract from '@ingka/ssr-icon/paths/contract'
import drag from '@ingka/ssr-icon/paths/square-grid-3x3-filled'

import { useAppSelector, useDragHandle, useFlags, useLocalStorageState } from 'hooks'

import { getDebugConsoleMessages } from 'models/admin/selectors'
import classNames from 'classnames'
import { useExperiments } from 'hooks/useExperiments'
import { SmartaTab } from './SmartaTab'
import { CompositionTab } from './CompositionTab'


require('./DebugConsole.scss')

type Tab = 'log' | 'smarta' | 'flags' | 'comp'

export const DebugConsole = () => {
    const [selectedTab, setSelectedTab] = useLocalStorageState<Tab>('DCTab', 'log')
    const [isExpanded, setIsExpanded] = useLocalStorageState('DCExpand', false)
    const handleRef = useRef<HTMLButtonElement>(null)
    const parentRef = useRef<HTMLDivElement>(null)
    useDragHandle(handleRef, parentRef)

    const messages = useAppSelector(getDebugConsoleMessages)
    const { flags, status: flagsStatus } = useFlags()
    const { variations, status: expStatus } = useExperiments()

    const handleClickTab = (tab: Tab) => () => {
        setSelectedTab(tab)
    }

    return (
        <div
            ref={parentRef}
            className={classNames("DebugConsole", { expanded: isExpanded })}
            onKeyDown={(e) => { e.stopPropagation() }}
        >
            <div className="nav">
                <div className="tabs">
                    <ul>
                        <li
                            className={classNames({ selected: selectedTab === 'log' })}
                            onClick={handleClickTab('log')}
                        >
                            Log
                        </li>
                        <li
                            className={classNames({ selected: selectedTab === 'comp' })}
                            onClick={handleClickTab('comp')}
                        >
                            Composition
                        </li>
                        <li
                            className={classNames({ selected: selectedTab === 'flags' })}
                            onClick={handleClickTab('flags')}
                        >
                            Flags
                        </li>
                        <li
                            className={classNames({ selected: selectedTab === 'smarta' })}
                            onClick={handleClickTab('smarta')}
                        >
                            Smarta
                        </li>
                    </ul>
                </div>
                <div className="buttons">
                    <button
                        className="windowSize"
                        onClick={() => { setIsExpanded(!isExpanded) }}
                    >
                        <SSRIcon paths={isExpanded ? contract : expand} />
                    </button>
                    <button
                        ref={handleRef}
                    >
                        <SSRIcon paths={drag} />
                    </button>
                </div>
            </div>
            <div className="contentWrapper">
                {selectedTab === 'log' && (
                    <div className="log">
                        <ul>
                            {messages.map((m) => (
                                <li key={m.id}>
                                    <span className="tag">{m.tag}</span>
                                    <span className="message">{m.message}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {selectedTab === 'flags' && (
                    <div className="flags">
                        <p>-- Flags -- status: {flagsStatus}</p>
                        {Object.entries(flags).map(([flag, value]) => (
                            <p>{flag}: {value ? 'on' : 'off'}</p>
                        ))}
                        <p>-- Experiments -- status: {expStatus}</p>
                        {Object.entries(variations).map(([exp, value]) => (
                            <p>{exp}: {value}</p>
                        ))}
                    </div>
                )}
                {selectedTab === 'smarta' && <SmartaTab />}
                {selectedTab === 'comp' && <CompositionTab />}
            </div>
        </div>
    )
}
