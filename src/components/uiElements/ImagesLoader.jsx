import { string } from 'prop-types'
import React, { useEffect, useState } from 'react'
import { imageLoaderListType } from 'models/propTypes'
import classNames from 'classnames'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { withPrefix } from 'gatsby'
import DotsLoader from './DotsLoader'
import './ImagesLoader.scss'

const CHANGE_IMAGE_INTERVAL = 6000

const ImagesLoader = ({ title, imagesWithSubtitles }) => {
    const [imgIndex, setImgIndex] = useState(0)

    const { isMobile } = useSugarcubeContext()

    useEffect(() => {
        const updateImgIndex = () => {
            if (imgIndex === imagesWithSubtitles.length - 1) {
                setImgIndex(0)
            } else {
                setImgIndex(imgIndex + 1)
            }
        }
        const timerId = setInterval(updateImgIndex, CHANGE_IMAGE_INTERVAL)
        return () => clearInterval(timerId)
    }, [imgIndex])

    const { image: currentImage, subTitle: currentSubTitle, posterImg } = imagesWithSubtitles[imgIndex]
    const videoSrc = `${process.env.GATSBY_ASSET_BUCKET}/graphics/${currentImage}`
    const videoPoster = withPrefix(`/images/graphics/${posterImg}`)

    return (
        <div className="ImagesLoader">
            <div className={classNames('loaderImageContainer', { mobile: isMobile })}>
                {title && (
                    <div className="title">
                        {title}
                        <span className="dotsContainer">
                            <DotsLoader />
                        </span>
                    </div>
                )}
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="loaderImage"
                    width="208"
                    height="208"
                    key={videoSrc}
                    poster={videoPoster}
                >
                    <source src={videoSrc} type="video/mp4" />
                </video>

                {currentSubTitle && <div className="subTitle">{currentSubTitle}</div>}
            </div>
        </div>
    )
}

ImagesLoader.defaultProps = {
    title: '',
}

ImagesLoader.propTypes = {
    title: string,
    imagesWithSubtitles: imageLoaderListType.isRequired,
}
export default ImagesLoader
