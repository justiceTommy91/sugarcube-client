import { useSelector, type TypedUseSelectorHook } from 'react-redux'
import type { RootState } from 'store'

// Use throughout the app instead of `useSelector`
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
