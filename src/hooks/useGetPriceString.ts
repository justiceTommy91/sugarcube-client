import { UNAVAILABLE_PRICE } from 'constants/price'
import { useTranslation } from 'react-i18next'

export const useGetPriceString = () => {
    const { t } = useTranslation()
    const getPriceString = (price: string): string => {
        if (price === UNAVAILABLE_PRICE) {
            return t('design.price unavailable')
        }
        return price
    }
    return { getPriceString }
}
