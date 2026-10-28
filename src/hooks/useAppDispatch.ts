import { useDispatch } from 'react-redux'
import type { AppDispatch } from 'store'

// Use throughout the app instead of `useDispatch`
export const useAppDispatch: () => AppDispatch = useDispatch
