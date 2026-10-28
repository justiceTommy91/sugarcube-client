import React from 'react'
import { useProductDimensions } from '@gatsby/hooks/useProductDimensions'
import { useFormatLength } from './hooks/useFormatLength'
import './MeasurementLabels.scss'

export const ProductDimensionLabels = ({ itemId }: { itemId: string }) => {
    const productDimensions = useProductDimensions(itemId)
    const fmt = useFormatLength()

    if (!productDimensions) return null

    return (
        <div>
            {productDimensions.dimensions.map((info) => {
                const dx = info.relativePoint2.x - info.relativePoint1.x
                const dy = info.relativePoint2.y - info.relativePoint1.y
                const { x, y } = info.relativeMiddlePoint
                if (dx * dx + dy * dy < 0.0004 || x < 0 || x > 1 || y < 0 || y > 1) return null

                const offsetX = info.screenSpaceNormal.x * 0.5
                const offsetY = info.screenSpaceNormal.y * 0.5
                const translateX = info.screenSpaceNormal.x > 0 ? 0 : -100
                const translateY = info.screenSpaceNormal.y > 0 ? 0 : -100

                return (
                    <div
                        key={`${itemId}-${info.typeStr}`}
                        className="FmfViewer__product-dimension"
                        style={{
                            top: `${y * 100 + offsetY}%`,
                            left: `${x * 100 + offsetX}%`,
                            transform: `translateX(${translateX}%) translateY(${translateY}%)`,
                        }}
                    >
                        {fmt(info.length)}
                    </div>
                )
            })}
        </div>
    )
}
