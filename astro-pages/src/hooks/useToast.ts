import { useToastsMutations } from '@providers/ToastsProvider'

export function useToast() {
    return useToastsMutations()
}
