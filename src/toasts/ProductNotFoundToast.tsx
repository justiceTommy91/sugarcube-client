import React from 'react'
import { useTranslation } from 'react-i18next'
import ControlledToast from './ControlledToast'

export type ProductNotFoundToastProps = {
    onDismiss: () => void
}

const ProductNotFoundToast: React.FunctionComponent<ProductNotFoundToastProps> = ({ onDismiss }) => {
    const { t } = useTranslation()
    const message = t('toasts.not found product')
    return <ControlledToast text={message} onDismiss={onDismiss} />
}

export default ProductNotFoundToast
