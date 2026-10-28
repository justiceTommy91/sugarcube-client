import { NEW_COMPOSITION_ID } from 'models/compositions/constants'

export const FURNISHED = 'furnished'
export const EMPTY = 'empty'
export type RoomType = typeof FURNISHED | typeof EMPTY | null

export const LIVING_ROOM = 'LIVING_ROOM'
export const BEDROOM = 'BEDROOM'
export const OFFICE = 'OFFICE'

type CompositionOption = {
    compositionId: string | number
    sceneId: string | number
    imageUrl: string
    roomType: string
    compositionTitle: string
}

export const furnishedRoomsDev: Array<CompositionOption> = [
    {
        compositionId: 11340,
        sceneId: 44679,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/25816_44679/img0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Working in the living room',
    },
    {
        compositionId: 11149,
        sceneId: 44681,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/25818_44681/img0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Zen & peace for life',
    },
    {
        compositionId: 11768,
        sceneId: 44677,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/25814_44677/img0.jpg',
        roomType: BEDROOM,
        compositionTitle: 'Working in the living room',
    },
    {
        compositionId: 12200,
        sceneId: 44674,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/25812_44674/img0.jpg',
        roomType: BEDROOM,
        compositionTitle: 'Working in the living room',
    },
    {
        compositionId: 11340,
        sceneId: 44679,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/25816_44679/img0.jpg',
        roomType: OFFICE,
        compositionTitle: 'Working in the living room',
    },
    {
        compositionId: 11149,
        sceneId: 44681,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/25818_44681/img0.jpg',
        roomType: OFFICE,
        compositionTitle: 'Working in the living room',
    },
    {
        compositionId: 11768,
        sceneId: 44677,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/25814_44677/img0.jpg',
        roomType: OFFICE,
        compositionTitle: 'Working in the living room',
    },
    {
        compositionId: 12200,
        sceneId: 44674,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/25812_44674/img0.jpg',
        roomType: OFFICE,
        compositionTitle: 'Working in the living room',
    },
]

export const emptyRoomsDev: Array<CompositionOption> = [
    {
        compositionId: 11340,
        sceneId: 44679,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/25816_44679/img0.jpg',
        roomType: BEDROOM,
        compositionTitle: 'Working in the living room',
    },
    {
        compositionId: 10699,
        sceneId: 43416,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/25810_43416/img0.jpg',
        roomType: BEDROOM,
        compositionTitle: 'Zen & peace for life',
    },
    {
        compositionId: 11149,
        sceneId: 44681,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/25818_44681/img0.jpg',
        roomType: OFFICE,
        compositionTitle: 'Working in the living room',
    },
    {
        compositionId: 11768,
        sceneId: 44677,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/25814_44677/img0.jpg',
        roomType: OFFICE,
        compositionTitle: 'Working in the living room',
    },
    {
        compositionId: 12200,
        sceneId: 44674,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/25812_44674/img0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Working in the living room',
    },
]

export const furnishedRoomsProd: Array<CompositionOption> = [
    {
        compositionId: 16099,
        sceneId: 31310,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/16099/img0.png',
        roomType: LIVING_ROOM,
        compositionTitle: 'Figurative',
    },
    {
        compositionId: 27064,
        sceneId: 44875,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/27064/img0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Iced matcha',
    },
    {
        compositionId: 27035,
        sceneId: 44873,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/27035/img0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'In tune',
    },
    {
        compositionId: 16113,
        sceneId: 31312,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/16113/img0.png',
        roomType: LIVING_ROOM,
        compositionTitle: 'Play smart',
    },
    {
        compositionId: 16100,
        sceneId: 31311,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/16100/img0.png',
        roomType: LIVING_ROOM,
        compositionTitle: 'Peppermint',
    },
    {
        compositionId: 27091,
        sceneId: 44877,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/27091/img0.png',
        roomType: BEDROOM,
        compositionTitle: 'Foggy morning',
    },
    {
        compositionId: 27193,
        sceneId: 44879,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/27193/img0.png',
        roomType: BEDROOM,
        compositionTitle: 'Into the woods',
    },
    {
        compositionId: 27212,
        sceneId: 45110,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/27212/img0.png',
        roomType: BEDROOM,
        compositionTitle: 'Sleeping beauty',
    },
    // {
    //     compositionId: ,
    //     sceneId: ,
    //     imageUrl: '',
    //     roomType: BEDROOM,
    //     compositionTitle: '',
    // },
    {
        compositionId: 15321,
        sceneId: 31079,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/15321/img0.jpg',
        roomType: OFFICE,
        compositionTitle: 'Heath',
    },
    {
        compositionId: 15320,
        sceneId: 31077,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/15320/img0.jpg',
        roomType: OFFICE,
        compositionTitle: 'Peaches and cream',
    },
    {
        compositionId: 15305,
        sceneId: 31076,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/15305/img0.jpg',
        roomType: OFFICE,
        compositionTitle: 'Cordial cherry',
    },
    {
        compositionId: 15286,
        sceneId: 31078,
        imageUrl: 'https://storage.googleapis.com/wallspice-assets/magic_window/main_entry/15286/img0.jpg',
        roomType: OFFICE,
        compositionTitle: 'Cinnamon latte',
    },
]

