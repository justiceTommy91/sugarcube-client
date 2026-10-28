import type { AxiosError } from "axios"

export const isAxiosError = (value: unknown): value is AxiosError => {
    if (value === null || typeof value !== 'object') {
        return false
    }
    return 'isAxiosError' in value && value.isAxiosError === true
}