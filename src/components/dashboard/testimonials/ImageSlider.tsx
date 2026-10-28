import React from 'react'
import { ImgComparisonSlider } from '@img-comparison-slider/react'
import './ImageSlider.scss'
import SSRIcon from '@ingka/ssr-icon'
import arrowLeftRight from '@ingka/ssr-icon/paths/arrow-left-right'

interface ImageSliderProps {
    sliderValue: number
    setSliderValue: React.Dispatch<React.SetStateAction<number>>
    beforeImage: string
    afterImage: string
    beforeText?: string
    afterText?: string
    onUserInteraction: () => void
}

export const ImageSlider: React.FC<ImageSliderProps> = ({
    sliderValue,
    setSliderValue,
    beforeImage,
    afterImage,
    beforeText,
    afterText,
    onUserInteraction,
}) => (
    <div className="ImageSlider" onMouseUp={onUserInteraction} onTouchEnd={onUserInteraction}>
        <ImgComparisonSlider
            value={sliderValue}
            onSlide={(event) => {
                // ImgComparisonSlider uses a deprecated type
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setSliderValue((event as any).srcElement.exposure)
            }}
        >
            <div slot="first" className="imageContainer">
                <img className="room" alt={beforeText} src={beforeImage} />
            </div>
            <div slot="second" className="imageContainer">
                <img className="room" alt={afterText} src={afterImage} />
            </div>
            <div slot="handle" className="handleContainer">
                <SSRIcon paths={arrowLeftRight} />
            </div>
        </ImgComparisonSlider>
        <div className="labelsContainer">
            {beforeText && <p className="before">{beforeText}</p>}
            {afterText && <p className="after">{afterText}</p>}
        </div>
    </div>
)
