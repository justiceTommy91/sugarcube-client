export const ROOM_TYPES_ACTION_TYPES = {
    REQUEST_ROOM_TYPES_SAGA: 'REQUEST_ROOM_TYPES_SAGA',
    RECEIVE_ROOM_TYPES: 'RECEIVE_ROOM_TYPES',
    FAILED_RECEIVE_ROOM_TYPES: 'FAILED_RECEIVE_ROOM_TYPES',
} as const

// Special pseudo-room-type ID for the "Complete my room" option in the room type dropdown.
// Used as both humanId and uuid on the synthetic RoomType inserted by getAllRoomTypeOptions.
export const COMPLETE_MY_ROOM_ID = 'complete-my-room'

// Map scene roomType (enum values) to API humanId format
export const ROOM_TYPE_TO_HUMAN_ID_MAP = {
    LIVING_ROOM: 'rooms--living-room',
    BEDROOM: 'rooms--bedroom',
    OFFICE: 'rooms--home-office',
    KITCHEN: 'rooms--kitchen',
    DINING_ROOM: 'rooms--dining-room',
    HALLWAY: 'rooms--hallway',
    CHILDREN: 'rooms--childrens-room',
    DORM_ROOM: 'rooms--bedroom',
} as const