export const emptyRoomsProd: Array<CompositionOption> = [
    {
        compositionId: NEW_COMPOSITION_ID,
        sceneId: 45184,
        imageUrl:
            'https://storage.googleapis.com/processed-prod/scenes/45184/a1e6acef-df9f-4bf3-a10d-fc356561ebf8/pano_0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Himalayan salt',
    },
    {
        compositionId: NEW_COMPOSITION_ID,
        sceneId: 45200,
        imageUrl:
            'https://storage.googleapis.com/processed-prod/scenes/45200/135b16df-e380-4f19-a2d5-efeec3231715/pano_0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Dark chocolate',
    },
    {
        compositionId: NEW_COMPOSITION_ID,
        sceneId: 45182,
        imageUrl:
            'https://storage.googleapis.com/processed-prod/scenes/45182/7bc98914-4aef-4bd4-a3c7-5164928a8906/pano_0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Tiramisu',
    },
    {
        compositionId: NEW_COMPOSITION_ID,
        sceneId: 45109,
        imageUrl:
            'https://storage.googleapis.com/processed-prod/scenes/45109/af300dff-f876-424f-ad28-88bccaab2fb3/pano_0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Wisteria',
    },
    {
        compositionId: NEW_COMPOSITION_ID,
        sceneId: 44876,
        imageUrl:
            'https://storage.googleapis.com/processed-prod/scenes/44876/852c69d6-80a1-4baa-8a49-455b39ec31c8/pano_0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Sea foam',
    },
    {
        compositionId: NEW_COMPOSITION_ID,
        sceneId: 44872,
        imageUrl:
            'https://storage.googleapis.com/processed-prod/scenes/44872/5438cac5-303b-482d-8d5a-6b4d9ee232a1/pano_0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Cozy grey',
    },
    {
        compositionId: NEW_COMPOSITION_ID,
        sceneId: 35366,
        imageUrl:
            'https://storage.googleapis.com/processed-prod/scenes/35266/1af68a3f-85ff-460a-a36e-a4d19d7e6ea7/pano_0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Enlightenment',
    },
    {
        compositionId: NEW_COMPOSITION_ID,
        sceneId: 35265,
        imageUrl:
            'https://storage.googleapis.com/processed-prod/scenes/35265/2f530ada-44d5-47c8-917b-291b32e620b4/pano_0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Simply natural',
    },
    {
        compositionId: NEW_COMPOSITION_ID,
        sceneId: 45223,
        imageUrl:
            'https://storage.googleapis.com/processed-prod/scenes/45223/77692866-9633-4f20-92de-b9066936c380/pano_0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Merry dreams!',
    },
    {
        compositionId: NEW_COMPOSITION_ID,
        sceneId: 45224,
        imageUrl:
            'https://storage.googleapis.com/processed-prod/scenes/45224/f45aec90-b58c-4d04-ba02NEW_COMPOSITION_ID134bdacef8c/pano_0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Before sunrise',
    },
    {
        compositionId: NEW_COMPOSITION_ID,
        sceneId: 45225,
        imageUrl:
            'https://storage.googleapis.com/processed-prod/scenes/45225/302f42b0-b7e8-4f37-ad50-8bcee6c63c2a/pano_0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Flamingo in a jungle',
    },
    {
        compositionId: NEW_COMPOSITION_ID,
        sceneId: 45226,
        imageUrl:
            'https://storage.googleapis.com/processed-prod/scenes/45226/b9554645-dd73-40a3-9c02-e8b5a78b9737/pano_0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Sunset sketch',
    },
    {
        compositionId: NEW_COMPOSITION_ID,
        sceneId: 45227,
        imageUrl:
            'https://storage.googleapis.com/processed-prod/scenes/45227/f7040ec8-8927-4c75-ad17-a143ad16f22b/pano_0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Smoked paprika',
    },
    {
        compositionId: NEW_COMPOSITION_ID,
        sceneId: 45228,
        imageUrl:
            'https://storage.googleapis.com/processed-prod/scenes/45228/b50016c8-044a-4bc0-9cc4-e263d02ed4cb/pano_0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Winner',
    },
    {
        compositionId: NEW_COMPOSITION_ID,
        sceneId: 45231,
        imageUrl:
            'https://storage.googleapis.com/processed-prod/scenes/45231/ac21a851-d014-4f43-aabc-7809785791d1/pano_0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Wrapped',
    },
    {
        compositionId: NEW_COMPOSITION_ID,
        sceneId: 45230,
        imageUrl:
            'https://storage.googleapis.com/processed-prod/scenes/45230/73649d1b-34b5-4668-913e-6f39a336c482/pano_0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Asylum',
    },
    {
        compositionId: NEW_COMPOSITION_ID,
        sceneId: 45229,
        imageUrl:
            'https://storage.googleapis.com/processed-prod/scenes/45229/048f3fef-a675-48b9-9518-83d64fc7f431/pano_0.jpg',
        roomType: LIVING_ROOM,
        compositionTitle: 'Pure flora',
    },
]
