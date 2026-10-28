import React from 'react'
import classNames from 'classnames'

import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import { useSugarcubeContext } from 'apps/SugarcubeContext'

require('./ProductList.scss')

export type ProductProps = {
    children: React.ReactNode
    loading?: boolean
}

export const ProductList = ({ children, loading = false }: ProductProps): React.ReactElement => {
    const { isUpptacka } = useSugarcubeContext()
    if (loading) {
        return (
            <div className="ProductList ProductList_empty">
                <BouncingBallLoader />
            </div>
        )
    }

    return (
        <ul className={classNames('ProductList', { isUpptacka })}>
            {React.Children.map(children, (child) => (
                <li className="ProductList__product">{child}</li>
            ))}
        </ul>
    )
}
