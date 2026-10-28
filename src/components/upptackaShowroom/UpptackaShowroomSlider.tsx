import React from 'react'
import { withPrefix } from 'gatsby'
import SSRIcon from '@ingka/ssr-icon'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right'
import { useTracker } from 'apps/TrackingBoundary'
import { openComposition } from 'models/compositions/actions'
import { getLocale } from 'models/location/selectors'
import {
    GA_ACTION_UPPTACKA_OPEN_SHOWROOM_CLICK,
    GA_CATEGORY_DYH_SUGARCUBE,
    ACTION_UPPTACKA_OPEN_SHOWROOM_CLICK,
} from 'models/tracking/constants'
import { isProd } from 'utils/environment'
import { trackGoogleAnalytics } from 'utils/tracker'
import { useAppDispatch } from 'hooks'
import { getUpptackaShowroomData } from './utils'

require('./UpptackaShowroomSlider.scss')

export const UpptackaShowroomSlider = () => {
    const track = useTracker()
    const { rooms } = getUpptackaShowroomData(getLocale())
    const dispatch = useAppDispatch()

    return (
        <div className="UpptackaShowroomSlider">
            {rooms.map(({ badge, compositionId, description, devCompositionId, imageLocation, name }, index) => (
                <button
                    key={name}
                    onClick={() => {
                        trackGoogleAnalytics({
                            action: GA_ACTION_UPPTACKA_OPEN_SHOWROOM_CLICK,
                            category: GA_CATEGORY_DYH_SUGARCUBE,
                            label: `<${index}|bedroom|${name}|${compositionId}>`,
                        })
                        track.click({
                            target: 'upptacka.openShowroomButton',
                            intendedAction: ACTION_UPPTACKA_OPEN_SHOWROOM_CLICK,
                            attributes: {
                                index,
                                compositionId,
                            },
                        })
                        dispatch(openComposition(isProd ? compositionId : devCompositionId))
                    }}
                >
                    <div className="UpptackaShowroomSlider__room">
                        {badge && <span className="UpptackaShowroomSlider__badge">{badge}</span>}
                        <img src={withPrefix(imageLocation)} alt={name} />
                        <h3>{name}</h3>
                        <p>{description}</p>
                        {/* As the whole card is clickable and is already a button, we can't nest a button inside a button
                        so we style the div to look like a button */}
                        <div className="UpptackaShowroomSlider__button">
                            <SSRIcon paths={arrowRight} />
                        </div>
                    </div>
                </button>
            ))}
        </div>
    )
}
