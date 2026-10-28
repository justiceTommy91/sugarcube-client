import React from 'react'
import { useTranslation } from 'react-i18next'

import Button from '@ingka/button'
import InlineMessage from '@ingka/inline-message'
import InputField from '@ingka/input-field'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right'
import warning from '@ingka/ssr-icon/paths/warning-triangle'

const VPC_CODE_PATTERN = /^[A-Z0-9]{5,}$/

type VPCCodeInputProps = {
    onSubmit: (vpcCode: string) => void
}

export const VPCCodeInput = ({ onSubmit }: VPCCodeInputProps) => {
    const { t } = useTranslation()
    const [code, setCode] = React.useState('')
    const [error, setError] = React.useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const normalized = code.toUpperCase().trim()
        if (!VPC_CODE_PATTERN.test(normalized)) {
            setError(true)
            return
        }
        setError(false)
        onSubmit(normalized)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key.length === 1 && !/^[a-zA-Z0-9]$/.test(e.key)) {
            e.preventDefault()
        }
    }

    return (
        <section className="PAXImportPanel__section">
            <h3 className="PAXImportPanel__sectionHeading">
                {t('configurableProducts.pax.importPanel.codeInputLabel')}
            </h3>
            <form className="PAXImportPanel__codeForm" onSubmit={handleSubmit}>
                <InputField
                    className="PAXImportPanel__codeInput"
                    id="pax-vpc-code"
                    name="pax-vpc-code"
                    type="text"
                    value={code}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setCode(e.target.value)
                        if (error) setError(false)
                    }}
                    onKeyDown={handleKeyDown}
                />
                <Button
                    className="PAXImportPanel__codeSubmit"
                    iconOnly
                    ssrIcon={arrowRight}
                    type="primary"
                    htmlType="submit"
                    size="small"
                    text={t('configurableProducts.pax.importPanel.heading')}
                />
            </form>
            <p className="PAXImportPanel__codeHint">{t('configurableProducts.pax.importPanel.codeHint')}</p>
            {error && (
                <InlineMessage
                    // eslint-disable-next-line i18next/no-literal-string
                    variant="cautionary"
                    className="PAXImportPanel__codeError"
                    ssrIcon={warning}
                    body={t('configurableProducts.pax.importPanel.codeError')}
                    subtle
                />
            )}
        </section>
    )
}
