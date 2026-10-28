/* eslint-disable no-fallthrough */
import type { AllowedUpptackaCompositionNames } from 'models/upptacka/types'
import designTipsJsonData from 'models/upptacka/designtips.json'

export const getUpptackaCompositionName = (compositionId: string): AllowedUpptackaCompositionNames => {
    switch (compositionId) {
        // US/EN PROD
        case 'eb8f9e76-6bf7-4d2b-8271-e2f42b63b007':
        // US/ES PROD
        case '11d3cf47-3871-4e7e-a940-0759ee2b340f':
        // US/EN DEV
        case 'e375e1f4-dac5-4b17-808d-6d9ad1aed851':
        // US/ES DEV
        case '9cefadb2-dd83-4462-8282-38e0ee5e7d4d':
            return `palo_alto_cozy_organized`
        // US/EN PROD
        case 'f2c291b3-6f78-4fbd-92a5-02b8ccb905f5':
        // US/ES PROD
        case '3ed98fa4-e874-441c-854a-8c36d23aff6c':
        // US/EN DEV
        case '65f75959-1ee2-4c0f-a67f-5944b6bfa8c3':
        // US/ES DEV
        case '4fd98db1-34ec-45e6-95f2-77dc416ff716':
            return `palo_alto_multipurpose`
        // US/EN PROD
        case '2c663783-8502-47a2-ba3f-404dd25b0020':
        // US/ES PROD
        case '95e728b3-c524-4547-ac02-333f8d944481':
        // US/EN DEV
        case '3faaf546-c073-451d-ba27-935d75fc0660':
        // US/ES DEV
        case 'd481e70c-dc7c-47d7-9ab7-14bb13e5ce42':
            return `palo_alto_starter_set`
        // US/EN PROD
        case 'eda4302c-cdef-4003-b36c-a13e9576170b':
        // US/ES PROD
        case '063123b2-7a6c-4a7d-b540-3e9c5aa9e66c':
        // US/EN DEV
        case '79761bb1-874a-48a3-89db-eec1d67127b9':
        // US/ES DEV
        case 'e5c6414c-4681-4578-bfe1-d57cce4cd51f':
            return `palo_alto_markethall`
        // SE/EN PROD
        case '3c800e47-2d6e-4b09-a0dc-4fcb39c60988':
        // SE/SV PROD
        case '135ebf84-bc51-410a-8ae1-c07e5be3afe1':
        // SE/EN DEV
        case '434c6806-6cf0-4034-8ccc-b7c16711e87e':
        // SE/SV DEV
        case '93c13c25-c594-49b6-a476-6aeeb5f68c43':
            return `helsingborg_multipurpose`
        // SE/EN PROD
        case '3cee4f05-2ed6-48b8-838e-09bac6539e60':
        // SE/SV PROD
        case '7362a7d7-c8b9-4ea5-b622-831c524ef0d5':
        // SE/EN DEV
        case '2b7c24e6-8109-48b8-9798-dc9dc0d169a4':
        // SE/SV DEV
        case 'ac958961-09e6-41cf-8865-79d32b0f347f':
            return `helsingborg_starter_set`
        // SE/EN PROD (Original composition with morpheus bed)
        case 'e85ffb21-efe9-40d9-81f6-1c6eb353ff1d':
        // SE/SV PROD (Original composition with morpheus bed)
        case '5e009e3b-5c89-4bc3-b89f-93294efaf63e':
        // SE/EN DEV (Original composition with morpheus bed)
        case '3399db1b-6b88-4e30-84db-1af698aa3010':
        // SE/SV DEV (Original composition with morpheus bed)
        case '064766b3-2fb2-4c0e-bccf-e66a0593f6a1':
        // SE/EN PROD
        case 'd333b9a6-9f26-4881-9f24-c49096b87413':
        // SE/SV PROD
        case '5554254d-73be-41b6-900a-af4d3dc1c0e5':
        // SE/EN DEV
        case 'c144b3d7-7d3c-495c-bed8-931d5096bf22':
        // SE/SV DEV
        case 'e58c3ead-5ca0-49f6-88a3-b6baece82de6':
        default:
            return `helsingborg_calm_japandi`
    }
}

export const getUpptackaDesignTipsData = (compositionId: string) => {
    const compositionName = getUpptackaCompositionName(compositionId)
    return designTipsJsonData[compositionName]
}
