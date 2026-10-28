import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useOutsideAlerter } from 'hooks'
import { showSaveMenu } from 'models/ui/actions'

require('./SaveOptions.scss')

interface Props {
    onClickSave: () => void
    onClickSaveAs: () => void
    saveDisabled: boolean
    saveAsDisabled: boolean
}

const SaveOptions = ({ onClickSave, onClickSaveAs, saveDisabled, saveAsDisabled }: Props) => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const ref = useRef(null)

    const closeMenu = () => {
        dispatch(showSaveMenu(false))
    }

    useOutsideAlerter({
        ref,
        onClickOutside: closeMenu,
    })

    return (
        <nav className="SaveOptions" ref={ref}>
            <ul className="SaveOptions__list">
                <li className="SaveOptions__list-item">
                    <button className="SaveOptions__button" onClick={onClickSave} disabled={saveDisabled}>
                        {t('design.save')}
                    </button>
                </li>
                <li className="SaveOptions__list-item">
                    <button className="SaveOptions__button" onClick={onClickSaveAs} disabled={saveAsDisabled}>
                        {t('design.save a copy')}
                    </button>
                </li>
            </ul>
        </nav>
    )
}

export default SaveOptions
