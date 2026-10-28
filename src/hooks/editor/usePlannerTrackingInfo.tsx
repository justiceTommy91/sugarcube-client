import { useAppSelector } from 'hooks'

import { getIsRoomBuilderEditor } from 'models/planner/selectors'
import { ROOM_BUILDER_MODE_CREATE, ROOM_BUILDER_MODE_EDIT } from 'models/tracking/constants'

export const usePlannerTrackingInfo = () => {
    const isEditor = useAppSelector(getIsRoomBuilderEditor)

    return {
      RoomBuilderSession: window.globalPlannerSessionId,
      RoomBuilderMode: isEditor ? ROOM_BUILDER_MODE_EDIT : ROOM_BUILDER_MODE_CREATE,
    }
}