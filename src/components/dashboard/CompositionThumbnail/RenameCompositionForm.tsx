import React from 'react'

import Button from '@ingka/button'
import InputField from '@ingka/input-field'
import checkmarkCircle from '@ingka/ssr-icon/paths/checkmark-circle'
import { useTranslation } from 'react-i18next'

require('./RenameCompositionForm.scss')

export type RenameCompositionFormProps = {
    currentName: string
    onSubmit?: (newName: string) => void
}

export const RenameCompositionForm: React.FunctionComponent<RenameCompositionFormProps> = ({
    currentName,
    onSubmit,
}) => {
    const { t } = useTranslation('translation')
    return (
        <form
            className="RenameCompositionForm"
            onSubmit={(event) => {
                event.preventDefault()
                const formData = new FormData(event.currentTarget)
                const newName = (formData.get('rename-composition-field') as string) ?? ''
                if (newName) {
                    onSubmit?.(newName)
                }
            }}
        >
            <InputField
                className="renameRoomField"
                iconPosition="leading"
                id="rename-composition-field"
                name="rename-composition-field"
                type="text"
                defaultValue={currentName}
            />

            <Button
                className="submitButton"
                iconOnly
                ssrIcon={checkmarkCircle}
                type="tertiary"
                htmlType="submit"
                text={t('design.save')}
            />
        </form>
    )
}
